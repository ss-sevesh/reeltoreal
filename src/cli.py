"""
CLI for testing pipeline stages independently while building.

Day 1: python -m src.cli ingest "<url>"
"""
import argparse
import sys

from src import config
from src.audio import AudioExtractionError, extract_audio
from src.frames import FrameSamplingError, sample_frames
from src.ingest import IngestError, download_video


def cmd_ingest(url: str) -> None:
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

    print(f"\nDone. video_id={info['id']!r} — everything under {info['video_dir']}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="reeltoreal")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest_p = sub.add_parser("ingest", help="Download a video + extract audio + sample frames")
    ingest_p.add_argument("url")

    args = parser.parse_args()
    config.ensure_dirs()

    if args.command == "ingest":
        cmd_ingest(args.url)


if __name__ == "__main__":
    main()
