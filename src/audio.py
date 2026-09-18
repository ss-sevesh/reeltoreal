"""Stage 2: extract 16kHz mono WAV audio from a downloaded video, via ffmpeg."""
import subprocess
from pathlib import Path


class AudioExtractionError(Exception):
    pass


def extract_audio(video_path: Path, out_path: Path) -> Path:
    """Extract 16kHz mono audio (the format faster-whisper wants) to out_path."""
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-ac", "1",       # mono
        "-ar", "16000",   # 16kHz
        "-vn",             # no video stream
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise AudioExtractionError(
            "ffmpeg failed to extract audio.\n"
            f"Command: {' '.join(cmd)}\n"
            f"stderr (tail):\n{result.stderr[-1500:]}\n"
            "Check ffmpeg is installed and on PATH: run `ffmpeg -version` in your terminal."
        )

    return out_path
