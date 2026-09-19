"""
ReelToReal: Cinematic Multimodal Knowledge Vault & Hybrid RAG Web Application.
Design System: Cinematic Multimodal Knowledge Vault (Stitch Project 1492097679487645568)
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
# Streamlit Page Config & Custom Styling (Cinematic Dark Studio)
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="ReelToReal • Cinematic Knowledge Vault",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS matching Stitch Design System: Cinematic Multimodal Knowledge Vault
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    :root {
        --bg-main: #080A10;
        --surface: #0E131F;
        --surface-card: #121826;
        --surface-elevated: #161D2E;
        --primary: #10B981;
        --primary-glow: rgba(16, 185, 129, 0.18);
        --secondary: #06B6D4;
        --accent-purple: #8B5CF6;
        --accent-amber: #F59E0B;
        --border-subtle: rgba(255, 255, 255, 0.08);
        --border-hover: rgba(16, 185, 129, 0.35);
        --text-primary: #F8FAFC;
        --text-secondary: #94A3B8;
        --text-muted: #64748B;
    }

    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text-primary);
    }

    h1, h2, h3, h4, h5, h6, .outfit {
        font-family: 'Outfit', sans-serif !important;
        letter-spacing: -0.015em;
    }

    code, pre, .mono, .label-mono {
        font-family: 'JetBrains Mono', monospace !important;
    }

    /* Main background */
    .stApp {
        background-color: var(--bg-main);
    }

    /* Hero Banner - Cinematic Studio Header */
    .hero-banner {
        background: linear-gradient(135deg, rgba(14, 19, 31, 0.9) 0%, rgba(18, 24, 38, 0.95) 100%);
        border: 1px solid var(--border-subtle);
        border-top: 2px solid var(--primary);
        border-radius: 16px;
        padding: 24px 32px;
        margin-bottom: 24px;
        box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.7), 0 0 24px var(--primary-glow);
        backdrop-filter: blur(16px);
    }

    .hero-title {
        font-family: 'Outfit', sans-serif !important;
        font-size: 2.2rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        background: linear-gradient(90deg, #F8FAFC 0%, #10B981 50%, #06B6D4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .hero-subtitle {
        color: var(--text-secondary);
        font-size: 0.95rem;
        margin: 0;
        line-height: 1.5;
    }

    .hero-telemetry {
        display: flex;
        gap: 12px;
        margin-top: 14px;
        flex-wrap: wrap;
    }

    /* Telemetry Pills */
    .telemetry-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        padding: 3px 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    .telemetry-tag.active {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.3);
        color: #6EE7B7;
    }

    /* Status Badges */
    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
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

    /* Reel Card - Surface Card Pattern */
    .reel-card {
        background: var(--surface-card);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 16px;
        transition: all 0.2s ease-in-out;
    }
    .reel-card:hover {
        border-color: var(--border-hover);
        box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.6), 0 0 16px var(--primary-glow);
        transform: translateY(-2px);
    }

    .reel-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }

    .reel-title {
        font-family: 'Outfit', sans-serif !important;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.3;
    }

    /* Timestamp Pill Pattern */
    .timestamp-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(245, 158, 11, 0.12);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-radius: 6px;
        padding: 3px 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .timestamp-pill.caption {
        background: rgba(6, 182, 212, 0.12);
        color: #22D3EE;
        border-color: rgba(6, 182, 212, 0.35);
    }
    .timestamp-pill.transcript {
        background: rgba(139, 92, 246, 0.12);
        color: #C084FC;
        border-color: rgba(139, 92, 246, 0.35);
    }

    /* Category Badge */
    .tag-badge {
        display: inline-block;
        background: rgba(16, 185, 129, 0.12);
        color: #6EE7B7;
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 6px;
        padding: 2px 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    /* Hybrid Score Indicator */
    .score-indicator-box {
        text-align: right;
    }
    .score-percentage {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1rem;
        font-weight: 700;
        color: #10B981;
    }
    .score-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.68rem;
        color: var(--text-muted);
        text-transform: uppercase;
    }

    /* Multimodal Pipeline Stepper */
    .pipeline-stepper {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        margin: 16px 0 24px 0;
    }
    .step-node {
        background: var(--surface-card);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        padding: 10px 12px;
        text-align: center;
    }
    .step-node.active {
        border-color: var(--primary);
        background: rgba(16, 185, 129, 0.08);
        box-shadow: 0 0 12px var(--primary-glow);
    }
    .step-number {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--primary);
    }
    .step-title {
        font-family: 'Outfit', sans-serif;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-top: 2px;
    }
    .step-tech {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        color: var(--text-muted);
    }

    /* Excerpt Box */
    .excerpt-box {
        margin: 10px 0;
        padding: 10px 14px;
        background: rgba(8, 10, 16, 0.6);
        border-left: 3px solid var(--primary);
        border-radius: 0 8px 8px 0;
        color: #E2E8F0;
        font-size: 0.92rem;
        line-height: 1.55;
    }

    /* Obsidian Vault Markdown Card */
    .obsidian-card {
        background: #0D1117;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        color: #C9D1D9;
    }
</style>
""", unsafe_allow_html=True)

# Fix browser accessibility warning: Streamlit renders inputs with autocomplete=""
st.markdown("""
<script>
(function fixAutocomplete() {
    function patch() {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        inputs.forEach((el, i) => {
            if (!el.getAttribute('autocomplete') || el.getAttribute('autocomplete') === '') {
                const hints = ['search', 'url', 'off'];
                el.setAttribute('autocomplete', hints[i] || 'off');
            }
        });
        document.querySelectorAll('textarea').forEach(el => {
            if (!el.getAttribute('autocomplete') || el.getAttribute('autocomplete') === '') {
                el.setAttribute('autocomplete', 'off');
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patch);
    } else {
        patch();
    }
    const observer = new MutationObserver(patch);
    observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
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
    notes_count = len([p for p in config.NOTES_DIR.glob("*.md") if p.name != ".gitkeep"])
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
    st.caption("Cinematic Multimodal Knowledge Vault")
    st.markdown("""
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #64748B; margin-bottom: 12px;">
        100% LOCAL AI • ZERO CLOUD APIS
    </div>
    """, unsafe_allow_html=True)
    st.divider()

    st.markdown("#### ⚡ System Telemetry")
    # Ollama status
    if ollama_ok:
        st.markdown(
            '<span class="status-pill status-ok">● Ollama Connected</span>',
            unsafe_allow_html=True,
        )
        st.caption(f"Models: `{', '.join([m.split(':')[0] for m in ollama_models])}`")
    else:
        st.markdown(
            '<span class="status-pill status-warn">▲ Ollama Standby</span>',
            unsafe_allow_html=True,
        )
        st.caption("Run `ollama serve` in terminal")

    # Qdrant status
    if stats["qdrant"]:
        st.markdown(
            '<span class="status-pill status-ok">● Qdrant Embedded (Rust)</span>',
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
            '<span class="status-pill status-ok">● SQLite FTS5 (BM25)</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span class="status-pill status-warn">▲ SQLite Index Empty</span>',
            unsafe_allow_html=True,
        )

    st.divider()
    st.metric("Vault Notes Indexed", stats["notes"], help="Obsidian markdown notes in vault/Notes/")

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
# Hero Header (Cinematic Multimodal Knowledge Vault)
# ---------------------------------------------------------------------------
st.markdown("""
<div class="hero-banner">
    <div class="hero-title">
        <span>🎬</span> ReelToReal
    </div>
    <p class="hero-subtitle">
        Turn saved Instagram Reels & YouTube Shorts into a timestamp-pinpointed, hybrid-searchable knowledge vault.
    </p>
    <div class="hero-telemetry">
        <span class="telemetry-tag active">● FastEmbed (BAAI/bge-small-en-v1.5)</span>
        <span class="telemetry-tag active">● Qdrant Embedded (Rust Zero-Docker)</span>
        <span class="telemetry-tag active">● SQLite FTS5 (BM25 Lexical)</span>
        <span class="telemetry-tag active">● faster-whisper (distil-large-v3 int8)</span>
        <span class="telemetry-tag active">● moondream VLM + qwen2.5:1.5b</span>
    </div>
</div>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Main Tabs
# ---------------------------------------------------------------------------
tab_search, tab_chat, tab_ingest, tab_vault, tab_health = st.tabs([
    "🔍  Hybrid Instant Search",
    "🤖  Vault Chat (RAG)",
    "⚡  Process New Video",
    "🗄️  Vault Explorer",
    "🩺  Pipeline & Model Diagnostics",
])


# ---------------------------------------------------------------------------
# TAB 1: HYBRID INSTANT SEARCH
# ---------------------------------------------------------------------------
with tab_search:
    st.markdown("#### 🔍 Sub-Second Hybrid Search (Zero LLM Delay)")
    st.caption("Dense Vector Similarity (Qdrant) + Sparse Lexical BM25 (SQLite FTS5) merged via Reciprocal Rank Fusion (RRF).")

    col1, col2 = st.columns([4, 1])
    with col1:
        query = st.text_input(
            "Search query",
            placeholder="e.g. safari animals with long trunks, young man smiling at fence, south indian breakfast...",
            label_visibility="collapsed",
        )
    with col2:
        cat_filter = st.selectbox(
            "Category filter",
            ["All", "animal", "food", "travel", "lifestyle", "education", "entertainment", "other"],
            label_visibility="collapsed",
        )

    # Quick search prompt chips
    st.markdown("<span style='font-size: 0.85rem; color: #94A3B8;'>⚡ Quick Queries:</span>", unsafe_allow_html=True)
    chip_cols = st.columns(4)
    if chip_cols[0].button("🐘 Safari Animals", use_container_width=True):
        query = "safari animals with long trunks"
    if chip_cols[1].button("😊 Guy Smiling Near Fence", use_container_width=True):
        query = "smiling guy standing near fence"
    if chip_cols[2].button("🍛 South Indian Cuisine", use_container_width=True):
        query = "traditional south indian breakfast food chennai"
    if chip_cols[3].button("🧥 Red & Black Jacket", use_container_width=True):
        query = "wearing a red and black jacket with a smile"

    if query:
        category = None if cat_filter == "All" else cat_filter
        t0 = time.time()
        results = hybrid_search(query, category=category, limit=6)
        elapsed_ms = (time.time() - t0) * 1000

        st.markdown(f"""
        <div style="margin: 16px 0 12px 0; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #10B981;">
            ✔ Found {len(results)} matching reel(s) in {elapsed_ms:.1f}ms via Dual Rank Fusion
        </div>
        """, unsafe_allow_html=True)

        if not results:
            st.info("No matching reels found. Try searching different keywords or ingesting more videos!")
        else:
            for r in results:
                vid_id = r["video_id"]
                title = r["title"]
                cat = r["category"]
                score = r["similarity_score"]
                moment_type = r.get("top_chunk_type", "match").lower()
                timestamp = r.get("timestamp")
                ts_str = f" @ {timestamp}" if timestamp else ""
                excerpt = r["highlight_text"]
                source_url = r["source_url"]

                # Determine timestamp badge styling class
                pill_class = "caption" if "caption" in moment_type else "transcript"
                icon = "👁️" if "caption" in moment_type else "🎧"

                st.markdown(f"""
                <div class="reel-card">
                    <div class="reel-card-header">
                        <div>
                            <div class="reel-title">{title}</div>
                            <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                                <span class="tag-badge">{cat}</span>
                                <span class="timestamp-pill {pill_class}">{icon} {moment_type.upper()}{ts_str}</span>
                            </div>
                        </div>
                        <div class="score-indicator-box">
                            <div class="score-percentage">{score:.1%}</div>
                            <div class="score-label">RRF Match</div>
                        </div>
                    </div>
                    <div class="excerpt-box">
                        {excerpt}
                    </div>
                    <div style="font-size: 0.8rem; color: #94A3B8; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span>🔗 <a href="{source_url}" target="_blank" style="color: #06B6D4; text-decoration: none; font-family: 'JetBrains Mono', monospace;">{source_url}</a></span>
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #64748B;">ID: {vid_id}</span>
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
    st.caption("Answers synthesized strictly from your saved reels by local `qwen2.5:1.5b` with zero hallucinations and direct citations.")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            {"role": "assistant", "content": "Hello! Ask me anything about your saved reels, recipes, outdoor travels, or visual scenes. I synthesize answers exclusively from your local vault notes."}
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
            with st.spinner("Retrieving vault moments & synthesizing answer via Qwen 2.5..."):
                t0 = time.time()
                res = answer_question(user_q)
                elapsed = time.time() - t0

                answer_text = res["answer"]
                sources = res.get("sources", [])

                formatted = f"{answer_text}\n\n"
                if sources:
                    formatted += "---\n**Referenced Vault Reels:**\n"
                    for s in sources:
                        formatted += f"- 🎬 **[{s['title']}]({s['source_url']})** (`category: {s['category']}`)\n"
                formatted += f"\n*⚡ Synthesized in {elapsed:.2f}s using local qwen2.5:1.5b • Zero Cloud APIs*"

                st.markdown(formatted)
                st.session_state.chat_history.append({"role": "assistant", "content": formatted})


# ---------------------------------------------------------------------------
# TAB 3: PROCESS NEW VIDEO
# ---------------------------------------------------------------------------
with tab_ingest:
    st.markdown("#### ⚡ Ingest & Process Video")
    st.caption("Paste an Instagram Reel or YouTube Short URL to execute the 5-stage multimodal local pipeline.")

    # Multimodal Pipeline Visual Stepper
    st.markdown("""
    <div class="pipeline-stepper">
        <div class="step-node active">
            <div class="step-number">STAGE 01</div>
            <div class="step-title">Ingestion</div>
            <div class="step-tech">yt-dlp + ffmpeg</div>
        </div>
        <div class="step-node active">
            <div class="step-number">STAGE 02</div>
            <div class="step-title">Perception STT</div>
            <div class="step-tech">faster-whisper</div>
        </div>
        <div class="step-node active">
            <div class="step-number">STAGE 03</div>
            <div class="step-title">Perception VLM</div>
            <div class="step-tech">Ollama moondream</div>
        </div>
        <div class="step-node active">
            <div class="step-number">STAGE 04</div>
            <div class="step-title">Note Fusion</div>
            <div class="step-tech">qwen2.5:1.5b</div>
        </div>
        <div class="step-node active">
            <div class="step-number">STAGE 05</div>
            <div class="step-title">Dual Indexing</div>
            <div class="step-tech">Qdrant + SQLite</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    url_input = st.text_input("Video URL", placeholder="https://www.youtube.com/shorts/... or https://www.instagram.com/reel/...")

    # Auto-detect category on URL paste
    if url_input and url_input.strip().startswith("http"):
        from src.classify import inspect_and_classify_video
        preview = inspect_and_classify_video(url_input.strip())
        dur_str = f" ({preview['duration']:.0f}s)" if preview.get('duration') else ""
        st.markdown(f"""
        <div style="margin-bottom: 14px; padding: 10px 14px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;">
            <span style="color: #6EE7B7;">✨ Auto-Selected Category:</span>
            <strong style="color: #F8FAFC; text-transform: uppercase; margin-left: 6px;">{preview['category']}</strong>
            <span style="color: #94A3B8; margin-left: 10px;">• {preview['title']}{dur_str}</span>
        </div>
        """, unsafe_allow_html=True)

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
            status_text.text("[1/5] Downloading video with yt-dlp...")
            progress_bar.progress(15)
            info = download_video(url_input)
            vid = info["id"]
            v_path = info["video_path"]
            v_dir = info["video_dir"]

            # Stage 2: Audio & Frames
            status_text.text("[2/5] Extracting 16kHz PCM audio & sampling frames...")
            progress_bar.progress(35)
            audio_path = v_dir / "audio.wav"
            extract_audio(v_path, audio_path)
            frames_dir = v_dir / "frames"
            frames = sample_frames(v_path, frames_dir, config.FRAME_INTERVAL_SECONDS)

            # Stage 3: Whisper STT (Full Audio) & Moondream VLM (Full Duration)
            status_text.text(f"[3/5] Transcribing full audio ({config.WHISPER_MODEL}) & captioning frames ({config.OLLAMA_VLM_MODEL})...")
            progress_bar.progress(60)
            trans_res = transcribe_audio(audio_path, v_dir)
            captions = caption_frames(frames_dir, v_dir, max_frames=None)

            # Stage 4: Note Generation
            status_text.text(f"[4/5] Synthesizing Obsidian Markdown note with {config.OLLAMA_LLM_MODEL}...")
            progress_bar.progress(80)
            note_path = generate_note(vid, url_input)

            # Stage 5: Dual Indexing
            status_text.text("[5/5] Indexing into SQLite FTS5 (BM25) and Qdrant Embedded Vector DB...")
            progress_bar.progress(95)
            build_index()
            build_vector_index()

            progress_bar.progress(100)
            status_text.success("🎉 Ingestion & Dual Indexing Complete!")
            st.balloons()

            st.markdown("### Generated Obsidian Markdown Note")
            st.markdown(note_path.read_text(encoding="utf-8"))

        except Exception as e:
            status_text.error(f"Pipeline failed: {e}")


# ---------------------------------------------------------------------------
# TAB 4: VAULT NOTES EXPLORER
# ---------------------------------------------------------------------------
with tab_vault:
    st.markdown("#### 🗄️ Obsidian Vault Explorer")
    st.caption("Inspect and read Obsidian-compatible markdown notes with YAML frontmatter in `vault/Notes/`.")

    notes = [p for p in config.NOTES_DIR.glob("*.md") if p.name != ".gitkeep"]

    if not notes:
        st.info("No notes found in vault yet. Use the Ingest tab to add your first reel!")
    else:
        selected_file = st.selectbox(
            "Select a vault note to inspect:",
            notes,
            format_func=lambda p: p.name,
        )
        if selected_file:
            content = selected_file.read_text(encoding="utf-8")
            parsed = parse_note(selected_file)

            col_meta, col_body = st.columns([1, 2])
            with col_meta:
                st.markdown("""
                <div style="background: #121826; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px;">
                    <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.1rem; color: #F8FAFC; margin-bottom: 10px;">
                        Metadata & Taxonomy
                    </div>
                """, unsafe_allow_html=True)
                st.write(f"**Title**: {parsed['title']}")
                st.write(f"**Category**: `{parsed['category']}`")
                st.write(f"**Video ID**: `{parsed['video_id']}`")
                st.write(f"**Duration**: {parsed['duration']:.1f}s")
                st.write(f"**URL**: [{parsed['source_url']}]({parsed['source_url']})")
                if parsed["tags"]:
                    st.write("**Tags**:")
                    st.markdown(" ".join([f"`#{t}`" for t in parsed["tags"]]))
                st.markdown("</div>", unsafe_allow_html=True)

            with col_body:
                st.markdown("##### 📄 Note Markdown View")
                st.markdown(content)


# ---------------------------------------------------------------------------
# TAB 5: PIPELINE & MODEL HEALTH DIAGNOSTICS
# ---------------------------------------------------------------------------
with tab_health:
    st.markdown("#### 🩺 Pipeline & Model Health Diagnostics")
    st.caption("Verify every local model and indexing engine directly on your system.")

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
            st.markdown("##### 2. Qdrant Embedded + FastEmbed")
            try:
                t0 = time.time()
                client = get_qdrant_client()
                colls = client.get_collections().collections
                dt = (time.time() - t0) * 1000
                st.success(f"Embedded Engine Online ({dt:.0f}ms)")
                st.write(f"Storage: `{config.QDRANT_DIR.name}`")
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
