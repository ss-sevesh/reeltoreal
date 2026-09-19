"""
Vector search engine powered by Qdrant (embedded local storage) and FastEmbed.

Enables instant semantic retrieval of exact moments (transcripts, visual captions,
summaries) with confidence scores — without needing an LLM generation call for every search.
"""
import re
import uuid
from pathlib import Path
from typing import Any

from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams

from src import config
from src.index import parse_note

COLLECTION_NAME = "reel_chunks"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
VECTOR_DIMENSION = 384

# Global cached embedding model instance (loads once, reused across calls)
_EMBED_MODEL: TextEmbedding | None = None


def get_embedding_model() -> TextEmbedding:
    """Get or initialize the FastEmbed model singleton."""
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        _EMBED_MODEL = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
    return _EMBED_MODEL


def get_qdrant_client(storage_path: Path | None = None) -> QdrantClient:
    """Initialize an embedded disk-backed Qdrant client."""
    path = storage_path or config.QDRANT_DIR
    path.mkdir(parents=True, exist_ok=True)
    return QdrantClient(path=str(path))


def init_collection(client: QdrantClient) -> None:
    """Create the reel_chunks collection if it doesn't already exist."""
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_DIMENSION,
                distance=Distance.COSINE,
            ),
        )


def extract_chunks(note_data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Split a parsed video note into granular, timestamped semantic chunks.
    Chunks include:
      - Overall summary
      - Individual spoken transcript lines with timestamp ranges
      - Individual visual scene captions with frame timestamps
      - Tags & entities
    """
    chunks: list[dict[str, Any]] = []
    video_id = note_data["video_id"]
    title = note_data["title"]
    category = note_data["category"]
    source_url = note_data["source_url"]
    note_path = note_data["note_path"]

    base_payload = {
        "video_id": video_id,
        "title": title,
        "category": category,
        "source_url": source_url,
        "note_path": note_path,
    }

    # 1. Summary Chunk
    summary = note_data.get("summary", "").strip()
    if summary:
        chunks.append({
            **base_payload,
            "chunk_type": "summary",
            "timestamp": None,
            "text": f"{title} summary: {summary}",
        })

    # 2. Transcript Chunks (line by line with timestamp ranges)
    transcript_raw = note_data.get("transcript_raw", "")
    for line in transcript_raw.splitlines():
        line = line.strip()
        m = re.search(r'`\[([0-9.]+s\s*(?:→|->)\s*[0-9.]+s)\]`\s*(.*)', line)
        if m:
            ts, text = m.group(1).replace("→", "->"), m.group(2).strip()
            if text:
                chunks.append({
                    **base_payload,
                    "chunk_type": "transcript",
                    "timestamp": ts,
                    "text": f"{title} spoken audio [{ts}]: {text}",
                })

    # 3. Visual Frame Captions (frame by frame with timestamps)
    captions_raw = note_data.get("captions_raw", "")
    for line in captions_raw.splitlines():
        line = line.strip()
        m = re.search(r'\*\*\[([0-9]+s)\]\*\*\s*(.*)', line)
        if m:
            ts, text = m.group(1), m.group(2).strip()
            if text and not text.lower().startswith("no frames"):
                chunks.append({
                    **base_payload,
                    "chunk_type": "caption",
                    "timestamp": ts,
                    "text": f"{title} visual scene at {ts}: {text}",
                })

    # 4. Tags & Entities Chunk
    tags = note_data.get("tags") or []
    places = note_data.get("places") or []
    objects = note_data.get("objects") or []
    actions = note_data.get("actions") or []
    entities_text = []
    if tags:
        entities_text.append("Tags: " + ", ".join(tags))
    if objects:
        entities_text.append("Objects: " + ", ".join(objects))
    if places:
        entities_text.append("Places: " + ", ".join(places))
    if actions:
        entities_text.append("Actions: " + ", ".join(actions))

    if entities_text:
        chunks.append({
            **base_payload,
            "chunk_type": "entities",
            "timestamp": None,
            "text": f"{title} tags & entities: " + " | ".join(entities_text),
        })

    return chunks


def index_note_vectors(
    client: QdrantClient,
    note_path: Path,
    model: TextEmbedding | None = None,
) -> int:
    """Index all semantic chunks of a single note into Qdrant. Returns chunk count."""
    model = model or get_embedding_model()
    init_collection(client)
    data = parse_note(note_path)
    chunks = extract_chunks(data)

    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    embeddings = list(model.embed(texts))

    points = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        # Deterministic UUID so re-indexing overwrites cleanly
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{chunk['video_id']}_{chunk['chunk_type']}_{i}"))
        points.append(
            models.PointStruct(
                id=point_id,
                vector=emb.tolist(),
                payload=chunk,
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )
    return len(points)


def build_vector_index(notes_dir: Path | None = None) -> int:
    """Index all notes in vault/Notes/ into Qdrant vector database."""
    notes_dir = notes_dir or config.NOTES_DIR
    client = get_qdrant_client()
    model = get_embedding_model()
    init_collection(client)

    total_chunks = 0
    note_files = [f for f in notes_dir.glob("*.md") if f.name != ".gitkeep"]
    for note_file in note_files:
        count = index_note_vectors(client, note_file, model=model)
        total_chunks += count

    return total_chunks


def vector_search(
    query: str,
    limit: int = 5,
    category: str | None = None,
    client: QdrantClient | None = None,
    model: TextEmbedding | None = None,
) -> list[dict[str, Any]]:
    """
    Search Qdrant for semantically relevant chunks.
    Returns ranked chunks with similarity scores, timestamps, and video info.
    """
    client = client or get_qdrant_client()
    model = model or get_embedding_model()
    init_collection(client)

    # Generate query embedding
    query_vector = list(model.embed([query]))[0].tolist()

    query_filter = None
    if category:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="category",
                    match=models.MatchValue(value=category),
                )
            ]
        )

    hits = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    ).points

    results = []
    for h in hits:
        payload = dict(h.payload)
        payload["score"] = round(float(h.score), 4)
        results.append(payload)

    return results
