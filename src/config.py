"""
Centralized config. Every other module imports paths/settings from here —
never hardcode a path or a model name elsewhere in the codebase.
"""
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env", override=True)


DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
VAULT_DIR = Path(os.getenv("VAULT_DIR", "./vault")).resolve()
NOTES_DIR = VAULT_DIR / "Notes"
VIDEOS_DIR = VAULT_DIR / "Videos"
QDRANT_DIR = VAULT_DIR / "qdrant_storage"

FRAME_INTERVAL_SECONDS = int(os.getenv("FRAME_INTERVAL_SECONDS", "7"))

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "distil-large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cuda")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_VLM_MODEL = os.getenv("OLLAMA_VLM_MODEL", "moondream")
OLLAMA_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:1.5b")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def ensure_dirs() -> None:
    """Create every working/output directory the pipeline needs. Safe to call anytime."""
    for d in (DATA_DIR, VAULT_DIR, NOTES_DIR, VIDEOS_DIR, QDRANT_DIR):
        d.mkdir(parents=True, exist_ok=True)
