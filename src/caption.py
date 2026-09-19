"""Stage 4: visual frame captioning via local VLM (Ollama moondream / smolvlm)."""
import base64
import json
import logging
import re
from pathlib import Path
from typing import Any

import requests

from src import config

logger = logging.getLogger(__name__)


class CaptioningError(Exception):
    pass


def _extract_timestamp_from_filename(filename: str) -> float:
    """Extract seconds from filename like 'frame_001_007.0s.jpg' -> 7.0."""
    match = re.search(r"_(\d+(?:\.\d+)?)s\.", filename)
    if match:
        return float(match.group(1))
    return 0.0


def caption_frame_ollama(image_path: Path, prompt: str | None = None) -> str:
    """Send a single frame to local Ollama VLM and return text caption."""
    if not image_path.exists():
        raise CaptioningError(f"Image not found: {image_path}")

    default_prompt = (
        "Provide a short, simple, and concise description of this image, noting key objects and actions. Keep it brief."
    )
    prompt_text = prompt or default_prompt

    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "model": config.OLLAMA_VLM_MODEL,
        "prompt": prompt_text,
        "images": [img_b64],
        "stream": False,
    }

    url = f"{config.OLLAMA_HOST.rstrip('/')}/api/generate"

    try:
        response = requests.post(url, json=payload, timeout=60)
    except requests.exceptions.ConnectionError as e:
        raise CaptioningError(
            f"Could not connect to Ollama at {config.OLLAMA_HOST}.\n"
            "Ensure Ollama is running: run `ollama serve` in a terminal.\n"
            f"Also ensure model is pulled: run `ollama pull {config.OLLAMA_VLM_MODEL}`."
        ) from e
    except requests.exceptions.Timeout as e:
        raise CaptioningError(f"Ollama request timed out processing {image_path.name}") from e

    if response.status_code != 200:
        error_msg = response.text
        if "not found" in error_msg.lower():
            raise CaptioningError(
                f"Ollama model {config.OLLAMA_VLM_MODEL!r} not found.\n"
                f"Pull it by running: `ollama pull {config.OLLAMA_VLM_MODEL}`."
            )
        raise CaptioningError(
            f"Ollama returned HTTP {response.status_code}: {error_msg}"
        )

    data = response.json()
    return data.get("response", "").strip()


def caption_frames(
    frames_dir: Path,
    out_dir: Path | None = None,
    max_frames: int | None = None,
) -> list[dict[str, Any]]:
    """
    Caption all sampled frames in frames_dir using Ollama VLM.
    
    Args:
        frames_dir: Directory containing frame_*.jpg
        out_dir: Directory where captions.json is saved.
        max_frames: Optional limit on number of frames to caption.
    
    Returns:
        List of dicts: [{"frame": filename, "timestamp_seconds": float, "caption": str}]
    """
    if not frames_dir.exists():
        raise CaptioningError(f"Frames directory does not exist: {frames_dir}")

    frame_files = sorted(frames_dir.glob("frame_*.jpg"))
    if not frame_files:
        raise CaptioningError(f"No frames found in {frames_dir}")

    if max_frames:
        frame_files = frame_files[:max_frames]

    target_dir = out_dir or frames_dir.parent
    target_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []

    for idx, frame_path in enumerate(frame_files, start=1):
        ts = _extract_timestamp_from_filename(frame_path.name)
        print(f"  [{idx}/{len(frame_files)}] Captioning {frame_path.name} ({ts}s)...")
        caption = caption_frame_ollama(frame_path)
        results.append({
            "frame": frame_path.name,
            "timestamp_seconds": ts,
            "caption": caption,
        })

    json_path = target_dir / "captions.json"
    txt_path = target_dir / "captions.txt"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    with open(txt_path, "w", encoding="utf-8") as f:
        for r in results:
            f.write(f"[{r['timestamp_seconds']:05.1f}s] {r['caption']}\n")

    return results
