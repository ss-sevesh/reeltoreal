"""
Stage 6A: Search and retrieval layer for ReelToReal.

Provides resilient keyword & natural language search over vault notes,
handling FTS5 query formatting, token fallback, and RAG context extraction.
"""
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from src import config
from src.index import DB_PATH, parse_note

# Common English stopwords to ignore when converting a natural language question into FTS search terms
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
    "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    "tell", "show", "find", "give"
}


def sanitize_fts_query(query: str) -> str:
    """
    Sanitize raw query string for SQLite FTS5.
    If the query already has explicit FTS operators (AND, OR, NOT, quotes),
    keep it safe from mismatched quotes/parentheses.
    """
    # Remove characters that can break FTS5 parser
    cleaned = re.sub(r'[*?:^~\[\]{}]', ' ', query)
    # Balance quotes if any
    if cleaned.count('"') % 2 != 0:
        cleaned = cleaned.replace('"', ' ')
    return cleaned.strip()


def extract_search_terms(query: str) -> list[str]:
    """Extract informative terms from a natural language question."""
    words = re.findall(r'\b[a-zA-Z0-9_-]+\b', query.lower())
    terms = [w for w in words if w not in STOPWORDS and len(w) > 2]
    return terms if terms else words


def search_notes(
    query: str,
    category: str | None = None,
    limit: int = 5,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """
    Execute search with intelligent fallback:
    1. Try verbatim sanitized query (supports exact quotes and AND/OR).
    2. If 0 results and query has multiple words, try matching extracted keywords with OR.
    """
    path = db_path or DB_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Search index not found at {path}. Run `python -m src.cli index` first."
        )

    def _execute(match_query: str) -> list[dict[str, Any]]:
        conn = sqlite3.connect(str(path))
        conn.row_factory = sqlite3.Row
        category_clause = ""
        params: list[Any] = [match_query]
        if category:
            category_clause = "AND m.category = ?"
            params.append(category)
        params.append(limit)

        sql = f"""
            SELECT
                f.video_id,
                m.title,
                m.category,
                m.source_url,
                m.date,
                m.tags,
                m.note_path,
                snippet(notes_fts, 3, '[', ']', '...', 20) AS snippet,
                rank
            FROM notes_fts f
            JOIN notes_meta m ON f.video_id = m.video_id
            WHERE notes_fts MATCH ?
            {category_clause}
            ORDER BY rank
            LIMIT ?
        """
        try:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()

    sanitized = sanitize_fts_query(query)
    results = _execute(sanitized) if sanitized else []

    # If no results found, fallback to keyword-based OR search
    if not results:
        terms = extract_search_terms(query)
        if terms:
            fallback_query = " OR ".join(f'"{t}"*' for t in terms)
            results = _execute(fallback_query)

    return results


def retrieve_context(
    query: str,
    top_k: int = 3,
    category: str | None = None,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """
    Retrieve top matching notes with full context (frontmatter, summary,
    transcripts, and visual descriptions) for LLM question answering (RAG).
    """
    results = search_notes(query, category=category, limit=top_k, db_path=db_path)
    contexts = []

    for r in results:
        note_path = Path(r["note_path"])
        if not note_path.exists():
            # If path moved, try checking config.NOTES_DIR directly
            note_path = config.NOTES_DIR / note_path.name

        if note_path.exists():
            parsed = parse_note(note_path)
            contexts.append({
                "video_id": r["video_id"],
                "title": parsed["title"] or r["title"],
                "category": parsed["category"] or r["category"],
                "source_url": parsed["source_url"] or r["source_url"],
                "tags": parsed["tags"],
                "summary": parsed["summary"],
                "transcript": parsed["transcript"],
                "captions": parsed["captions"],
                "note_path": str(note_path),
                "rank": r.get("rank", 0.0),
            })
        else:
            # Fallback to metadata in SQLite
            contexts.append({
                "video_id": r["video_id"],
                "title": r["title"],
                "category": r["category"],
                "source_url": r["source_url"],
                "tags": json.loads(r["tags"]) if r.get("tags") else [],
                "summary": r.get("snippet", ""),
                "transcript": "",
                "captions": "",
                "note_path": r["note_path"],
                "rank": r.get("rank", 0.0),
            })

    return contexts
