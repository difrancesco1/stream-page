import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional
from supabase import create_client, Client
from fastapi import HTTPException
from PIL import Image, ImageOps

from streampage.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET


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

    def upload_image(self, file_content: bytes, category: str, extension: str) -> str:
        """
        Upload an image to Supabase Storage.
        
        Args:
            file_content: The file bytes to upload
            category: Subfolder name (e.g., 'profile', 'cats', 'featured', 'backgrounds')
            extension: File extension including dot (e.g., '.jpg', '.png')
        
        Returns:
            Public URL of the uploaded image
        
        Raises:
            HTTPException: If upload fails
        """
        try:
            # Generate unique filename: category/uuid.ext
            filename = f"{category}/{uuid.uuid4()}{extension}"
            
            # Map extension to content type
            content_type_map = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            content_type = content_type_map.get(extension.lower(), 'image/jpeg')

            # Compress images (best-effort) before upload
            file_content = self._maybe_compress_image(file_content, extension)
            
            # Upload to Supabase Storage (use .storage.from_() for file operations)
            response = self.supabase.storage.from_(self.bucket).upload(
                path=filename,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_(self.bucket).get_public_url(filename)
            
            return public_url
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload image to storage: {str(e)}"
            )
    
    def delete_image(self, url: str) -> bool:
        """
        Delete an image from Supabase Storage.
        
        Args:
            url: The public URL of the image to delete
        
        Returns:
            True if deletion was successful
        
        Raises:
            HTTPException: If deletion fails
        """
        try:
            
            if f'/{self.bucket}/' not in url:
                return False
            
            path = url.split(f'/{self.bucket}/')[-1]
            
            # Remove from storage (note: remove() takes a list of paths)
            response = self.supabase.storage.from_(self.bucket).remove([path])
            
            return True
            
        except Exception as e:
            # Log error but don't fail the request
            print(f"Warning: Failed to delete image from storage: {str(e)}")
            return False


# Create singleton instance
storage_service = SupabaseStorageService(
    url=SUPABASE_URL,
    key=SUPABASE_SERVICE_KEY,
    bucket=SUPABASE_BUCKET
)
