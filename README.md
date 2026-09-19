# 🎬 ReelToReal

> **Turn saved Instagram Reels and YouTube Shorts into a searchable, timestamp-pinpointed local knowledge vault.**  
> *100% Local • Zero Cloud APIs • Embedded Qdrant Vector Search • Obsidian Compatible*
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Ollama](https://img.shields.io/badge/Local_AI-Ollama-black.svg)](https://ollama.com)
[![Qdrant Hybrid](https://img.shields.io/badge/Vector_DB-Qdrant_Hybrid-red.svg)](https://qdrant.tech/)
[![Obsidian Ready](https://img.shields.io/badge/Vault-Obsidian_Markdown-purple.svg)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Why ReelToReal?

We all save dozens of insightful Instagram Reels and YouTube Shorts — recipes, workouts, travel tips, tech tutorials, and book summaries — only for them to get lost in bookmark graveyards.

**ReelToReal** solves this by downloading videos, listening to what is spoken (**Whisper STT**), looking at what is shown (**Moondream VLM**), and structuring everything into an **Obsidian Markdown Vault**.

It features an **Embedded Hybrid Search Engine** that fuses semantic vectors and exact lexical matching so you can find specific video moments in **under 200 milliseconds** — with **zero LLM overhead**!

---

## 🚀 Key Features

- 🎧 **High-Speed Audio Transcription**: Powered by `faster-whisper` (`distil-large-v3` / `int8`), producing timestamped transcripts (`0.0s -> 4.0s`).
- 👁️ **Visual Scene Captioning**: Uses `moondream` (via local Ollama) to caption dynamically sampled frames every 7 seconds, indexing objects, actions, and scenes.
- 📓 **Obsidian-Ready Knowledge Vault**: Automatically generates clean `.md` files in `vault/Notes/` with YAML frontmatter, categorized tags, places, objects, and summary sections.
- ⚡ **Zero-LLM Hybrid Search (Dense + Sparse)**:
  - **Dense Vectors**: Embedded `Qdrant` + FastEmbed semantics matches abstract concepts and synonyms.
  - **Sparse Lexical**: BM25 inverted lexical indexing matches exact words, names, and phrases.
  - **Reciprocal Rank Fusion (RRF)**: Merges both ranking signals for industry-grade retrieval.
- ⏱️ **Timestamp Pinpointing**: Search results don't just return a video — they tell you the exact moment (e.g. `[CAPTION @ 14s]` or `[TRANSCRIPT @ 4.0s -> 14.0s]`).
- 🤖 **Grounded Question Answering (RAG)**: Ask natural language questions via web chat or API. `qwen2.5:1.5b` (via local Ollama) synthesizes grounded answers citing source URLs and reel titles without hallucinating.
- 🖥️ **Interactive Web Application (React + Vite)**: Complete dark-mode cinematic dashboard featuring real-time hybrid search, Ollama RAG chat, live URL ingestion, Obsidian note inspector, and system diagnostics.
- 🔒 **Zero Docker & Zero Cloud Setup**: Local storage runs embedded directly on disk (`vault/`), and Ollama runs locally on your machine.

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
              Sub-second, Zero LLM                          qwen2.5:1.5b (Ollama)
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

1. **Node.js 18+** and **npm**
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
   ollama serve
   ollama pull moondream
   ollama pull qwen2.5:1.5b
   ```

---

## 📦 Installation

```powershell
# 1. Clone the repository
git clone https://github.com/ss-sevesh/reeltoreal.git
cd reeltoreal

# 2. Install Node dependencies (for React Web Dashboard & Express backend)
npm install

# 3. (Optional) Install Python pipeline dependencies (for CLI commands & FastEmbed)
pip install -r requirements.txt

# 4. Configure environment
copy .env.example .env        # On macOS/Linux: cp .env.example .env
```

---

## 🖥️ Web Application Dashboard (React + Vite)

ReelToReal includes a full dark-mode interactive web dashboard:

```powershell
npm run dev
```
*Access the dashboard at `http://localhost:3000` in your browser.*

For production build:
```powershell
npm run build
npm start
```

### Dashboard Capabilities:
1. 🔍 **Instant Hybrid Search**: Type any query or scene description to retrieve matched reels, scores, exact timecode pills (e.g. `[CAPTION @ 14s]`), and live Obsidian markdown previews.
2. 💬 **Ask AI (RAG Chat with Ollama)**: Ask questions over your vault in plain English. Local `qwen2.5:1.5b` answers strictly using your notes and provides clickable source cards with original reel URLs.
3. ⚡ **Process New Video**: Paste an Instagram Reel or YouTube Shorts URL, click **Process Video**, and watch live progress bars as it downloads, transcribes, captions, generates notes, and indexes.
4. 🗄️ **Vault Explorer**: Browse all indexed reels, inspect tags and categories, and read generated notes with embedded timestamps.
5. 🩺 **Pipeline & Model Diagnostics**: Real-time health check testing local Ollama connection, Qwen2.5 LLM, Moondream VLM, FastEmbed chunks, and vault storage.Chat)**: Ask questions over your vault in plain English. `qwen2.5:1.5b` answers strictly using your notes and provides clickable source cards with original reel URLs.
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
├── server.ts            # Express backend with Vite middleware & REST endpoints
├── server/
│   └── vault.ts         # Vault parser, hybrid RRF search, and Ollama integration
├── src/
│   ├── App.tsx          # React application root & navigation
│   ├── main.tsx         # React DOM entrypoint
│   ├── types.ts         # TypeScript data contracts & vault schemas
│   ├── services/
│   │   └── api.ts       # Centralized API service for chat, search, notes, diagnostics
│   └── components/      # UI components and view pages (Search, Chat, Ingest, Vault, Diagnostics)
├── vault/
│   ├── Notes/           # Obsidian markdown notes (.md) with YAML frontmatter
│   ├── Videos/          # Saved video files
│   └── Attachments/     # Saved assets & figures
├── data/                # Intermediate working files (gitignored)
├── .env                 # Environment configuration (Ollama host & models)
├── .env.example         # Configuration template
├── package.json         # Node scripts & dependencies
├── vite.config.ts       # Vite bundler configuration
├── tsconfig.json        # TypeScript configuration
├── LICENSE              # MIT License
└── README.md
```

---

## 🗺️ Development Roadmap

- [x] **Phase 1: Ingestion & Perception Pipeline** (Video metadata, audio transcriptions, frame captioning)
- [x] **Phase 2: Note Generation & Obsidian Vault** (`qwen2.5` LLM fusion -> Obsidian vault notes)
- [x] **Phase 3: Lexical & Vector Indexing** (FastEmbed dense vectors + SQLite lexical BM25 matching)
- [x] **Phase 4: Hybrid RRF Fusion Engine** (Dense + Sparse Reciprocal Rank Fusion)
- [x] **Phase 5: Ollama Local AI Stack** (Local `qwen2.5:1.5b` grounded Q&A + `moondream` scene perception)
- [x] **Phase 6: Cinematic React Web Dashboard** (React 18 + TailwindCSS + Vite + Express UI)
- [ ] **Phase 7: Performance Polish & Multi-video Batch Importer**

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

Developed by **[ss-sevesh](https://github.com/ss-sevesh)**. Contributions and feedback are welcome!
