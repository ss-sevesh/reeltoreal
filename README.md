# 🎬 ReelToReal

> **Turn saved Instagram Reels and YouTube Shorts into a searchable, timestamp-pinpointed local knowledge vault.**  
> *100% Local • Zero Cloud APIs • Embedded Qdrant Vector Search • Obsidian Compatible*

---

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Qdrant Embedded](https://img.shields.io/badge/Vector_DB-Qdrant_Embedded-red.svg)](https://qdrant.tech/)
[![Ollama](https://img.shields.io/badge/Local_AI-Ollama-black.svg)](https://ollama.com)
[![Whisper STT](https://img.shields.io/badge/STT-faster--whisper-green.svg)](https://github.com/SYSTRAN/faster-whisper)
[![Obsidian Ready](https://img.shields.io/badge/Vault-Obsidian_Markdown-purple.svg)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Why ReelToReal?

We all save dozens of insightful Instagram Reels and YouTube Shorts — recipes, workouts, travel tips, tech tutorials, and book summaries — only for them to get lost in bookmark graveyards.

**ReelToReal** solves this by downloading videos, listening to what is spoken (**Whisper STT**), looking at what is shown (**Moondream VLM**), and structuring everything into an **Obsidian Markdown Vault**.

It features an **Embedded Qdrant Hybrid Search Engine** that fuses semantic vectors and exact lexical matching so you can find specific video moments in **under 200 milliseconds** — with **zero LLM overhead**!

---

## 🚀 Key Features

- 🎧 **High-Speed Audio Transcription**: Powered by `faster-whisper` (`distil-large-v3` / `int8`), producing timestamped transcripts (`0.0s -> 4.0s`).
- 👁️ **Visual Scene Captioning**: Uses `moondream` (via local Ollama) to caption dynamically sampled frames every 7 seconds, indexing objects, actions, and scenes.
- 📓 **Obsidian-Ready Knowledge Vault**: Automatically generates clean `.md` files in `vault/Notes/` with YAML frontmatter, categorized tags, places, objects, and summary sections.
- ⚡ **Zero-LLM Hybrid Search (Dense + Sparse)**:
  - **Dense Vectors**: Embedded `Qdrant` + `FastEmbed` (`bge-small-en-v1.5`) matches abstract concepts and synonyms.
  - **Sparse Lexical**: `SQLite FTS5` (BM25) matches exact words, names, and phrases.
  - **Reciprocal Rank Fusion (RRF)**: Merges both ranking signals for industry-grade retrieval.
- ⏱️ **Timestamp Pinpointing**: Search results don't just return a video — they tell you the exact moment (e.g. `[CAPTION @ 14s]` or `[TRANSCRIPT @ 4.0s -> 14.0s]`).
- 🤖 **Grounded Question Answering (RAG)**: Ask natural language questions with `python -m src.cli ask` or via the web chat. `qwen2.5:1.5b` synthesizes grounded answers citing source URLs and reel titles without hallucinating.
- 🖥️ **Interactive Web Application (Streamlit)**: Complete dark-mode dashboard (`app.py`) featuring real-time hybrid search, RAG chat, live URL ingestion, Obsidian note inspector, and system diagnostics.
- 🔒 **Zero Docker & Zero Cloud Setup**: Qdrant runs embedded directly on disk (`vault/qdrant_storage/`), and Ollama runs locally.

---

## 🏗️ Architecture

```
                                  Video URL (Instagram / YouTube)
                                                │
                                                ▼
                                    [ Ingestion: yt-dlp ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             [ 16kHz Mono Audio ]                              [ Frame Extraction ]
                       │                                                 │
                       ▼                                                 ▼
            [ faster-whisper STT ]                              [ Moondream VLM ]
          Spoken text + Timestamps                           Visual Scene Descriptions
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼
                                    [ LLM Fusion: qwen2.5 ]
                                                │
                                                ▼
                                  Obsidian Markdown Note (.md)
                                 (YAML metadata, transcript, scenes)
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
              [ SQLite FTS5 ]                                   [ Qdrant Vector DB ]
           BM25 Lexical Indexing                             FastEmbed (384d Dense)
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼
                                [ Hybrid RRF Fusion Engine ]
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         ▼                                             ▼
             [ Instant Moment Search ]                     [ Grounded Q&A (RAG) ]
              Sub-second, Zero LLM                          qwen2.5:1.5b Synthesis
```

---

## 📊 Comparison: Keyword vs. Vector vs. ReelToReal Hybrid

| Search Query | Traditional FTS5 (BM25) | Vector Search (Qdrant) | ReelToReal Hybrid Search |
|:---|:---:|:---:|:---:|
| Exact video ID or title (`jNQXAC9IVRw`) | ✅ 100% Match | ⚠️ Approximate | ✅ **Instant Top Hit** |
| Synonyms (*"safari wildlife with long trunks"*) | ❌ Misses (words not in text) | ✅ Matches concept | ✅ **Ranked #1 with 66.5% score** |
| Visual action (*"man in red jacket smiling"*) | ❌ Misses if words differ | ✅ Matches scene | ✅ **Pinpoints [CAPTION @ 14s]** |
| Latency / Resource usage | ⚡ ~2ms | ⚡ ~10ms | ⚡ **< 200ms (No LLM delay)** |

---

## 🛠️ Prerequisites

1. **Python 3.11+**
2. **[FFmpeg](https://ffmpeg.org)** installed and available on your system `PATH`:
   ```powershell
   # Windows (via Chocolatey or Scoop)
   choco install ffmpeg
   # macOS
   brew install ffmpeg
   # Linux (Ubuntu/Debian)
   sudo apt install ffmpeg
   ```
3. **[Ollama](https://ollama.com)** running locally:
   ```bash
   ollama pull moondream
   ollama pull qwen2.5:1.5b
   ```

---

## 📦 Installation

```powershell
# 1. Clone the repository
git clone https://github.com/ss-sevesh/reeltoreal.git
cd reeltoreal

# 2. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On macOS/Linux: source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize environment configuration
copy .env.example .env        # On macOS/Linux: cp .env.example .env
```

---

## 🖥️ Web Application Dashboard (Streamlit)

ReelToReal includes a full dark-mode interactive web dashboard:

```powershell
streamlit run app.py
```
*Access the dashboard at `http://localhost:8501` in your browser.*

### Dashboard Capabilities:
1. 🔍 **Instant Hybrid Search**: Type any query or scene description to retrieve matched reels, scores, exact timecode pills (e.g. `[CAPTION @ 14s]`), and live Obsidian markdown previews.
2. 💬 **Ask AI (RAG Chat)**: Ask questions over your vault in plain English. `qwen2.5:1.5b` answers strictly using your notes and provides clickable source cards with original reel URLs.
3. ⚡ **Process New Video**: Paste an Instagram Reel or YouTube Shorts URL, click **Process Video**, and watch live progress bars as it downloads, transcribes, captions, generates notes, and indexes.
4. 🗄️ **Vault Explorer**: Browse all indexed reels, inspect tags and categories, and read generated notes with embedded timestamps.
5. 🩺 **Pipeline & Model Diagnostics**: One-click health check testing Ollama server connection, Moondream VLM, Whisper STT, FFmpeg, and Qdrant storage.

---

## 💻 CLI Usage Guide

ReelToReal provides a modular CLI for running the full pipeline or individual stages:

### 1. Process a Video (End-to-End)
Downloads, transcribes audio, captions frames, generates an Obsidian note, and indexes into both SQLite FTS5 and Qdrant:
```powershell
python -m src.cli process "https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

### 2. Hybrid Instant Search (Zero LLM Overhead)
Find relevant reels, specific scenes, and exact timestamps in milliseconds:
```powershell
python -m src.cli search "safari animals with long trunks"
```
**Output:**
```text
[Hybrid Search] Query: 'safari animals with long trunks'
Searching via Qdrant Dense Vectors + SQLite FTS5 (Zero LLM delay)...

  [1] Elephants (animal) - Match Score: 66.5%
       Top Moment: [TRANSCRIPT @ 4.0s -> 14.0s]
       Excerpt:    Elephants spoken audio [4.0s -> 14.0s]: The cool thing about these guys is that they have really, really, really long fronts, and that's cool.
       URL:        https://www.youtube.com/watch?v=jNQXAC9IVRw
       Note:       vault/Notes/jNQXAC9IVRw_Elephants.md
```

Search for a visual scene:
```powershell
python -m src.cli search "smiling guy standing near fence"
```
**Output:**
```text
  [1] Elephants (animal) - Match Score: 67.2%
       Top Moment: [CAPTION @ 14s]
       Excerpt:    Elephants visual scene at 14s: In the image, a young man is standing in front of a fence, wearing a blue jacket and a red and black jacket. He is looking directly at the camera with a smile on his face...
```

Filter by category:
```powershell
python -m src.cli search "outdoor adventure" --category travel
```

---

### 3. Ask Questions (Natural Language RAG)
Ask plain-English questions over your saved video knowledge vault:
```powershell
python -m src.cli ask "What was the young man wearing in front of the elephants?"
```
**Output:**
```text
[Ask] "What was the young man wearing in front of the elephants?"
Searching vault & thinking (Ollama LLM)...

============================================================
The young man was wearing a red jacket and a blue shirt in front of the elephants.
============================================================

Referenced Reels:
  - Elephants (animal)
    URL:  https://www.youtube.com/watch?v=jNQXAC9IVRw
    Note: vault/Notes/jNQXAC9IVRw_Elephants.md
```

---

### 4. Granular Pipeline Commands

Run any pipeline stage independently:
```powershell
# Ingest video + sample frames + extract audio
python -m src.cli ingest "<URL>"

# Transcribe audio with Whisper
python -m src.cli transcribe "<VIDEO_ID>"

# Caption sampled frames with Moondream VLM
python -m src.cli caption "<VIDEO_ID>" --max-frames 5

# Generate Obsidian markdown note
python -m src.cli notegen "<VIDEO_ID>" "<URL>"

# Rebuild both SQLite FTS5 and Qdrant Vector indexes
python -m src.cli index
```

---

## 📁 Repository Layout

```
reeltoreal/
├── app.py               # Streamlit Web Dashboard (Search, Chat, Ingestion, Explorer, Diagnostics)
├── src/
│   ├── ingest.py        # Video download via yt-dlp
│   ├── audio.py         # 16kHz mono WAV extraction via ffmpeg
│   ├── frames.py        # Dynamic frame sampling via OpenCV
│   ├── transcribe.py    # faster-whisper speech-to-text
│   ├── caption.py       # Ollama moondream VLM frame captioning
│   ├── notegen.py       # LLM fusion (qwen2.5) -> Obsidian note
│   ├── index.py         # SQLite FTS5 full-text indexing & parsing
│   ├── vector_db.py     # Qdrant embedded client + FastEmbed chunking
│   ├── search.py        # Hybrid Search (Qdrant + FTS5 + RRF)
│   ├── answer.py        # Grounded RAG question answering
│   ├── config.py        # Centralized path and model configuration
│   └── cli.py           # Unified command-line interface
├── vault/
│   ├── Notes/           # Obsidian markdown notes (.md) with YAML frontmatter
│   ├── Videos/          # Saved video files
│   ├── Attachments/     # Saved assets & figures
│   ├── index.db         # SQLite FTS5 database (gitignored)
│   └── qdrant_storage/  # Embedded Qdrant vector database (gitignored)
├── data/                # Intermediate working files (gitignored)
├── .env.example         # Configuration template
├── requirements.txt     # Python package requirements
├── LICENSE              # MIT License
└── README.md
```

---

## 🗺️ Development Roadmap

- [x] **Day 1: Ingestion Pipeline** (`yt-dlp` download, audio extraction, frame sampling)
- [x] **Day 2: Multimodal Perception** (`faster-whisper` STT + `moondream` VLM captions)
- [x] **Day 3: Note Generation** (`qwen2.5` LLM fusion -> Obsidian vault notes)
- [x] **Day 4: Lexical Search Indexer** (`SQLite FTS5` with BM25 ranking)
- [x] **Day 5: Hybrid RAG & Vector Engine** (Embedded `Qdrant` + `FastEmbed` + RRF fusion + `qwen2.5` Q&A)
- [x] **Day 6: Streamlit Interactive UI** (`app.py` for web browsing, video playback, and chat)
- [ ] **Day 7: Performance Polish & Multi-video Batch Importer**

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

Developed by **[ss-sevesh](https://github.com/ss-sevesh)**. Contributions and feedback are welcome!
