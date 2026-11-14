"""Cloudflare R2 storage, used for all uploaded media.

R2 has no egress fees and serves directly from Cloudflare (including video,
which Cloudflare's CDN terms do not allow from a third-party origin).

R2 speaks the S3 API, so this wraps boto3. The R2_* env vars are required for
uploads in every environment; use a separate bucket for local development.
Without them the app still starts, but uploads fail with HTTP 500.
"""

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from streampage.config import (
    R2_ACCESS_KEY_ID,
    R2_ACCOUNT_ID,
    R2_BUCKET,
    R2_PUBLIC_BASE_URL,
    R2_SECRET_ACCESS_KEY,
)

# Keys are UUID-based and never rewritten, so responses are safe to treat as
# immutable for a year.
CACHE_CONTROL = "public, max-age=31536000, immutable"


class R2StorageService:
    """Service for handling file uploads to Cloudflare R2."""

    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket: str,
        public_base_url: str,
    ):
        self.account_id = account_id
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.bucket = bucket
        self.public_base_url = public_base_url
        self._client = None

    @property
    def is_configured(self) -> bool:
        """True when every R2 setting is present, so uploads can be routed here."""
        return all(
            (
                self.account_id,
                self.access_key_id,
                self.secret_access_key,
                self.bucket,
                self.public_base_url,
            )
        )

    @property
    def client(self):
        """Lazily build the S3 client so an unconfigured service can still exist."""
        if self._client is None:
            if not self.is_configured:
                raise HTTPException(
                    status_code=500,
                    detail="Cloudflare R2 is not configured",
                )
            self._client = boto3.client(
                "s3",
                endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name="auto",
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"},
                ),
            )
        return self._client

    def public_url(self, key: str) -> str:
        """Public URL for an object key, served via the bucket's custom domain."""
        return f"{self.public_base_url}/{key.lstrip('/')}"

    def owns_url(self, url: str | None) -> bool:
        """True if this URL is served by our R2 custom domain."""
        if not url or not self.public_base_url:
            return False
        return url.startswith(f"{self.public_base_url}/")

    def key_from_url(self, url: str) -> str | None:
        """Extract the object key from one of our public URLs, or None."""
        if not self.owns_url(url):
            return None
        return url[len(self.public_base_url) + 1:].split("?")[0]

    def upload(self, key: str, file_content: bytes, content_type: str) -> str:
        """Upload bytes under the given key and return the public URL."""
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                CacheControl=CACHE_CONTROL,
            )
        except (BotoCoreError, ClientError) as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to R2: {str(e)}",
            )
        return self.public_url(key)

    def delete(self, url_or_key: str) -> bool:
        """
        Delete an object by public URL or raw key.

        Returns True on success, False if the delete failed (best-effort; never
        raises, matching StorageService.delete_object).
        """
        key = self.key_from_url(url_or_key) or url_or_key
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            print(f"Warning: Failed to delete object from R2: {str(e)}")
            return False


# Create singleton instance
r2_storage_service = R2StorageService(
    account_id=R2_ACCOUNT_ID,
    access_key_id=R2_ACCESS_KEY_ID,
    secret_access_key=R2_SECRET_ACCESS_KEY,
    bucket=R2_BUCKET,
    public_base_url=R2_PUBLIC_BASE_URL,
)
