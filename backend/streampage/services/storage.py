import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from fastapi import HTTPException
from PIL import Image, ImageOps

from streampage.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET


ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm"}
MAX_VIDEO_BYTES = 50 * 1024 * 1024


IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

VIDEO_CONTENT_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}

DOC_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class SupabaseStorageService:
    """Service for handling file uploads to Supabase Storage."""
    
    def __init__(self, url: str, key: str, bucket: str):
        """Initialize Supabase client with credentials."""
        if not url or not key:
            raise ValueError("Supabase URL and Service Key are required")
        
        self.supabase: Client = create_client(url, key)
        self.bucket = bucket
    
    @staticmethod
    def _maybe_compress_image(file_content: bytes, extension: str) -> bytes:
        """
        Best-effort image compression using Pillow.

        - Only attempts JPEG/PNG/WebP
        - Preserves the original extension/format
        - Never returns a larger payload than the original (falls back to original)
        - On any error, falls back to original
        """
        ext = (extension or "").lower()

        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            return file_content

        try:
            img = Image.open(BytesIO(file_content))
            img.load()
            img = ImageOps.exif_transpose(img)

            # Resize overly-large images to reduce upload size (conservative default).
            max_dim = 2560
            w, h = img.size
            largest = max(w, h)
            if largest > max_dim:
                scale = max_dim / float(largest)
                new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
                img = img.resize(new_size, Image.LANCZOS)

            out = BytesIO()

            if ext in {".jpg", ".jpeg"}:
                if img.mode not in {"RGB", "L"}:
                    img = img.convert("RGB")
                img.save(out, format="JPEG", quality=85, optimize=True, progressive=True)
            elif ext == ".png":
                # PNG optimization is lossless; may not always reduce size.
                img.save(out, format="PNG", optimize=True, compress_level=9)
            elif ext == ".webp":
                # WebP is lossy by default; reasonable quality/method for size reduction.
                img.save(out, format="WEBP", quality=80, method=6)

            compressed = out.getvalue()
            if compressed and len(compressed) < len(file_content):
                return compressed

            return file_content
        except Exception:
            return file_content

    def _upload(self, path: str, file_content: bytes, content_type: str) -> str:
        """Low-level helper that pushes bytes to Supabase and returns public URL."""
        try:
            self.supabase.storage.from_(self.bucket).upload(
                path=path,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            return self.supabase.storage.from_(self.bucket).get_public_url(path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage: {str(e)}",
            )

    def upload_image(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload an image to Supabase Storage.

        Args:
            file_content: The file bytes to upload
            category: Subfolder name (e.g., 'profile', 'cats', 'featured', 'backgrounds')
            extension: File extension including dot (e.g., '.jpg', '.png')

        Returns:
            Public URL of the uploaded image
        """
        ext = (extension or "").lower()
        content_type = (
            IMAGE_CONTENT_TYPES.get(ext)
            or DOC_CONTENT_TYPES.get(ext)
            or "application/octet-stream"
        )

        compressed = self._maybe_compress_image(file_content, ext)
        filename = f"{category}/{uuid.uuid4()}{extension}"
        return self._upload(filename, compressed, content_type)

    def upload_video(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload a video to Supabase Storage.

        Validates extension and size before uploading. No transcoding/compression
        is performed; bytes are pushed as-is with the matching content-type.

        Args:
            file_content: The file bytes to upload (raw video data)
            category: Subfolder name (e.g., 'shop/products')
            extension: File extension including dot (e.g., '.mp4', '.webm')

        Returns:
            Public URL of the uploaded video

        Raises:
            HTTPException: If extension is unsupported or size exceeds the cap
        """
        ext = (extension or "").lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid video type. Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}"
                ),
            )
        if len(file_content) > MAX_VIDEO_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Video exceeds the {MAX_VIDEO_BYTES // (1024 * 1024)} MB limit",
            )

        content_type = VIDEO_CONTENT_TYPES.get(ext, "application/octet-stream")
        filename = f"{category}/{uuid.uuid4()}{extension}"
        return self._upload(filename, file_content, content_type)

    def delete_object(self, url: str) -> bool:
        """
        Delete a stored object (image, video, or other) by its public URL.

        Returns True on success, False if the URL is not in this bucket or the
        delete failed (best-effort; never raises).
        """
        try:
            if f'/{self.bucket}/' not in url:
                return False

            path = url.split(f'/{self.bucket}/')[-1]
            self.supabase.storage.from_(self.bucket).remove([path])
            return True
        except Exception as e:
            print(f"Warning: Failed to delete object from storage: {str(e)}")
            return False

    # Backwards-compatible alias.
    def delete_image(self, url: str) -> bool:
        return self.delete_object(url)


# Create singleton instance
storage_service = SupabaseStorageService(
    url=SUPABASE_URL,
    key=SUPABASE_SERVICE_KEY,
    bucket=SUPABASE_BUCKET
)
