"""Stage 1: download a video by URL (Instagram Reel / YouTube Short / etc.) via yt-dlp."""
import os
from pathlib import Path

import yt_dlp

from src import config


class IngestError(Exception):
    pass


def download_video(url: str) -> dict:
    """Download `url` into data/<video_id>/raw/. Returns metadata + resolved paths."""
    config.ensure_dirs()

    tmp_template = str(config.DATA_DIR / "%(id)s" / "raw" / "%(id)s.%(ext)s")
    ydl_opts = {
        "outtmpl": tmp_template,
        "format": "bestvideo*+bestaudio/best",
        "merge_output_format": "mp4",
        "quiet": True,
        "noplaylist": True,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }

    cookies_browser = os.getenv("YTDLP_COOKIES_FROM_BROWSER")
    if cookies_browser:
        ydl_opts["cookiesfrombrowser"] = (cookies_browser,)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise IngestError(
            f"yt-dlp failed to download {url!r}: {e}\n"
            "Common fixes:\n"
            "  - Instagram often needs auth cookies: rerun with "
            "`yt-dlp --cookies-from-browser chrome <url>` to confirm it's a cookie issue.\n"
            "  - As a fallback, manually download the file and drop it in "
            "data/<id>/raw/<id>.mp4, then skip straight to audio/frame extraction."
        ) from e

    video_id = info["id"]
    video_dir = config.DATA_DIR / video_id
    raw_dir = video_dir / "raw"

    candidates = list(raw_dir.glob(f"{video_id}.*"))
    if not candidates:
        raise IngestError(
            f"yt-dlp reported success but no file was found in {raw_dir} — "
            "check disk space and yt-dlp's own output above."
        )

    return {
        "id": video_id,
        "title": info.get("title", video_id),
        "source_url": url,
        "video_dir": video_dir,
        "video_path": candidates[0],
    }
