# 🎬 ReelToReal

> **Transform Instagram Reels and YouTube Shorts into a fully-searchable, timestamped, multimodal knowledge vault — with real-time situational analysis powered by Groq.**
>
> *100% Local Ingestion · Hybrid Vector Search · Obsidian Compatible · Groq + Live Web Comparison*

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org/)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Local_AI-Ollama-black.svg)](https://ollama.com)
[![Qdrant](https://img.shields.io/badge/Vector_DB-Qdrant-DC143C.svg)](https://qdrant.tech/)
[![Groq](https://img.shields.io/badge/LLM-Groq_Llama3-orange.svg)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ What is ReelToReal?

We all save dozens of Instagram Reels and YouTube Shorts — recipes, market tips, language lessons, workouts, travel guides — only for them to disappear into bookmark graveyards.

**ReelToReal** is an open-source multimodal pipeline that:

1. **Downloads** any Instagram Reel or YouTube Short via `yt-dlp`
2. **Transcribes** the full spoken audio with timestamped segments using `faster-whisper`
3. **Captions** visual frames with a local Vision Language Model (`Moondream` via Ollama)
4. **Generates** a structured Obsidian Markdown note combining both audio and visual intelligence
5. **Indexes** everything into a Hybrid Search Engine (Qdrant dense vectors + SQLite FTS5 lexical)
6. **Answers** natural language questions using Grounded RAG — comparing your saved reel's past claims against **live real-time web data** via Groq (Llama 3.3 70B)

---

## 🚀 Key Features

| Feature | Details |
|:---|:---|
| 🎧 **Whisper Transcription** | `faster-whisper` (`distil-large-v3`, `int8` quantized) — full-length timestamped audio, no 28s cutoff |
| 👁️ **Moondream Visual Captioning** | Frames sampled every 7 seconds, captioned locally via Ollama VLM |
| 📓 **Obsidian Vault Notes** | Auto-generated `.md` files with YAML frontmatter, transcript, scene descriptions, tags |
| ⚡ **Hybrid Search (< 200ms)** | Qdrant dense semantic vectors + SQLite FTS5 BM25 lexical — fused via Reciprocal Rank Fusion |
| ⏱️ **Timestamp Pinpointing** | Returns exact moments: `[TRANSCRIPT @ 4.0s → 14.0s]`, `[CAPTION @ 14s]` |
| 🌐 **Live Real-Time Web Context** | DuckDuckGo search integration fetches current data to compare against reel claims |
| 🤖 **Situational RAG Analysis** | Groq (Llama 3.3 70B) or local Ollama compares *"what the reel said then"* vs *"reality today"* |
| 🔒 **Fully Local Ingestion** | No cloud APIs required for download, transcription, or captioning |
| 🖥️ **React Web Dashboard** | Dark-mode cinematic UI for search, chat, ingestion, vault browsing, and diagnostics |

---

## 🏗️ Architecture

```
                    Video URL (Instagram Reel / YouTube Short)
                                        │
                                        ▼
                              [ Stage 1: yt-dlp Download ]
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
      [ Stage 2A: ffmpeg Audio Extract ]     [ Stage 2B: OpenCV Frame Sampling ]
           16kHz Mono WAV                       1 frame every 7 seconds
                   │                                         │
                   ▼                                         ▼
       [ Stage 3: faster-whisper STT ]        [ Stage 4: Moondream VLM (Ollama) ]
     Timestamped spoken transcription           Short visual scene descriptions
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        ▼
                         [ Stage 5: Note Generation (qwen2.5) ]
                              Obsidian Markdown vault note
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
         [ Stage 6A: SQLite FTS5 ]            [ Stage 6B: Qdrant Vector DB ]
         BM25 Lexical Indexing               FastEmbed BAAI/bge-small-en-v1.5 (384d)
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        ▼
                           [ Hybrid RRF Fusion Engine ]
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              ▼                                                   ▼
  [ Instant Timestamp Search ]                    [ Situational RAG (Chat) ]
    < 200ms, Zero LLM overhead                            │
                                        ┌─────────────────┴──────────────────┐
                                        ▼                                    ▼
                             [ Live Web Search ]               [ Vault Context (RAG) ]
                               DuckDuckGo Today                 Past reel transcript
                                        │                                    │
                                        └─────────────────┬──────────────────┘
                                                          ▼
                                            [ Groq Llama 3.3 70B (or Ollama) ]
                                        "Reel said X then. Today it's Y. Here's the diff."
```

---

## 📁 Repository Structure

```
reeltoreal/
│
├── server.py               # FastAPI Python backend (port 8000)
├── server.ts               # Express + Vite Node backend (port 3000)
│
├── src/                    # Python pipeline modules
│   ├── config.py           # Centralized config — paths, model names, API keys
│   ├── ingest.py           # Stage 1: yt-dlp video download
│   ├── audio.py            # Stage 2A: ffmpeg audio extraction (16kHz mono WAV)
│   ├── frames.py           # Stage 2B: OpenCV frame sampling (every N seconds)
│   ├── transcribe.py       # Stage 3: faster-whisper transcription with timestamps
│   ├── caption.py          # Stage 4: Moondream VLM captioning via local Ollama
│   ├── notegen.py          # Stage 5: Obsidian markdown note generation
│   ├── vector_db.py        # Stage 6A/B: Qdrant embedding + indexing
│   ├── index.py            # SQLite FTS5 BM25 lexical indexer
│   ├── search.py           # Hybrid RRF search (dense + sparse fusion)
│   ├── answer.py           # Grounded RAG: Vault context + Live web + Groq/Ollama LLM
│   ├── classify.py         # Auto category detection from video metadata
│   ├── cli.py              # CLI interface for all pipeline stages
│   └── types.ts / App.tsx  # React frontend entrypoints
│
├── server/
│   └── vault.ts            # Node vault parser & fallback hybrid search
│
├── vault/
│   ├── Notes/              # Generated Obsidian markdown notes (.md)
│   ├── Videos/             # Downloaded video files
│   ├── Attachments/        # Extra assets
│   └── qdrant_storage/     # Embedded Qdrant vector database (gitignored)
│
├── data/                   # Intermediate pipeline files (gitignored)
├── app.py                  # Streamlit alternate UI (optional)
├── requirements.txt        # Python dependencies
├── package.json            # Node/npm dependencies
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript config
├── .env.example            # Environment config template
└── README.md
```

---

## 🛠️ Prerequisites

1. **Python 3.10+** (Miniconda or system Python)
2. **Node.js 18+** and **npm**
3. **[FFmpeg](https://ffmpeg.org)** on your `PATH`:
   ```powershell
   choco install ffmpeg       # Windows (Chocolatey)
   brew install ffmpeg        # macOS
   sudo apt install ffmpeg    # Linux
   ```
4. **[Ollama](https://ollama.com)** running locally with required models:
   ```bash
   ollama serve
   ollama pull moondream
   ollama pull qwen2.5:1.5b
   ```

---

## 📦 Installation

```powershell
# 1. Clone
git clone https://github.com/ss-sevesh/reeltoreal.git
cd reeltoreal

# 2. Install Python dependencies
pip install -r requirements.txt
pip install fastapi groq ddgs

# 3. Install Node dependencies (React frontend)
npm install

# 4. Configure environment
copy .env.example .env
```

Then edit `.env` with your settings:

```env
DATA_DIR=./data
VAULT_DIR=./vault

WHISPER_MODEL=distil-large-v3
WHISPER_DEVICE=cuda          # or "cpu" if no GPU
WHISPER_COMPUTE_TYPE=int8

OLLAMA_HOST=http://localhost:11434
OLLAMA_VLM_MODEL=moondream
OLLAMA_LLM_MODEL=qwen2.5:1.5b

FRAME_INTERVAL_SECONDS=7

# Optional: enables Groq Llama 3.3 70B + live web comparison
GROQ_API_KEY=gsk_xxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## ▶️ Running the Application

### Start Both Servers

**Terminal 1 — Python AI Backend (port 8000):**
```powershell
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — React Frontend (port 3000):**
```powershell
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 💻 CLI Usage

Run the full pipeline or individual stages via CLI:

```powershell
# Process a video end-to-end (download → transcribe → caption → note → index)
python -m src.cli process "https://youtube.com/shorts/Edl-l88L-C4"

# Hybrid search (zero LLM overhead)
python -m src.cli search "english restaurant food ordering"

# Ask a natural language question (RAG)
python -m src.cli ask "What food was ordered in the restaurant reel?"

# Run individual stages
python -m src.cli ingest "<URL>"
python -m src.cli transcribe "<VIDEO_ID>"
python -m src.cli caption "<VIDEO_ID>"
python -m src.cli notegen "<VIDEO_ID>" "<URL>"
python -m src.cli index
```

---

## 🤖 How Situational Analysis Works

When you ask a question like *"What is the cotton price now?"*:

```
User Question
     │
     ├── [1] Vault RAG: Retrieves stored reel chunk
     │         → "Reel (Aug 2026): Cotton is ₹18/kg"
     │
     ├── [2] Live Web Search (DuckDuckGo)
     │         → "Today (Sep 2026): Cotton rate is ₹24/kg"
     │
     └── [3] Groq Llama 3.3 70B (or Ollama fallback)
               → "The reel from last month mentioned ₹18/kg.
                  As of today, the market rate is ₹24/kg —
                  a 33% increase since the reel was saved."
```

---

## 🗺️ Roadmap

- [x] Multimodal ingestion pipeline (Whisper STT + Moondream VLM)
- [x] Obsidian-compatible markdown vault notes
- [x] Hybrid RRF search (Qdrant + SQLite FTS5)
- [x] Grounded RAG with local Ollama
- [x] Live real-time web context (DuckDuckGo)
- [x] Situational comparison analysis (Groq Llama 3.3 70B)
- [x] React + Vite cinematic web dashboard
- [ ] Multi-video batch processing queue
- [ ] Instagram private Reel support (cookie auth)
- [ ] Mobile-responsive UI

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

Built by **[ss-sevesh](https://github.com/ss-sevesh)**. Contributions and feedback are welcome!
