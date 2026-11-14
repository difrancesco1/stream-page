import uuid
from fastapi import HTTPException

from streampage.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    SUPABASE_BUCKET,
)
from streampage.services.media_conversion import (
    MediaConversionError,
    image_to_webp,
    video_to_webm,
)
from streampage.services.r2_storage import r2_storage_service


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


class StorageService:
    """
    Service for handling media uploads.

    All new objects are stored in Cloudflare R2. Supabase is only used, when
    configured, to delete legacy objects whose URLs still point at the old
    Supabase bucket (directly or through the CDN host).
    """

    def __init__(self, supabase_url: str, supabase_key: str, supabase_bucket: str):
        self._supabase_url = supabase_url
        self._supabase_key = supabase_key
        self._supabase_bucket = supabase_bucket
        self._supabase = None

    def _legacy_supabase(self):
        """Lazily build the Supabase client, or None when it is not configured."""
        if self._supabase is None and self._supabase_url and self._supabase_key:
            from supabase import create_client

            self._supabase = create_client(self._supabase_url, self._supabase_key)
        return self._supabase

    def upload_image(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload an image (or form document) to R2.

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
            return r2_storage_service.upload(filename, converted, "image/webp")

        # Non-image documents (PDF/DOC/DOCX) are stored unchanged.
        content_type = DOC_CONTENT_TYPES.get(ext, "application/octet-stream")
        filename = f"{category}/{uuid.uuid4()}{extension}"
        return r2_storage_service.upload(filename, file_content, content_type)

    def upload_video(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload a video to R2.

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
        return r2_storage_service.upload(filename, converted, "video/webm")

    def delete_object(self, url: str) -> bool:
        """
        Delete a stored object (image, video, or other) by its public URL.

        Dispatches to R2 for objects stored there, otherwise treats the URL as
        a legacy Supabase object. Returns True on success, False if the URL is
        not ours or the delete failed (best-effort; never raises).
        """
        if r2_storage_service.owns_url(url):
            return r2_storage_service.delete(url)

        try:
            if f'/{self._supabase_bucket}/' not in url:
                return False

            supabase = self._legacy_supabase()
            if supabase is None:
                print(f"Warning: Supabase is not configured; leaving legacy object {url}")
                return False

            path = url.split(f'/{self._supabase_bucket}/')[-1].split("?")[0]
            supabase.storage.from_(self._supabase_bucket).remove([path])
            return True
        except Exception as e:
            print(f"Warning: Failed to delete object from storage: {str(e)}")
            return False

    # Backwards-compatible alias.
    def delete_image(self, url: str) -> bool:
        return self.delete_object(url)


# Create singleton instance
storage_service = StorageService(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_SERVICE_KEY,
    supabase_bucket=SUPABASE_BUCKET,
)


def is_managed_media_url(url: str | None) -> bool:
    """
    True if the URL points at storage we own, so it is safe to delete.

    Covers anything in R2, plus legacy objects in the Supabase bucket whether
    addressed directly or through the CDN host. Call this before delete_object
    so user-supplied external links are never touched.
    """
    if not url:
        return False
    if r2_storage_service.owns_url(url):
        return True
    return f"/{SUPABASE_BUCKET}/" in url
