# ReelToReal

Turn saved Instagram Reels / YouTube Shorts into a searchable, local knowledge vault.

Pipeline: `URL -> download -> audio+frames -> STT+VLM captions -> Markdown note -> SQLite FTS5 index -> search / NL answer`

100% local. No cloud API calls, no paid services.

## Prerequisites (install these before anything else)

- **Python 3.11+**
- **[Ollama](https://ollama.com)** — running locally, with models pulled:
  ```
  ollama pull moondream
  ollama pull qwen2.5:1.5b
  ```
- **ffmpeg** on PATH — `choco install ffmpeg` (Windows) or your platform's package manager
- **git** — for version control (commit after each milestone, see build order below)

## Setup

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` if you want to change default paths/models — defaults work out of the box.

## Day 1 milestone: ingestion slice (no AI yet)

Confirms yt-dlp + ffmpeg + frame sampling work on your machine before anything else is built on top.

```powershell
python -m src.cli ingest "https://www.instagram.com/reel/XXXXXXX/"
```

This downloads the video into `data/<id>/`, extracts 16kHz mono audio, and samples one frame
every `FRAME_INTERVAL_SECONDS` (default 7s) into `data/<id>/frames/`. Run it on 2-3 real reels
before moving on — Instagram auth/rate-limits are the most likely thing to break, and you want
to find that out on Day 1, not Day 3.

If a URL fails: yt-dlp will print why. Common fix is cookies (see `--cookies-from-browser` in
yt-dlp docs) or falling back to a manually-downloaded file dropped into `data/<id>/raw/`.

## Build order

1. ✅ Scaffold (this)
2. ✅ Ingestion slice — `src/ingest.py`, `src/audio.py`, `src/frames.py`, `src/cli.py`
3. STT + VLM captioning — `src/transcribe.py` (faster-whisper), `src/caption.py` (Ollama/moondream)
4. Note generation — `src/notegen.py` (Ollama LLM -> Markdown + YAML frontmatter into `vault/Notes/`)
5. Indexing — `src/index.py` (SQLite FTS5 over `vault/Notes/`)
6. Search + NL answer — `src/search.py`, `src/answer.py`
7. Streamlit UI — `app.py`
8. Error-handling pass + smoke test script
9. Demo script in this README

## Repo layout

```
reeltoreal/
├── src/            # all pipeline code, one module per pipeline stage
├── vault/           # Obsidian-compatible vault (Notes/, Videos/, Attachments/)
├── data/            # working directory for raw downloads/audio/frames (gitignored)
├── scripts/         # smoke tests, one-off utilities
├── app.py           # Streamlit UI (added in step 7)
├── .env.example
└── requirements.txt
```
