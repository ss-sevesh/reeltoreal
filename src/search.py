"""
Stage 6A: Hybrid search and retrieval layer for ReelToReal.

Combines:
  1. Dense Semantic Vector Search (Qdrant + FastEmbed) — concept/meaning matching
  2. Sparse Lexical Search (SQLite FTS5) — exact keywords & phrase matching
  3. Reciprocal Rank Fusion (RRF) — merges scores for optimal retrieval

Provides instant relevance scores, timestamp pinpointing, and grounded context
extraction without needing an LLM generation call on every search.
"""
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from src import config
from src.index import DB_PATH, parse_note
from src.vector_db import vector_search

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
    """Sanitize raw query string for SQLite FTS5 parser."""
    cleaned = re.sub(r'[*?:^~\[\]{}]', ' ', query)
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
    Keyword search in SQLite FTS5 with fallback to OR terms.
    """
    path = db_path or DB_PATH
    if not path.exists():
        return []

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

    if not results:
        terms = extract_search_terms(query)
        if terms:
            fallback_query = " OR ".join(f'"{t}"*' for t in terms)
            results = _execute(fallback_query)

    return results


def hybrid_search(
    query: str,
    category: str | None = None,
    limit: int = 5,
    rrf_k: int = 60,
) -> list[dict[str, Any]]:
    """
    Execute Hybrid Search (Dense Vectors from Qdrant + Sparse BM25 from FTS5).
    Fuses results using Reciprocal Rank Fusion (RRF).

    Returns ranked list of video results with:
      - video_id, title, category, source_url, note_path
      - top_moment: {timestamp, chunk_type, text}
      - rrf_score & semantic similarity score
    """
    # 1. Dense Semantic Vector Search (Qdrant)
    dense_results: list[dict[str, Any]] = []
    try:
        dense_results = vector_search(query, limit=limit * 3, category=category)
    except Exception:
        dense_results = []

    # 2. Sparse Lexical Search (SQLite FTS5)
    sparse_results: list[dict[str, Any]] = []
    try:
        sparse_results = search_notes(query, category=category, limit=limit * 3)
    except Exception:
        sparse_results = []

    # 3. Reciprocal Rank Fusion (RRF)
    video_scores: dict[str, float] = {}
    video_data: dict[str, dict[str, Any]] = {}
    video_top_chunk: dict[str, dict[str, Any]] = {}

    # Score dense vector hits
    for rank, hit in enumerate(dense_results, 1):
        vid = hit["video_id"]
        rrf_score = 1.0 / (rrf_k + rank)
        video_scores[vid] = video_scores.get(vid, 0.0) + rrf_score

        if vid not in video_data:
            video_data[vid] = {
                "video_id": vid,
                "title": hit["title"],
                "category": hit["category"],
                "source_url": hit["source_url"],
                "note_path": hit["note_path"],
                "best_score": hit.get("score", 0.0),
            }

        # Keep highest-scoring chunk as the pinpointed top moment
        if vid not in video_top_chunk or hit.get("score", 0.0) > video_top_chunk[vid].get("score", 0.0):
            video_top_chunk[vid] = {
                "chunk_type": hit.get("chunk_type"),
                "timestamp": hit.get("timestamp"),
                "text": hit.get("text"),
                "score": hit.get("score", 0.0),
            }

    # Score sparse lexical hits
    for rank, hit in enumerate(sparse_results, 1):
        vid = hit["video_id"]
        rrf_score = 1.0 / (rrf_k + rank)
        video_scores[vid] = video_scores.get(vid, 0.0) + rrf_score

        if vid not in video_data:
            video_data[vid] = {
                "video_id": vid,
                "title": hit["title"],
                "category": hit["category"],
                "source_url": hit["source_url"],
                "note_path": hit["note_path"],
                "best_score": 0.5,
            }

        if vid not in video_top_chunk:
            video_top_chunk[vid] = {
                "chunk_type": "keyword",
                "timestamp": None,
                "text": hit.get("snippet", ""),
                "score": 0.5,
            }

    # Sort combined results by RRF score
    sorted_vids = sorted(video_scores.keys(), key=lambda v: video_scores[v], reverse=True)[:limit]

    final_results = []
    for vid in sorted_vids:
        item = video_data[vid]
        top_chunk = video_top_chunk.get(vid, {})
        final_results.append({
            "video_id": item["video_id"],
            "title": item["title"],
            "category": item["category"],
            "source_url": item["source_url"],
            "note_path": item["note_path"],
            "rrf_score": round(video_scores[vid], 5),
            "similarity_score": top_chunk.get("score", 0.0),
            "top_chunk_type": top_chunk.get("chunk_type"),
            "timestamp": top_chunk.get("timestamp"),
            "highlight_text": top_chunk.get("text"),
        })

    return final_results


def retrieve_context(
    query: str,
    top_k: int = 3,
    category: str | None = None,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """
    Retrieve top matching notes with full context (frontmatter, summary,
    transcripts, and visual descriptions) for LLM question answering (RAG).
    Uses hybrid search to select the most relevant notes.
    """
    results = hybrid_search(query, category=category, limit=top_k)
    contexts = []

    for r in results:
        note_path = Path(r["note_path"])
        if not note_path.exists():
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
                "timestamp": r.get("timestamp"),
                "highlight_text": r.get("highlight_text"),
                "similarity_score": r.get("similarity_score", 0.0),
            })
        else:
            contexts.append({
                "video_id": r["video_id"],
                "title": r["title"],
                "category": r["category"],
                "source_url": r["source_url"],
                "tags": [],
                "summary": r.get("highlight_text", ""),
                "transcript": "",
                "captions": "",
                "note_path": r["note_path"],
                "timestamp": r.get("timestamp"),
                "highlight_text": r.get("highlight_text"),
                "similarity_score": r.get("similarity_score", 0.0),
            })

    return contexts
