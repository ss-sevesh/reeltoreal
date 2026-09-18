"""
ReelToReal: Local Multimodal Knowledge Vault & Hybrid RAG Web Application.
Built with Streamlit, Qdrant Embedded, FastEmbed, faster-whisper, and Ollama.
"""
import base64
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import requests
import streamlit as st

from src import config
from src.answer import answer_question
from src.index import DB_PATH, get_all_notes, parse_note
from src.search import hybrid_search
from src.vector_db import build_vector_index, get_qdrant_client

# ---------------------------------------------------------------------------
# Streamlit Page Config & Custom Styling
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="ReelToReal • Multimodal Knowledge Vault",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for rich dark-mode aesthetics, glassmorphism, and responsive layout
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    code, pre, .mono {
        font-family: 'JetBrains Mono', monospace !important;
    }

    /* Gradient header banner */
    .hero-banner {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 16px;
        padding: 24px 28px;
        margin-bottom: 24px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
    }

    .hero-title {
        font-size: 2.1rem;
        font-weight: 800;
        background: linear-gradient(90deg, #A78BFA 0%, #F472B6 50%, #38BDF8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .hero-subtitle {
        color: #94A3B8;
        font-size: 0.95rem;
        margin: 0;
    }

    /* Status badges */
    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .status-ok {
        background: rgba(16, 185, 129, 0.15);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-warn {
        background: rgba(245, 158, 11, 0.15);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.3);
    }

    /* Result cards */
    .reel-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 16px;
        transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .reel-card:hover {
        border-color: rgba(167, 139, 250, 0.4);
        transform: translateY(-2px);
    }

    .tag-badge {
        display: inline-block;
        background: rgba(139, 92, 246, 0.15);
        color: #C4B5FD;
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 500;
        margin-right: 6px;
        margin-bottom: 4px;
    }

    .moment-pill {
        background: rgba(56, 189, 248, 0.15);
        color: #7DD3FC;
        border: 1px solid rgba(56, 189, 248, 0.3);
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .score-meter {
        font-weight: 700;
        color: #34D399;
        font-size: 0.85rem;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Health & Status Helpers
# ---------------------------------------------------------------------------
def check_ollama_status() -> tuple[bool, list[str]]:
    """Check if Ollama server is running and which models are installed."""
    try:
        r = requests.get(f"{config.OLLAMA_HOST}/api/tags", timeout=2)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            return True, models
    except Exception:
        pass
    return False, []


def get_vault_stats() -> dict[str, Any]:
    """Retrieve vault stats (notes count, SQLite size, Qdrant chunks)."""
    notes_count = len(list(config.NOTES_DIR.glob("*.md")))
    db_exists = DB_PATH.exists()
    qdrant_exists = config.QDRANT_DIR.exists()
    return {
        "notes": notes_count,
        "db": db_exists,
        "qdrant": qdrant_exists,
    }


# ---------------------------------------------------------------------------
# Sidebar Status & System Info
# ---------------------------------------------------------------------------
ollama_ok, ollama_models = check_ollama_status()
stats = get_vault_stats()

with st.sidebar:
    st.markdown("### 🎬 **ReelToReal**")
    st.caption("100% Local Multimodal Knowledge Vault")
    st.divider()

    st.markdown("#### ⚡ System Health")
    # Ollama status
    if ollama_ok:
        st.markdown(
            '<span class="status-pill status-ok">● Ollama Online</span>',
            unsafe_allow_html=True,
        )
        st.caption(f"Models: `{', '.join([m.split(':')[0] for m in ollama_models])}`")
    else:
        st.markdown(
            '<span class="status-pill status-warn">▲ Ollama Offline</span>',
            unsafe_allow_html=True,
        )
        st.caption("Start with `ollama serve` in terminal")

    # Qdrant status
    if stats["qdrant"]:
        st.markdown(
            '<span class="status-pill status-ok">● Qdrant Embedded Active</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span class="status-pill status-warn">▲ Qdrant Uninitialized</span>',
            unsafe_allow_html=True,
        )

    # SQLite status
    if stats["db"]:
        st.markdown(
            '<span class="status-pill status-ok">● SQLite FTS5 Active</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span class="status-pill status-warn">▲ SQLite Index Empty</span>',
            unsafe_allow_html=True,
        )

    st.divider()
    st.metric("Indexed Notes", stats["notes"], help="Obsidian markdown notes in vault/Notes/")

    st.divider()
    if st.button("🔄 Rebuild All Indexes", use_container_width=True):
        with st.spinner("Rebuilding SQLite FTS5 & Qdrant vectors..."):
            from src.index import build_index
            from src.vector_db import build_vector_index
            c_notes = build_index()
            c_chunks = build_vector_index()
            st.success(f"Indexed {c_notes} notes & {c_chunks} vector chunks!")
            time.sleep(1)
            st.rerun()


# ---------------------------------------------------------------------------
# Hero Header
# ---------------------------------------------------------------------------
st.markdown("""
<div class="hero-banner">
    <div class="hero-title">
        <span>🎬</span> ReelToReal
    </div>
    <p class="hero-subtitle">
        Turn saved Instagram Reels & YouTube Shorts into a timestamp-pinpointed, hybrid-searchable knowledge vault.
    </p>
</div>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Main Tabs
# ---------------------------------------------------------------------------
tab_search, tab_chat, tab_ingest, tab_vault, tab_health = st.tabs([
    "🔍  Hybrid Instant Search",
    "🤖  Vault Chat (RAG)",
    "📥  Ingest New Video",
    "📓  Vault Notes Explorer",
    "🩺  Pipeline Health Diagnostic",
])


# ---------------------------------------------------------------------------
# TAB 1: HYBRID INSTANT SEARCH
# ---------------------------------------------------------------------------
with tab_search:
    st.markdown("#### 🔍 Sub-Second Hybrid Search (Zero LLM Delay)")
    st.caption("Dense Vector Search (Qdrant) + Sparse Keyword Search (SQLite FTS5) with Reciprocal Rank Fusion.")

    col1, col2 = st.columns([4, 1])
    with col1:
        query = st.text_input(
            "Search query",
            placeholder="e.g. safari animals with long trunks, young man smiling at fence, outdoor hiking...",
            label_visibility="collapsed",
        )
    with col2:
        cat_filter = st.selectbox(
            "Category filter",
            ["All", "animal", "travel", "food", "lifestyle", "education", "entertainment", "other"],
            label_visibility="collapsed",
        )

    # Quick search prompt chips
    st.markdown("**Try searching:**")
    chip_cols = st.columns(4)
    if chip_cols[0].button("🐘 Safari Animals", use_container_width=True):
        query = "safari animals with long trunks"
    if chip_cols[1].button("😊 Guy Smiling Near Fence", use_container_width=True):
        query = "smiling guy standing near fence"
    if chip_cols[2].button("🏔️ Outdoor Adventure", use_container_width=True):
        query = "outdoor adventure hiking and scenic views"
    if chip_cols[3].button("🧥 Red & Blue Jacket", use_container_width=True):
        query = "wearing a red jacket and blue shirt"

    if query:
        category = None if cat_filter == "All" else cat_filter
        t0 = time.time()
        results = hybrid_search(query, category=category, limit=6)
        elapsed_ms = (time.time() - t0) * 1000

        st.markdown(f"**Found {len(results)} matching reel(s) in `{elapsed_ms:.1f}ms`**")

        if not results:
            st.info("No matching reels found. Try searching different keywords or indexing more videos!")
        else:
            for r in results:
                vid_id = r["video_id"]
                title = r["title"]
                cat = r["category"]
                score = r["similarity_score"]
                moment_type = r.get("top_chunk_type", "match").upper()
                timestamp = r.get("timestamp")
                ts_str = f" @ {timestamp}" if timestamp else ""
                excerpt = r["highlight_text"]
                source_url = r["source_url"]

                with st.container():
                    st.markdown(f"""
                    <div class="reel-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <span style="font-size: 1.15rem; font-weight: 700; color: #F8FAFC;">{title}</span>
                                <span class="tag-badge" style="margin-left: 8px;">{cat}</span>
                            </div>
                            <div class="score-meter">Match: {score:.1%}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <span class="moment-pill">{moment_type}{ts_str}</span>
                        </div>
                        <blockquote style="margin: 8px 0; padding-left: 12px; border-left: 3px solid #8B5CF6; color: #CBD5E1; font-size: 0.92rem;">
                            {excerpt}
                        </blockquote>
                        <div style="font-size: 0.8rem; color: #94A3B8; margin-top: 8px;">
                            🔗 <a href="{source_url}" target="_blank" style="color: #38BDF8; text-decoration: none;">{source_url}</a>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                    # Expandable video preview and full note
                    col_v, col_n = st.columns([1, 1])
                    video_candidates = list((config.DATA_DIR / vid_id / "raw").glob(f"{vid_id}.*"))
                    with col_v:
                        if video_candidates and video_candidates[0].exists():
                            with st.expander(f"🎬 Watch Clip ({vid_id})"):
                                st.video(str(video_candidates[0]))
                    with col_n:
                        note_path = Path(r["note_path"])
                        if note_path.exists():
                            with st.expander("📄 View Obsidian Note"):
                                st.markdown(note_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# TAB 2: VAULT CHAT (RAG)
# ---------------------------------------------------------------------------
with tab_chat:
    st.markdown("#### 🤖 Grounded Q&A Assistant (Local RAG)")
    st.caption("Answers synthesized exclusively from your saved reels by local `qwen2.5:1.5b` with zero hallucinations.")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            {"role": "assistant", "content": "Hello! Ask me anything about your saved reels, recipes, outdoor travels, or visual scenes."}
        ]

    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    user_q = st.chat_input("Ask a question about your saved reels...")
    if user_q:
        st.session_state.chat_history.append({"role": "user", "content": user_q})
        with st.chat_message("user"):
            st.markdown(user_q)

        with st.chat_message("assistant"):
            with st.spinner("Retrieving vault moments & synthesizing answer..."):
                t0 = time.time()
                res = answer_question(user_q)
                elapsed = time.time() - t0

                answer_text = res["answer"]
                sources = res.get("sources", [])

                formatted = f"{answer_text}\n\n"
                if sources:
                    formatted += "---\n**Referenced Reels:**\n"
                    for s in sources:
                        formatted += f"- [{s['title']}]({s['source_url']}) (`{s['category']}`)\n"
                formatted += f"\n*Generated in {elapsed:.2f}s using local qwen2.5:1.5b*"

                st.markdown(formatted)
                st.session_state.chat_history.append({"role": "assistant", "content": formatted})


# ---------------------------------------------------------------------------
# TAB 3: INGEST NEW VIDEO
# ---------------------------------------------------------------------------
with tab_ingest:
    st.markdown("#### 📥 Ingest a Video into the Vault")
    st.caption("Paste an Instagram Reel or YouTube Short URL to run the complete 100% local pipeline.")

    url_input = st.text_input("Video URL", placeholder="https://www.youtube.com/shorts/... or https://www.instagram.com/reel/...")
    process_btn = st.button("🚀 Process Video & Add to Vault", type="primary", use_container_width=True)

    if process_btn and url_input:
        from src.audio import extract_audio
        from src.caption import caption_frames
        from src.frames import sample_frames
        from src.index import build_index
        from src.ingest import download_video
        from src.notegen import generate_note
        from src.transcribe import transcribe_audio
        from src.vector_db import build_vector_index

        progress_bar = st.progress(0)
        status_text = st.empty()

        try:
            # Stage 1: Download
            status_text.text("[1/6] Downloading video with yt-dlp...")
            progress_bar.progress(10)
            info = download_video(url_input)
            vid = info["id"]
            v_path = info["video_path"]
            v_dir = info["video_dir"]

            # Stage 2: Audio & Frames
            status_text.text("[2/6] Extracting 16kHz audio & sampling frames...")
            progress_bar.progress(30)
            audio_path = v_dir / "audio.wav"
            extract_audio(v_path, audio_path)
            frames_dir = v_dir / "frames"
            frames = sample_frames(v_path, frames_dir, config.FRAME_INTERVAL_SECONDS)

            # Stage 3: Whisper STT
            status_text.text(f"[3/6] Transcribing with Whisper ({config.WHISPER_MODEL})...")
            progress_bar.progress(50)
            trans_res = transcribe_audio(audio_path, v_dir)

            # Stage 4: Moondream VLM
            status_text.text(f"[4/6] Captioning visual frames with {config.OLLAMA_VLM_MODEL}...")
            progress_bar.progress(70)
            captions = caption_frames(frames_dir, v_dir, max_frames=5)

            # Stage 5: Note Generation
            status_text.text(f"[5/6] Synthesizing Obsidian note with {config.OLLAMA_LLM_MODEL}...")
            progress_bar.progress(85)
            note_path = generate_note(vid, url_input)

            # Stage 6: Indexing
            status_text.text("[6/6] Updating SQLite FTS5 & Qdrant Vector DB...")
            progress_bar.progress(95)
            build_index()
            build_vector_index()

            progress_bar.progress(100)
            status_text.success("🎉 Ingestion & Indexing Complete!")
            st.balloons()

            st.markdown("### Generated Obsidian Note")
            st.markdown(note_path.read_text(encoding="utf-8"))

        except Exception as e:
            status_text.error(f"Pipeline failed: {e}")


# ---------------------------------------------------------------------------
# TAB 4: VAULT NOTES EXPLORER
# ---------------------------------------------------------------------------
with tab_vault:
    st.markdown("#### 📓 Vault Notes Explorer")
    st.caption("Browse and read Obsidian-compatible markdown notes saved in `vault/Notes/`.")

    notes = list(config.NOTES_DIR.glob("*.md"))
    valid_notes = [n for n in notes if n.name != ".gitkeep"]

    if not valid_notes:
        st.info("No notes found in vault yet. Use the Ingest tab to add your first reel!")
    else:
        selected_file = st.selectbox(
            "Select a note to inspect:",
            valid_notes,
            format_func=lambda p: p.name,
        )
        if selected_file:
            content = selected_file.read_text(encoding="utf-8")
            parsed = parse_note(selected_file)

            col_meta, col_body = st.columns([1, 2])
            with col_meta:
                st.markdown("##### 🏷️ Metadata")
                st.write(f"**Title**: {parsed['title']}")
                st.write(f"**Category**: `{parsed['category']}`")
                st.write(f"**Video ID**: `{parsed['video_id']}`")
                st.write(f"**Duration**: {parsed['duration']:.1f}s")
                st.write(f"**URL**: [{parsed['source_url']}]({parsed['source_url']})")
                if parsed["tags"]:
                    st.write("**Tags**:")
                    st.markdown(" ".join([f"`#{t}`" for t in parsed["tags"]]))

            with col_body:
                st.markdown("##### 📄 Note Preview")
                st.markdown(content)


# ---------------------------------------------------------------------------
# TAB 5: PIPELINE & MODEL HEALTH DIAGNOSTIC
# ---------------------------------------------------------------------------
with tab_health:
    st.markdown("#### 🩺 Pipeline & Model Health Diagnostic")
    st.caption("Test every local AI model and pipeline component directly on your machine.")

    if st.button("🧪 Run Complete System Diagnostic", type="primary", use_container_width=True):
        diag_cols = st.columns(3)

        # 1. Ollama Test
        with diag_cols[0]:
            st.markdown("##### 1. Ollama Server")
            try:
                t0 = time.time()
                r = requests.get(f"{config.OLLAMA_HOST}/api/tags", timeout=3)
                dt = (time.time() - t0) * 1000
                if r.status_code == 200:
                    models = [m["name"] for m in r.json().get("models", [])]
                    st.success(f"Online ({dt:.0f}ms)")
                    st.write("Models available:")
                    for m in models:
                        st.markdown(f"- `{m}`")
                else:
                    st.error(f"HTTP {r.status_code}")
            except Exception as e:
                st.error(f"Failed: {e}")

        # 2. Qdrant & FastEmbed Test
        with diag_cols[1]:
            st.markdown("##### 2. Qdrant + FastEmbed")
            try:
                t0 = time.time()
                client = get_qdrant_client()
                colls = client.get_collections().collections
                dt = (time.time() - t0) * 1000
                st.success(f"Embedded Engine Online ({dt:.0f}ms)")
                st.write(f"Storage path: `{config.QDRANT_DIR.name}`")
                st.write(f"Collections: `{[c.name for c in colls]}`")
            except Exception as e:
                st.error(f"Failed: {e}")

        # 3. SQLite FTS5 Test
        with diag_cols[2]:
            st.markdown("##### 3. SQLite FTS5 Database")
            try:
                t0 = time.time()
                db_notes = get_all_notes()
                dt = (time.time() - t0) * 1000
                st.success(f"Database Online ({dt:.0f}ms)")
                st.write(f"Indexed records: **{len(db_notes)}**")
                st.write(f"DB file: `{DB_PATH.name}`")
            except Exception as e:
                st.error(f"Failed: {e}")
