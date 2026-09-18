"""
CLI for running individual pipeline stages or the full end-to-end pipeline.

Day 1: python -m src.cli ingest "<url>"
Day 2: python -m src.cli transcribe "<video_id>"
       python -m src.cli caption "<video_id>"
       python -m src.cli process "<url>"
"""
import argparse
import sys
from pathlib import Path

from src import config
from src.answer import AnswerError, answer_question
from src.audio import AudioExtractionError, extract_audio
from src.caption import CaptioningError, caption_frames
from src.frames import FrameSamplingError, sample_frames
from src.index import build_index
from src.ingest import IngestError, download_video
from src.notegen import NoteGenError, generate_note
from src.search import search_notes
from src.transcribe import TranscriptionError, transcribe_audio


def cmd_ingest(url: str) -> dict:
    print(f"[1/3] Downloading: {url}")
    try:
        info = download_video(url)
    except IngestError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"  -> {info['video_path']}")

    audio_path = info["video_dir"] / "audio.wav"
    print("[2/3] Extracting audio ...")
    try:
        extract_audio(info["video_path"], audio_path)
    except AudioExtractionError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"  -> {audio_path}")

    frames_dir = info["video_dir"] / "frames"
    print(f"[3/3] Sampling frames every {config.FRAME_INTERVAL_SECONDS}s ...")
    try:
        frames = sample_frames(info["video_path"], frames_dir, config.FRAME_INTERVAL_SECONDS)
    except FrameSamplingError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"  -> {len(frames)} frames in {frames_dir}")

    print(f"\nIngestion done. video_id={info['id']!r} — in {info['video_dir']}")
    return info


def cmd_transcribe(video_id: str) -> dict:
    video_dir = config.DATA_DIR / video_id
    audio_path = video_dir / "audio.wav"

    if not audio_path.exists():
        print(
            f"FAILED: Audio file not found at {audio_path}. Run `ingest` first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[STT] Transcribing {audio_path.name} with Whisper ({config.WHISPER_MODEL})...")
    try:
        result = transcribe_audio(audio_path, video_dir)
    except TranscriptionError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"  -> Language detected: {result['language']} (confidence: {result['language_probability']:.0%})")
    print(f"  -> {len(result['segments'])} segments extracted")
    print(f"  -> Saved transcript to: {result['json_path']}")
    return result


def cmd_caption(video_id: str, max_frames: int | None = None) -> list:
    video_dir = config.DATA_DIR / video_id
    frames_dir = video_dir / "frames"

    if not frames_dir.exists():
        print(
            f"FAILED: Frames directory not found at {frames_dir}. Run `ingest` first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[VLM] Captioning frames using Ollama ({config.OLLAMA_VLM_MODEL})...")
    try:
        results = caption_frames(frames_dir, video_dir, max_frames=max_frames)
    except CaptioningError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"  -> Captioned {len(results)} frames")
    print(f"  -> Saved captions to: {video_dir / 'captions.json'}")
    return results


def cmd_notegen(video_id: str, source_url: str) -> Path:
    print(f"[Note] Generating Obsidian note with {config.OLLAMA_LLM_MODEL}...")
    try:
        note_path = generate_note(video_id, source_url)
    except NoteGenError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"  -> Note saved to: {note_path}")
    return note_path


def cmd_index() -> None:
    print(f"[Index] Scanning {config.NOTES_DIR} ...")
    count = build_index()
    db = config.VAULT_DIR / "index.db"
    print(f"  -> SQLite FTS5: Indexed {count} note(s) into {db}")

    try:
        from src.vector_db import build_vector_index
        chunks = build_vector_index()
        qdrant_dir = config.QDRANT_DIR
        print(f"  -> Qdrant Vector DB: Indexed {chunks} semantic chunk(s) into {qdrant_dir}")
    except Exception as e:
        print(f"  -> Warning: Qdrant indexing failed: {e}", file=sys.stderr)


def cmd_search(query: str, category: str | None = None) -> None:
    print(f"[Hybrid Search] Query: {query!r}" + (f"  (category: {category})" if category else ""))
    print("Searching via Qdrant Dense Vectors + SQLite FTS5 (Zero LLM delay)...")
    try:
        from src.search import hybrid_search
        results = hybrid_search(query, category=category)
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)

    if not results:
        print("  No matching reels found.")
        return

    for i, r in enumerate(results, 1):
        ts_str = f" @ {r['timestamp']}" if r.get('timestamp') else ""
        type_str = f"[{r.get('top_chunk_type', 'match').upper()}{ts_str}]"
        print(f"\n  [{i}] {r['title']} ({r['category']}) - Match Score: {r['similarity_score']:.1%}")
        print(f"       Top Moment: {type_str}")
        print(f"       Excerpt:    {r['highlight_text']}")
        print(f"       URL:        {r['source_url']}")
        print(f"       Note:       {r['note_path']}")


def cmd_ask(question: str, category: str | None = None) -> None:
    print(f"[Ask] \"{question}\"" + (f"  (category: {category})" if category else ""))
    print("Searching vault & thinking (Ollama LLM)...")
    try:
        res = answer_question(question, category=category)
    except AnswerError as e:
        print(f"FAILED: {e}", file=sys.stderr)
        sys.exit(1)

    print("\n" + "=" * 60)
    print(res["answer"])
    print("=" * 60)

    if res["sources"]:
        print("\nReferenced Reels:")
        for s in res["sources"]:
            print(f"  - {s['title']} ({s['category']})")
            print(f"    URL:  {s['source_url']}")
            print(f"    Note: {s['note_path']}")


def cmd_process(url: str) -> None:
    """Run full pipeline: Ingest -> Audio/Frames -> STT -> VLM Captioning -> Note -> Index."""
    print("=" * 60)
    print("ReelToReal: Full Processing Pipeline")
    print("=" * 60)

    # Stage 1: Ingestion (Download + Audio + Frames)
    info = cmd_ingest(url)
    video_id = info["id"]
    video_dir = info["video_dir"]

    # Stage 2: STT Transcription
    print("\n" + "-" * 40)
    print("Stage 2: Speech-to-Text Transcription")
    print("-" * 40)
    cmd_transcribe(video_id)

    # Stage 3: VLM Frame Captioning
    print("\n" + "-" * 40)
    print("Stage 3: Visual Frame Captioning")
    print("-" * 40)
    cmd_caption(video_id)

    # Stage 4: Note Generation
    print("\n" + "-" * 40)
    print("Stage 4: Obsidian Note Generation")
    print("-" * 40)
    cmd_notegen(video_id, url)

    # Stage 5: Update Search Index
    print("\n" + "-" * 40)
    print("Stage 5: Search Indexing")
    print("-" * 40)
    cmd_index()

    print("\n" + "=" * 60)
    print(f"ALL DONE for video_id={video_id!r}!")
    print(f"Artifacts ready in: {video_dir}")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(prog="reeltoreal")
    sub = parser.add_subparsers(dest="command", required=True)

    # Ingest
    ingest_p = sub.add_parser("ingest", help="Download a video + extract audio + sample frames")
    ingest_p.add_argument("url", help="Video URL (Instagram / YouTube / etc.)")

    # Transcribe
    transcribe_p = sub.add_parser("transcribe", help="Transcribe audio.wav for a video_id")
    transcribe_p.add_argument("video_id", help="Video ID (folder name under data/)")

    # Caption
    caption_p = sub.add_parser("caption", help="Caption frames for a video_id using VLM")
    caption_p.add_argument("video_id", help="Video ID (folder name under data/)")
    caption_p.add_argument("--max-frames", type=int, default=None, help="Max frames to caption")

    # Note generation
    notegen_p = sub.add_parser("notegen", help="Generate Obsidian note from transcript + captions")
    notegen_p.add_argument("video_id", help="Video ID (folder name under data/)")
    notegen_p.add_argument("source_url", help="Original video URL (used in note metadata)")

    # Index
    sub.add_parser("index", help="(Re)build SQLite FTS5 index from vault/Notes/*.md")

    # Search
    search_p = sub.add_parser("search", help="Keyword search across all indexed notes")
    search_p.add_argument("query", help="Search query (supports FTS5: AND, OR, NOT, \"phrase\")")
    search_p.add_argument("--category", default=None, help="Filter by category (food, travel, etc.)")

    # Ask / Answer (Natural Language Q&A / RAG)
    ask_p = sub.add_parser("ask", help="Ask a question in natural language about saved reels")
    ask_p.add_argument("question", help="Question to ask (e.g. 'What was the elephant video about?')")
    ask_p.add_argument("--category", default=None, help="Optional category filter")

    # Process (full end-to-end Day 1 + Day 2 + Day 3 + Day 4)
    process_p = sub.add_parser("process", help="Full pipeline: Ingest + Transcribe + Caption + Note + Index")
    process_p.add_argument("url", help="Video URL")

    args = parser.parse_args()
    config.ensure_dirs()

    if args.command == "ingest":
        cmd_ingest(args.url)
    elif args.command == "transcribe":
        cmd_transcribe(args.video_id)
    elif args.command == "caption":
        cmd_caption(args.video_id, max_frames=args.max_frames)
    elif args.command == "notegen":
        cmd_notegen(args.video_id, args.source_url)
    elif args.command == "index":
        cmd_index()
    elif args.command == "search":
        cmd_search(args.query, category=getattr(args, "category", None))
    elif args.command == "ask":
        cmd_ask(args.question, category=getattr(args, "category", None))
    elif args.command == "process":
        cmd_process(args.url)


if __name__ == "__main__":
    main()
