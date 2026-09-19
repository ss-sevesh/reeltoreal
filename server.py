"""
ReelToReal: FastAPI Backend Server for Native HTML/CSS/JS Frontend.
Connects the local AI engine (Whisper, Moondream, Qwen 2.5, Qdrant, SQLite) to the modern web interface.
"""
import os
import time
from pathlib import Path
from typing import Any, Optional

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src import config
from src.answer import answer_question
from src.index import DB_PATH, get_all_notes, parse_note, build_index
from src.search import hybrid_search
from src.vector_db import build_vector_index, get_qdrant_client

app = FastAPI(title="ReelToReal Local Knowledge Vault API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = config.ROOT_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Mount raw video data for browser playback
if config.DATA_DIR.exists():
    app.mount("/videos", StaticFiles(directory=str(config.DATA_DIR)), name="videos")

# Serve static assets (CSS, JS, icons)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class SearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 6


class ChatRequest(BaseModel):
    question: str


class ProcessRequest(BaseModel):
    url: str
    category: Optional[str] = None


class InspectRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------
@app.get("/")
def get_index():
    """Serve the primary HTML application."""
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return FileResponse(str(index_path))


@app.post("/api/inspect")
def api_inspect(req: InspectRequest):
    """Inspect video URL and auto-detect category, title, and duration."""
    from src.classify import inspect_and_classify_video
    return inspect_and_classify_video(req.url)


@app.get("/api/stats")
def get_stats() -> dict[str, Any]:
    """Retrieve system health and vault statistics."""
    notes = [p for p in config.NOTES_DIR.glob("*.md") if p.name != ".gitkeep"]
    
    ollama_ok = False
    ollama_models = []
    try:
        r = requests.get(f"{config.OLLAMA_HOST}/api/tags", timeout=2)
        if r.status_code == 200:
            ollama_ok = True
            ollama_models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass

    return {
        "notes_count": len(notes),
        "sqlite_active": DB_PATH.exists(),
        "qdrant_active": config.QDRANT_DIR.exists(),
        "ollama_online": ollama_ok,
        "ollama_models": ollama_models,
    }


@app.post("/api/search")
def api_search(req: SearchRequest):
    """Execute hybrid search combining Qdrant dense vectors and SQLite FTS5 lexical ranking."""
    t0 = time.time()
    cat = None if not req.category or req.category.lower() == "all" else req.category
    results = hybrid_search(req.query, category=cat, limit=req.limit)
    elapsed_ms = (time.time() - t0) * 1000

    enriched = []
    for r in results:
        vid_id = r["video_id"]
        # Check if local video clip is available for playback
        video_candidates = list((config.DATA_DIR / vid_id / "raw").glob(f"{vid_id}.*"))
        has_video = len(video_candidates) > 0 and video_candidates[0].exists()
        video_url = f"/videos/{vid_id}/raw/{video_candidates[0].name}" if has_video else None

        note_path = Path(r["note_path"])
        note_content = note_path.read_text(encoding="utf-8") if note_path.exists() else ""

        enriched.append({
            **r,
            "has_video": has_video,
            "video_url": video_url,
            "note_content": note_content,
        })

    return {
        "query": req.query,
        "count": len(results),
        "elapsed_ms": round(elapsed_ms, 1),
        "results": enriched,
    }


@app.post("/api/chat")
def api_chat(req: ChatRequest):
    """Synthesize grounded answer using retrieved vault moments and local Qwen 2.5."""
    t0 = time.time()
    res = answer_question(req.question)
    elapsed_s = time.time() - t0
    return {
        "answer": res["answer"],
        "sources": res.get("sources", []),
        "elapsed_seconds": round(elapsed_s, 2),
    }


@app.post("/api/process")
def api_process(req: ProcessRequest):
    """Execute 5-stage multimodal ingestion pipeline covering the entire video length."""
    from src.audio import extract_audio
    from src.caption import caption_frames
    from src.frames import sample_frames
    from src.ingest import download_video
    from src.notegen import generate_note
    from src.transcribe import transcribe_audio

    try:
        t0 = time.time()
        # Stage 1: Download
        info = download_video(req.url)
        vid = info["id"]
        v_path = info["video_path"]
        v_dir = info["video_dir"]

        # Stage 2: Audio & Frames
        audio_path = v_dir / "audio.wav"
        extract_audio(v_path, audio_path)
        frames_dir = v_dir / "frames"
        sample_frames(v_path, frames_dir, config.FRAME_INTERVAL_SECONDS)

        # Stage 3: Transcribe full audio (no 28s cutoff) and caption all frames across video
        transcribe_audio(audio_path, v_dir)
        caption_frames(frames_dir, v_dir, max_frames=None)

        # Stage 4: Synthesize Obsidian note
        note_path = generate_note(vid, req.url)

        # Stage 5
        c_notes = build_index()
        c_chunks = build_vector_index()

        total_time = round(time.time() - t0, 2)
        note_text = note_path.read_text(encoding="utf-8") if note_path.exists() else ""

        return {
            "status": "success",
            "video_id": vid,
            "title": info.get("title", vid),
            "total_seconds": total_time,
            "note_content": note_text,
            "indexed_notes": c_notes,
            "indexed_chunks": c_chunks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notes")
def api_notes():
    """Retrieve all markdown notes stored in the vault."""
    notes = [p for p in config.NOTES_DIR.glob("*.md") if p.name != ".gitkeep"]
    results = []
    for p in notes:
        parsed = parse_note(p)
        content = p.read_text(encoding="utf-8")
        results.append({
            "filename": p.name,
            "title": parsed["title"],
            "category": parsed["category"],
            "video_id": parsed["video_id"],
            "duration": parsed["duration"],
            "source_url": parsed["source_url"],
            "tags": parsed["tags"],
            "content": content,
        })
    return {"count": len(results), "notes": results}


@app.get("/api/diagnostics")
def api_diagnostics():
    """Run full system health and latency diagnostics."""
    results = {}

    # 1. Ollama
    t0 = time.time()
    try:
        r = requests.get(f"{config.OLLAMA_HOST}/api/tags", timeout=3)
        dt = (time.time() - t0) * 1000
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            results["ollama"] = {
                "status": "online",
                "latency_ms": round(dt, 1),
                "models": models,
                "has_vlm": any("moondream" in m for m in models),
                "has_llm": any("qwen" in m for m in models),
            }
        else:
            results["ollama"] = {"status": "error", "message": f"HTTP {r.status_code}"}
    except Exception as e:
        results["ollama"] = {"status": "offline", "message": str(e)}

    # 2. Qdrant Embedded
    t0 = time.time()
    try:
        client = get_qdrant_client()
        colls = client.get_collections().collections
        dt = (time.time() - t0) * 1000
        results["qdrant"] = {
            "status": "online",
            "latency_ms": round(dt, 1),
            "storage_path": str(config.QDRANT_DIR),
            "collections": [c.name for c in colls],
        }
    except Exception as e:
        results["qdrant"] = {"status": "error", "message": str(e)}

    # 3. SQLite FTS5
    t0 = time.time()
    try:
        db_notes = get_all_notes()
        dt = (time.time() - t0) * 1000
        results["sqlite"] = {
            "status": "online",
            "latency_ms": round(dt, 1),
            "record_count": len(db_notes),
            "db_path": str(DB_PATH),
        }
    except Exception as e:
        results["sqlite"] = {"status": "error", "message": str(e)}

    return results


# ---------------------------------------------------------------------------
# Server Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 65)
    print("[ReelToReal] Native Web Server Starting...")
    print("[ReelToReal] Design System: Cinematic Multimodal Knowledge Vault (Stitch)")
    print("[ReelToReal] Web Application URL: http://localhost:8000")
    print("=" * 65)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
