"""
Video Inspection and Automated Category Classifier.
Quickly inspects video metadata from a URL and auto-selects the category without manual input.
"""
import re
from typing import Any

import yt_dlp

from src import config

CATEGORIES = [
    "food",
    "animal",
    "travel",
    "lifestyle",
    "education",
    "entertainment",
    "sport",
    "other",
]

CATEGORY_KEYWORDS = {
    "food": [
        "recipe", "cook", "food", "dish", "chef", "eat", "curry", "dosa", "idli",
        "vada", "pongal", "breakfast", "dinner", "lunch", "restaurant", "taste",
        "delicious", "baking", "cake", "burger", "pizza", "coffee", "tea", "snack"
    ],
    "animal": [
        "elephant", "dog", "puppy", "cat", "kitten", "safari", "wildlife", "animal",
        "lion", "tiger", "bear", "zoo", "bird", "fish", "horse", "monkey", "pets"
    ],
    "travel": [
        "travel", "tour", "trip", "explore", "hiking", "mountain", "beach", "hotel",
        "resort", "vacation", "chennai", "india", "europe", "flight", "destination"
    ],
    "education": [
        "tutorial", "how to", "learn", "study", "code", "programming", "python",
        "science", "history", "facts", "tips", "tricks", "guide", "lecture"
    ],
    "sport": [
        "workout", "gym", "fitness", "football", "cricket", "basketball", "soccer",
        "training", "exercise", "match", "athlete", "running"
    ],
    "entertainment": [
        "funny", "meme", "comedy", "movie", "song", "music", "dance", "clip",
        "scene", "viral", "trend", "joke", "acting"
    ],
    "lifestyle": [
        "routine", "vlog", "fashion", "style", "skincare", "beauty", "haul",
        "morning", "day in the life", "grwm", "home", "aesthetic"
    ],
}


def classify_from_text(text: str) -> str:
    """Classify text into a category using keyword matching."""
    text_lower = text.lower()
    scores = {cat: 0 for cat in CATEGORIES}

    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                scores[cat] += 2
            elif kw in text_lower:
                scores[cat] += 1

    best_cat = max(scores, key=scores.get)
    if scores[best_cat] > 0:
        return best_cat
    return "other"


def inspect_and_classify_video(url: str) -> dict[str, Any]:
    """
    Inspect a video URL using yt-dlp metadata extraction (sub-second, no download)
    and automatically classify the category.
    """
    ydl_opts = {
        "quiet": True,
        "noplaylist": True,
        "extract_flat": True,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        # If yt-dlp fails to extract info, return generic safe defaults
        return {
            "title": "Video",
            "category": "other",
            "duration": 0.0,
            "tags": [],
            "source_url": url,
            "error": str(e),
        }

    title = info.get("title") or "Untitled Video"
    tags = info.get("tags") or []
    categories = info.get("categories") or []
    description = (info.get("description") or "")[:500]
    duration = float(info.get("duration") or 0.0)

    # Combine text for classification
    corpus = f"{title} {' '.join(tags)} {' '.join(categories)} {description}"
    auto_cat = classify_from_text(corpus)

    return {
        "title": title,
        "category": auto_cat,
        "duration": duration,
        "tags": tags[:8],
        "source_url": url,
    }
