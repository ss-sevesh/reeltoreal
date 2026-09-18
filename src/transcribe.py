"""Stage 3: transcribe audio via faster-whisper with timestamps and multi-language support."""
import json
import logging
import os
import sys
from pathlib import Path

from faster_whisper import WhisperModel

from src import config

logger = logging.getLogger(__name__)


class TranscriptionError(Exception):
    pass


def _setup_cuda_dlls() -> None:
    """Add nvidia site-packages bin directories to Windows DLL search path."""
    if sys.platform == "win32":
        site_packages = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
        if site_packages.exists():
            for bin_dir in site_packages.glob("*/bin"):
                if bin_dir.is_dir():
                    try:
                        os.add_dll_directory(str(bin_dir))
                    except Exception:
                        pass
                    os.environ["PATH"] = f"{bin_dir};{os.environ.get('PATH', '')}"


# Preload DLLs on module import
_setup_cuda_dlls()


def _load_model(device: str, compute_type: str) -> WhisperModel:
    _setup_cuda_dlls()
    return WhisperModel(config.WHISPER_MODEL, device=device, compute_type=compute_type)


def transcribe_audio(
    audio_path: Path,
    out_dir: Path | None = None,
    language: str | None = None,
) -> dict:
    """
    Transcribe audio file into timestamped segments and clean text.
    
    Args:
        audio_path: Path to audio.wav (16kHz mono recommended).
        out_dir: Directory where transcript.json and transcript.txt are saved.
                 If None, saves in the audio file's parent directory.
        language: Optional 2-letter language code (e.g. 'en', 'ta').
                  If None, auto-detection is performed.

    Returns:
        dict with keys: 'language', 'duration', 'text', 'segments', 'json_path', 'txt_path'
    """
    if not audio_path.exists():
        raise TranscriptionError(
            f"Audio file not found: {audio_path}. "
            "Ensure the audio extraction step (audio.py) succeeded."
        )

    target_dir = out_dir or audio_path.parent
    target_dir.mkdir(parents=True, exist_ok=True)

    device = config.WHISPER_DEVICE
    compute_type = config.WHISPER_COMPUTE_TYPE

    try:
        model = _load_model(device, compute_type)
    except Exception as e:
        if device == "cuda":
            print(f"[Whisper] CUDA initialization failed ({e}), falling back to CPU...")
            device = "cpu"
            compute_type = "int8"
            model = _load_model("cpu", "int8")
        else:
            raise TranscriptionError(f"Failed to load Whisper model: {e}") from e

    # Perform transcription with fallback if CUDA throws during execution
    try:
        segments_gen, info = model.transcribe(
            str(audio_path),
            language=language,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        segments = []
        full_text_parts = []
        for seg in segments_gen:
            text = seg.text.strip()
            if text:
                segments.append({
                    "id": seg.id,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text,
                })
                full_text_parts.append(text)

        detected_lang = info.language
        lang_prob = info.language_probability
        duration = info.duration

    except Exception as e:
        if device == "cuda":
            print(f"[Whisper] CUDA transcription failed ({e}). Retrying on CPU...")
            try:
                cpu_model = _load_model("cpu", "int8")
                segments_gen, info = cpu_model.transcribe(
                    str(audio_path),
                    language=language,
                    beam_size=5,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500),
                )
                segments = []
                full_text_parts = []
                for seg in segments_gen:
                    text = seg.text.strip()
                    if text:
                        segments.append({
                            "id": seg.id,
                            "start": round(seg.start, 2),
                            "end": round(seg.end, 2),
                            "text": text,
                        })
                        full_text_parts.append(text)

                detected_lang = info.language
                lang_prob = info.language_probability
                duration = info.duration
            except Exception as cpu_err:
                raise TranscriptionError(f"Transcription failed on CPU as well: {cpu_err}") from cpu_err
        else:
            raise TranscriptionError(f"Transcription failed on {audio_path}: {e}") from e

    full_text = " ".join(full_text_parts)

    result = {
        "language": detected_lang,
        "language_probability": round(lang_prob, 3),
        "duration": round(duration, 2),
        "text": full_text,
        "segments": segments,
    }

    # Save outputs
    json_path = target_dir / "transcript.json"
    txt_path = target_dir / "transcript.txt"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(full_text + "\n")

    result["json_path"] = json_path
    result["txt_path"] = txt_path

    return result
