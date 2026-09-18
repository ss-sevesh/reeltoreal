"""Stage 2b: sample one frame every N seconds from a video, via OpenCV."""
from pathlib import Path

import cv2


class FrameSamplingError(Exception):
    pass


def sample_frames(video_path: Path, out_dir: Path, interval_seconds: int) -> list[Path]:
    """Save one JPEG frame every `interval_seconds` into out_dir. Returns saved paths."""
    out_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FrameSamplingError(
            f"OpenCV could not open video: {video_path}. "
            "The file may be corrupt or in a codec OpenCV can't read."
        )

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_stride = max(int(fps * interval_seconds), 1)

    saved_paths: list[Path] = []
    frame_idx = 0
    saved_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_stride == 0:
            ts_seconds = frame_idx / fps
            out_path = out_dir / f"frame_{saved_idx:03d}_{ts_seconds:05.1f}s.jpg"
            cv2.imwrite(str(out_path), frame)
            saved_paths.append(out_path)
            saved_idx += 1
        frame_idx += 1

    cap.release()

    if not saved_paths:
        raise FrameSamplingError(
            f"No frames extracted from {video_path} — file may be empty or unreadable."
        )

    return saved_paths
