"""
Media transcoding helpers.

Goal: every stored media file is in its lightest viable format so the project
stays within Supabase's free-tier storage and egress limits. All images are
converted to WebP and all videos to WebM (VP9 + Opus).

Design contract: these functions convert or raise. There is intentionally no
"fall back to the original bytes" path -- uploading the heavy original would
defeat the cost goal, so callers should reject the upload when conversion fails.
"""

import logging
import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


if not any(
    isinstance(h, logging.FileHandler)
    and getattr(h, "baseFilename", "").endswith("app.log")
    for h in logger.handlers
):
    _file_handler = logging.FileHandler("app.log", mode="a")
    _file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(_file_handler)

# Tuning knobs (kept here so they are easy to find/adjust)
WEBP_QUALITY = 80
WEBP_METHOD = 6
MAX_IMAGE_DIMENSION = 1920
VP9_CRF = 34
_FFMPEG_TIMEOUT_SECONDS = 300


class MediaConversionError(Exception):
    """Raised when media could not be converted to the target format."""


def _ffmpeg_path() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise MediaConversionError("ffmpeg is not available on this host")
    return path


def _run_ffmpeg(args: list[str]) -> None:
    """Run ffmpeg with the given args, raising MediaConversionError on failure."""
    try:
        proc = subprocess.run(
            [_ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error", *args],
            capture_output=True,
            timeout=_FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise MediaConversionError("ffmpeg timed out during conversion") from exc
    except Exception as exc:  # noqa: BLE001 - surface any spawn failure uniformly
        raise MediaConversionError(f"ffmpeg failed to start: {exc}") from exc

    if proc.returncode != 0:
        stderr = (proc.stderr or b"").decode("utf-8", "replace").strip()
        raise MediaConversionError(f"ffmpeg exited with {proc.returncode}: {stderr}")


def _is_animated(img: Image.Image) -> bool:
    if img.format == "MPO":
       return False 
    return getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1


def _animated_image_to_webp(file_content: bytes) -> bytes:
    """Convert an animated image (e.g. GIF) to an animated WebP.

    Prefers ffmpeg (better compression); falls back to Pillow's animated WebP
    writer if ffmpeg is unavailable.
    """
    try:
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "in"
            dst = Path(tmp) / "out.webp"
            src.write_bytes(file_content)
            _run_ffmpeg([
                "-i", str(src),
                "-c:v", "libwebp",
                "-lossless", "0",
                "-q:v", str(WEBP_QUALITY),
                "-loop", "0",
                "-an",
                str(dst),
            ])
            data = dst.read_bytes()
        if not data:
            raise MediaConversionError("ffmpeg produced an empty WebP")
        return data
    except MediaConversionError:
        # Fallback: Pillow animated WebP (used when ffmpeg is missing locally)
        try:
            img = Image.open(BytesIO(file_content))
            frames = []
            durations = []
            for frame in range(getattr(img, "n_frames", 1)):
                img.seek(frame)
                frames.append(img.convert("RGBA"))
                durations.append(img.info.get("duration", 100))
            out = BytesIO()
            frames[0].save(
                out,
                format="WEBP",
                save_all=True,
                append_images=frames[1:],
                duration=durations,
                loop=0,
                quality=WEBP_QUALITY,
                method=WEBP_METHOD,
            )
            data = out.getvalue()
            if not data:
                raise MediaConversionError("Pillow produced an empty animated WebP")
            return data
        except MediaConversionError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise MediaConversionError(
                f"Could not convert animated image to WebP: {exc}"
            ) from exc


def _static_image_to_webp(file_content: bytes) -> bytes:
    """Convert a single-frame image to WebP, downscaling very large images."""
    try:
        img = Image.open(BytesIO(file_content))
        img.load()
        img = ImageOps.exif_transpose(img)

        w, h = img.size
        largest = max(w, h)
        if largest > MAX_IMAGE_DIMENSION:
            scale = MAX_IMAGE_DIMENSION / float(largest)
            img = img.resize(
                (max(1, int(round(w * scale))), max(1, int(round(h * scale)))),
                Image.LANCZOS,
            )

        if img.mode not in {"RGB", "RGBA", "L"}:
            img = img.convert("RGBA")

        out = BytesIO()
        img.save(out, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        data = out.getvalue()
        if not data:
            raise MediaConversionError("Pillow produced an empty WebP")
        return data
    except MediaConversionError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise MediaConversionError(f"Could not convert image to WebP: {exc}") from exc


def image_to_webp(file_content: bytes) -> bytes:
    """Convert any supported image to WebP.

    Animated inputs become animated WebP; everything else becomes a single-frame
    WebP (downscaled to a max dimension). Raises MediaConversionError on failure.
    """
    try:
        with Image.open(BytesIO(file_content)) as probe:
            animated = _is_animated(probe)
    except Exception as exc:  # noqa: BLE001
        raise MediaConversionError(f"Unreadable image data: {exc}") from exc

    if animated:
        return _animated_image_to_webp(file_content)
    return _static_image_to_webp(file_content)


def video_to_webm(file_content: bytes) -> bytes:
    """Convert a video to WebM (VP9 video + Opus audio).

    Raises MediaConversionError on any ffmpeg failure or empty output.
    """
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "in"
        dst = Path(tmp) / "out.webm"
        src.write_bytes(file_content)
        _run_ffmpeg([
            "-i", str(src),
            "-c:v", "libvpx-vp9",
            "-crf", str(VP9_CRF),
            "-b:v", "0",
            "-row-mt", "1",
            "-c:a", "libopus",
            str(dst),
        ])
        data = dst.read_bytes()
    if not data:
        raise MediaConversionError("ffmpeg produced an empty WebM")
    return data
