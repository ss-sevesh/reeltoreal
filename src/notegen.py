"""
Stage 5: Note generation — fuse transcript + captions into an Obsidian Markdown note.

Uses qwen2.5:1.5b (via Ollama) to extract structured metadata (title, category,
entities, tags, summary) and writes a YAML-frontmatted .md into vault/Notes/.
"""
import json
import re
from datetime import datetime
from pathlib import Path

import requests

from src import config


class NoteGenError(Exception):
    pass


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _ollama_generate(prompt: str, system: str | None = None) -> str:
    """Call qwen2.5 on Ollama and return the response text. Raises NoteGenError on failure."""
    payload = {
        "model": config.OLLAMA_LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": 512},
    }
    if system:
        payload["system"] = system

    url = f"{config.OLLAMA_HOST.rstrip('/')}/api/generate"
    try:
        resp = requests.post(url, json=payload, timeout=120)
    except requests.exceptions.ConnectionError as e:
        raise NoteGenError(
            f"Cannot reach Ollama at {config.OLLAMA_HOST}. "
            "Run `ollama serve` and ensure `qwen2.5:1.5b` is pulled."
        ) from e
    except requests.exceptions.Timeout as e:
        raise NoteGenError("Ollama request timed out during note generation.") from e

    if resp.status_code != 200:
        raise NoteGenError(f"Ollama returned HTTP {resp.status_code}: {resp.text[:400]}")

    return resp.json().get("response", "").strip()


def _extract_metadata(transcript_text: str, captions_text: str, source_url: str) -> dict:
    """Ask qwen2.5 to extract structured metadata as JSON."""
    system = (
        "You are a metadata extractor for short-form social videos. "
        "You ALWAYS respond with valid JSON only — no markdown fences, no explanation."
    )
    prompt = f"""Given this video transcript and visual descriptions, extract structured metadata.

TRANSCRIPT:
{transcript_text}

VISUAL DESCRIPTIONS:
{captions_text}

SOURCE URL: {source_url}

Respond with this exact JSON structure (fill every field, use empty list [] if unknown):
{{
  "title": "<concise descriptive title, max 8 words>",
  "category": "<one of: food, travel, lifestyle, education, animal, entertainment, sport, other>",
  "summary": "<2-3 sentence summary of what this video shows and its key takeaway>",
  "entities": {{
    "places": ["<place names mentioned or visible>"],
    "people": ["<names of people if mentioned>"],
    "objects": ["<key objects, animals, food items, or products featured>"],
    "actions": ["<main activities or actions happening>"]
  }},
  "tags": ["<5-8 relevant hashtag-style tags, lowercase, no spaces>"]
}}"""

    raw = _ollama_generate(prompt, system=system)

    # Strip any accidental markdown code fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        metadata = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: try to extract JSON object from the response
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                metadata = json.loads(match.group())
            except json.JSONDecodeError:
                metadata = {}
        else:
            metadata = {}

    # Ensure required keys exist with safe defaults
    metadata.setdefault("title", "Untitled Video")
    metadata.setdefault("category", "other")
    metadata.setdefault("summary", "No summary available.")
    metadata.setdefault("entities", {"places": [], "people": [], "objects": [], "actions": []})
    metadata.setdefault("tags", [])

    return metadata


def _build_yaml_frontmatter(
    metadata: dict,
    video_id: str,
    source_url: str,
    language: str,
    duration: float,
) -> str:
    """Build YAML frontmatter block for the Obsidian note."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    entities = metadata.get("entities", {})
    tags_yaml = "\n".join(f'  - "{t}"' for t in metadata.get("tags", []))
    places_yaml = "\n".join(f'  - "{p}"' for p in entities.get("places", []))
    objects_yaml = "\n".join(f'  - "{o}"' for o in entities.get("objects", []))
    actions_yaml = "\n".join(f'  - "{a}"' for a in entities.get("actions", []))

    return f"""---
title: "{metadata['title']}"
category: {metadata['category']}
video_id: {video_id}
source_url: "{source_url}"
date: {date_str}
language: {language}
duration_seconds: {duration}
tags:
{tags_yaml if tags_yaml else '  []'}
entities:
  places:
{places_yaml if places_yaml else '    []'}
  objects:
{objects_yaml if objects_yaml else '    []'}
  actions:
{actions_yaml if actions_yaml else '    []'}
---"""


def _build_note_body(
    metadata: dict,
    transcript: dict,
    captions: list[dict],
    source_url: str,
) -> str:
    """Build the Markdown body of the note."""
    segments = transcript.get("segments", [])
    transcript_md = "\n".join(
        f"> `[{s['start']:.1f}s → {s['end']:.1f}s]` {s['text']}" for s in segments
    ) or transcript.get("text", "_No speech detected._")

    captions_md = "\n".join(
        f"- **[{c['timestamp_seconds']:.0f}s]** {c['caption']}" for c in captions
    ) or "_No frames captioned._"

    return f"""
# {metadata['title']}

## Summary

{metadata['summary']}

---

## Transcript

{transcript_md}

---

## Visual Scene Descriptions

{captions_md}

---

## Source

- **URL**: [{source_url}]({source_url})
- **Video ID**: `{transcript.get('language', 'unknown').upper()}`
- **Category**: {metadata['category'].title()}
"""


# ---------------------------------------------------------------------------
# Main public API
# ---------------------------------------------------------------------------

def generate_note(
    video_id: str,
    source_url: str,
    data_dir: Path | None = None,
    notes_dir: Path | None = None,
) -> Path:
    """
    Generate an Obsidian Markdown note from transcript + captions for video_id.

    Args:
        video_id: Folder name under data/ (e.g. 'jNQXAC9IVRw').
        source_url: Original video URL.
        data_dir: Override for config.DATA_DIR.
        notes_dir: Override for config.NOTES_DIR.

    Returns:
        Path to the generated .md file.
    """
    vdir = (data_dir or config.DATA_DIR) / video_id
    out_dir = notes_dir or config.NOTES_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- Load transcript ---
    transcript_path = vdir / "transcript.json"
    if not transcript_path.exists():
        raise NoteGenError(
            f"transcript.json not found at {transcript_path}. "
            "Run `python -m src.cli transcribe {video_id}` first."
        )
    with open(transcript_path, encoding="utf-8") as f:
        transcript = json.load(f)

    # --- Load captions ---
    captions_path = vdir / "captions.json"
    captions: list[dict] = []
    if captions_path.exists():
        with open(captions_path, encoding="utf-8") as f:
            captions = json.load(f)
    else:
        print("  [!] captions.json not found — note will be transcript-only.")

    transcript_text = transcript.get("text", "")
    captions_text = "\n".join(
        f"[{c['timestamp_seconds']}s] {c['caption']}" for c in captions
    )

    # --- Extract metadata with qwen2.5 ---
    print(f"  [LLM] Extracting metadata with {config.OLLAMA_LLM_MODEL}...")
    metadata = _extract_metadata(transcript_text, captions_text, source_url)

    # --- Build note ---
    frontmatter = _build_yaml_frontmatter(
        metadata,
        video_id=video_id,
        source_url=source_url,
        language=transcript.get("language", "unknown"),
        duration=transcript.get("duration", 0.0),
    )
    body = _build_note_body(metadata, transcript, captions, source_url)
    note_content = frontmatter + "\n" + body

    # --- Save note ---
    safe_title = re.sub(r'[<>:"/\\|?*]', "", metadata["title"]).strip()[:60]
    note_filename = f"{video_id}_{safe_title}.md"
    note_path = out_dir / note_filename

    with open(note_path, "w", encoding="utf-8") as f:
        f.write(note_content)

    # --- Save metadata.json to data dir for later indexing ---
    meta_path = vdir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {**metadata, "video_id": video_id, "source_url": source_url,
             "language": transcript.get("language"), "duration": transcript.get("duration")},
            f, indent=2, ensure_ascii=False
        )

    return note_path
