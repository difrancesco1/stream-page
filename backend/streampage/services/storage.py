import uuid
from pathlib import Path
from supabase import create_client, Client
from fastapi import HTTPException

from streampage.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET
from streampage.services.media_conversion import (
    MediaConversionError,
    image_to_webp,
    video_to_webm,
)


ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm"}
MAX_VIDEO_BYTES = 50 * 1024 * 1024

# Image inputs that we transcode to WebP before storing. GIF is included even
# though it is not in ALLOWED_IMAGE_EXTENSIONS because several endpoints accept
# GIF uploads and route them through upload_image.
CONVERTIBLE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


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
    
    _LONG_CACHE_CONTROL_SECONDS = "31536000"

    def _upload(self, path: str, file_content: bytes, content_type: str) -> str:
        """Low-level helper that pushes bytes to Supabase and returns public URL."""
        try:
            self.supabase.storage.from_(self.bucket).upload(
                path=path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "upsert": "true",
                    "cache-control": self._LONG_CACHE_CONTROL_SECONDS,
                },
            )
            return self.supabase.storage.from_(self.bucket).get_public_url(path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage: {str(e)}",
            )

    def upload_image(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload an image (or form document) to Supabase Storage.

        Images are transcoded to WebP to minimize storage/egress; conversion is
        mandatory, so a failure raises HTTP 422 and nothing is stored. Non-image
        documents (PDF/DOC/DOCX) are stored as-is.

        Args:
            file_content: The file bytes to upload
            category: Subfolder name (e.g., 'profile', 'cats', 'featured', 'backgrounds')
            extension: File extension including dot (e.g., '.jpg', '.png', '.gif')

        Returns:
            Public URL of the uploaded object

        Raises:
            HTTPException: 422 if an image cannot be converted to WebP
        """
        ext = (extension or "").lower()

        if ext in CONVERTIBLE_IMAGE_EXTENSIONS:
            try:
                converted = image_to_webp(file_content)
            except MediaConversionError as exc:
                raise HTTPException(
                    status_code=422,
                    detail=f"Could not convert image to WebP; upload rejected: {exc}",
                )
            filename = f"{category}/{uuid.uuid4()}.webp"
            return self._upload(filename, converted, "image/webp")

        # Non-image documents (PDF/DOC/DOCX) are stored unchanged.
        content_type = DOC_CONTENT_TYPES.get(ext, "application/octet-stream")
        filename = f"{category}/{uuid.uuid4()}{extension}"
        return self._upload(filename, file_content, content_type)

    def upload_video(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload a video to Supabase Storage.

        Validates extension and size, then transcodes to WebM (VP9 + Opus) to
        minimize storage/egress. Conversion is mandatory: a failure raises HTTP
        422 and nothing is stored.

        Args:
            file_content: The file bytes to upload (raw video data)
            category: Subfolder name (e.g., 'shop/products')
            extension: File extension including dot (e.g., '.mp4', '.webm')

        Returns:
            Public URL of the uploaded WebM video

        Raises:
            HTTPException: If extension/size is invalid, or conversion fails
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

        try:
            converted = video_to_webm(file_content)
        except MediaConversionError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Could not convert video to WebM; upload rejected: {exc}",
            )

        filename = f"{category}/{uuid.uuid4()}.webm"
        return self._upload(filename, converted, "video/webm")

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
