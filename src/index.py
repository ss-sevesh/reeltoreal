"""
Stage 6: SQLite FTS5 full-text search index over vault/Notes/*.md files.

Schema:
  - notes (FTS5) : full-text searchable — title, summary, transcript, captions, tags
  - notes_meta   : structured metadata for filters — category, date, language, tags, entities

Usage:
  python -m src.cli index              # (re)build the index from vault/Notes/
  python -m src.cli search "elephants" # keyword search
"""
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from src import config

DB_PATH = config.VAULT_DIR / "index.db"


# ---------------------------------------------------------------------------
# YAML frontmatter parser (stdlib only — no PyYAML needed for our simple schema)
# ---------------------------------------------------------------------------

def _parse_frontmatter(md_text: str) -> tuple[dict, str]:
    """
    Split Markdown text into (frontmatter_dict, body_text).
    Supports the simple YAML subset our notegen writes.
    """
    if not md_text.startswith("---"):
        return {}, md_text

    end = md_text.find("\n---", 3)
    if end == -1:
        return {}, md_text

    yaml_block = md_text[4:end].strip()
    body = md_text[end + 4:].strip()

    meta: dict[str, Any] = {}
    current_key: str | None = None
    current_list: list | None = None
    sub_key: str | None = None
    sub_list: list | None = None
    in_entities = False

    for line in yaml_block.splitlines():
        # Top-level key: value
        top_kv = re.match(r'^(\w[\w_]*):\s*"?([^"]*)"?\s*$', line)
        top_list_start = re.match(r'^(\w[\w_]*):\s*$', line)
        list_item = re.match(r'^  - "?([^"]*)"?', line)
        sub_list_start = re.match(r'^  (\w[\w_]*):\s*$', line)
        sub_list_item = re.match(r'^    - "?([^"]*)"?', line)
        inline_empty = re.match(r'^  (\w[\w_]*):\s*\[\]', line)

        if top_kv and not line.startswith(" "):
            key, val = top_kv.group(1), top_kv.group(2).strip()
            meta[key] = val
            current_key = key
            current_list = None
            in_entities = False
        elif top_list_start and not line.startswith(" "):
            key = top_list_start.group(1)
            current_key = key
            in_entities = (key == "entities")
            if not in_entities:
                meta[key] = []
                current_list = meta[key]
        elif in_entities and sub_list_start:
            sub_key = sub_list_start.group(1)
            if "entities" not in meta:
                meta["entities"] = {}
            meta["entities"][sub_key] = []
            sub_list = meta["entities"][sub_key]
            current_list = None
        elif in_entities and inline_empty:
            sub_key = inline_empty.group(1)
            if "entities" not in meta:
                meta["entities"] = {}
            meta["entities"][sub_key] = []
            sub_list = None
        elif in_entities and sub_list_item and sub_list is not None:
            sub_list.append(sub_list_item.group(1).strip())
        elif list_item and current_list is not None:
            current_list.append(list_item.group(1).strip())

    return meta, body


def _strip_markdown(text: str) -> str:
    """Remove Markdown syntax to get clean indexable text."""
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)  # headings
    text = re.sub(r"`[^`]+`", "", text)                          # inline code
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)               # bold
    text = re.sub(r"\*([^*]+)\*", r"\1", text)                   # italic
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)         # links
    text = re.sub(r"^[-*>]\s+", "", text, flags=re.MULTILINE)    # list/quote markers
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create FTS5 and metadata tables if they do not exist."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS notes_meta (
            video_id    TEXT PRIMARY KEY,
            title       TEXT,
            category    TEXT,
            date        TEXT,
            language    TEXT,
            duration    REAL,
            source_url  TEXT,
            tags        TEXT,   -- JSON array
            places      TEXT,   -- JSON array
            objects     TEXT,   -- JSON array
            actions     TEXT,   -- JSON array
            note_path   TEXT
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            video_id UNINDEXED,
            title,
            category,
            summary,
            transcript,
            captions,
            tags,
            tokenize = 'porter ascii'
        );
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------

def _extract_section(body: str, heading: str) -> str:
    """Extract content from a Markdown ## Section heading."""
    pattern = rf"##\s+{re.escape(heading)}\s*\n(.*?)(?=\n##|\Z)"
    match = re.search(pattern, body, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else ""


def index_note(conn: sqlite3.Connection, note_path: Path) -> str:
    """Parse and index a single .md note. Returns video_id."""
    text = note_path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(text)

    video_id = meta.get("video_id", note_path.stem)
    title = meta.get("title", note_path.stem)
    category = meta.get("category", "other")
    date = meta.get("date", "")
    language = meta.get("language", "")
    source_url = meta.get("source_url", "")
    duration = float(meta.get("duration_seconds", 0) or 0)
    tags = meta.get("tags", [])
    entities = meta.get("entities", {})
    if not isinstance(entities, dict):
        entities = {}
    places = entities.get("places", [])
    objects = entities.get("objects", [])
    actions = entities.get("actions", [])

    summary_raw = _extract_section(body, "Summary")
    transcript_raw = _extract_section(body, "Transcript")
    captions_raw = _extract_section(body, "Visual Scene Descriptions")

    summary = _strip_markdown(summary_raw)
    transcript = _strip_markdown(transcript_raw)
    captions = _strip_markdown(captions_raw)
    tags_str = " ".join(tags)

    # Upsert metadata
    conn.execute("""
        INSERT INTO notes_meta
            (video_id, title, category, date, language, duration, source_url,
             tags, places, objects, actions, note_path)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(video_id) DO UPDATE SET
            title=excluded.title, category=excluded.category, date=excluded.date,
            language=excluded.language, duration=excluded.duration,
            source_url=excluded.source_url, tags=excluded.tags,
            places=excluded.places, objects=excluded.objects,
            actions=excluded.actions, note_path=excluded.note_path
    """, (
        video_id, title, category, date, language, duration, source_url,
        json.dumps(tags), json.dumps(places), json.dumps(objects), json.dumps(actions),
        str(note_path),
    ))

    # Delete stale FTS row then re-insert (FTS5 doesn't support ON CONFLICT)
    conn.execute("DELETE FROM notes_fts WHERE video_id = ?", (video_id,))
    conn.execute("""
        INSERT INTO notes_fts (video_id, title, category, summary, transcript, captions, tags)
        VALUES (?,?,?,?,?,?,?)
    """, (video_id, title, category, summary, transcript, captions, tags_str))

    return video_id


def build_index(notes_dir: Path | None = None) -> int:
    """
    (Re)build the SQLite index from all .md notes in notes_dir.
    Returns number of notes indexed.
    """
    notes_dir = notes_dir or config.NOTES_DIR
    conn = _connect()
    init_db(conn)

    note_files = [f for f in notes_dir.glob("*.md") if f.name != ".gitkeep"]
    for note_path in note_files:
        index_note(conn, note_path)

    conn.commit()
    conn.close()
    return len(note_files)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search(
    query: str,
    category: str | None = None,
    limit: int = 10,
    db_path: Path | None = None,
) -> list[dict]:
    """
    Full-text search over indexed notes.

    Args:
        query:    Search query string (supports FTS5 boolean: AND, OR, NOT, "phrase").
        category: Optional category filter (food, travel, animal, etc.).
        limit:    Max number of results.
        db_path:  Override database path.

    Returns:
        List of result dicts with keys: video_id, title, category, snippet,
        source_url, date, tags, note_path, rank.
    """
    path = db_path or DB_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Search index not found at {path}. "
            "Run `python -m src.cli index` first to build the index."
        )

    conn = _connect() if db_path is None else sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row

    params: list = [query]
    category_clause = ""
    if category:
        category_clause = "AND m.category = ?"
        params.append(category)

    params.append(limit)

    rows = conn.execute(f"""
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
    """, params).fetchall()

    conn.close()
    return [dict(r) for r in rows]


def get_all_notes(db_path: Path | None = None) -> list[dict]:
    """Return all indexed notes as dicts (for browsing)."""
    path = db_path or DB_PATH
    if not path.exists():
        return []
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM notes_meta ORDER BY date DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
