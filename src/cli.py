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
from src.audio import AudioExtractionError, extract_audio
from src.caption import CaptioningError, caption_frames
from src.frames import FrameSamplingError, sample_frames
from src.ingest import IngestError, download_video
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


def cmd_process(url: str) -> None:
    """Run full pipeline: Ingest -> Audio/Frames -> STT -> VLM Captioning."""
    print("=" * 60)
    print("ReelToReal: Processing Pipeline")
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

    # Process (full end-to-end Day 1 + Day 2)
    process_p = sub.add_parser("process", help="Full pipeline: Ingest + Transcribe + Caption")
    process_p.add_argument("url", help="Video URL")

    args = parser.parse_args()
    config.ensure_dirs()

    if args.command == "ingest":
        cmd_ingest(args.url)
    elif args.command == "transcribe":
        cmd_transcribe(args.video_id)
    elif args.command == "caption":
        cmd_caption(args.video_id, max_frames=args.max_frames)
    elif args.command == "process":
        cmd_process(args.url)


if __name__ == "__main__":
    main()
