"""Copy all media from Supabase Storage to Cloudflare R2.

Covers every column that stores an uploaded file: images, videos and form
documents. Each object is downloaded through its current public URL, uploaded
to R2 under the same key (e.g. cats/<uuid>.webp), and the database row is
pointed at the R2 URL.

Downloads go through MEDIA_CDN_URL when it is set, so objects already cached at
Cloudflare do not count against Supabase egress. Source objects are left in
Supabase so the migration can be verified first; delete the bucket afterwards.

Idempotent: rows already on R2 and external links are skipped, so re-running
only retries what failed.

Usage (from the backend directory, with the venv active):
    python scripts/migrate_media_to_r2.py --dry-run
    python scripts/migrate_media_to_r2.py

Requires the R2_* env vars.
"""

import argparse
import mimetypes
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from streampage.config import MEDIA_CDN_URL, SUPABASE_BUCKET, SUPABASE_URL
from streampage.db.engine import get_db_session
from streampage.db.enums import QuestionType
from streampage.db.models import (
    CatEntry,
    FeaturedImages,
    FormAnswer,
    FormQuestion,
    OrderCustomization,
    PageConfig,
    ProductMedia,
    User,
)
from streampage.services.r2_storage import r2_storage_service

DOWNLOAD_TIMEOUT_SECONDS = 120

# (model, attribute) pairs holding a single URL string.
SCALAR_COLUMNS = [
    (User, "profile_picture"),
    (CatEntry, "image_url"),
    (PageConfig, "background_image"),
    (OrderCustomization, "image_url"),
    (ProductMedia, "url"),
]

BUCKET_MARKER = f"/{SUPABASE_BUCKET}/"


def is_legacy(url) -> bool:
    """True for objects in the Supabase bucket, addressed directly or via the CDN."""
    return (
        isinstance(url, str)
        and BUCKET_MARKER in url
        and not r2_storage_service.owns_url(url)
    )


def key_for(url: str) -> str:
    """Object key inside the bucket, so the category layout carries over to R2."""
    return url.split(BUCKET_MARKER, 1)[1].split("?")[0]


def download_url_for(url: str) -> str:
    """Prefer the CDN host so cached objects are not billed as Supabase egress."""
    origin = SUPABASE_URL.rstrip("/")
    if MEDIA_CDN_URL and origin and url.startswith(origin):
        return MEDIA_CDN_URL + url[len(origin):]
    return url


class Migrator:
    """Copies each distinct legacy URL once and remembers the result."""

    def __init__(self, dry_run: bool):
        self.dry_run = dry_run
        self.results: dict[str, str | None] = {}
        self.failed: list[str] = []
        self.total_bytes = 0

    def move(self, url):
        """Return the R2 URL for a legacy URL, or the value unchanged."""
        if not is_legacy(url):
            return url
        if url not in self.results:
            self.results[url] = self._copy(url)
        return self.results[url] or url

    def _copy(self, url: str) -> str | None:
        key = key_for(url)
        if self.dry_run:
            print(f"  would migrate {url}\n             -> {key}")
            return r2_storage_service.public_url(key)

        source = download_url_for(url)
        try:
            response = httpx.get(
                source,
                timeout=DOWNLOAD_TIMEOUT_SECONDS,
                follow_redirects=True,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            print(f"  FAILED download {source}: {exc}")
            self.failed.append(url)
            return None

        content_type = (
            response.headers.get("content-type", "").split(";")[0].strip()
            or mimetypes.guess_type(key)[0]
            or "application/octet-stream"
        )
        try:
            new_url = r2_storage_service.upload(key, response.content, content_type)
        except Exception as exc:
            print(f"  FAILED upload {key}: {exc}")
            self.failed.append(url)
            return None

        self.total_bytes += len(response.content)
        print(f"  migrated {key} ({len(response.content) / 1_048_576:.2f} MB)")
        return new_url


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would move without downloading or writing",
    )
    args = parser.parse_args()

    if not r2_storage_service.is_configured:
        print("R2 is not configured; set the R2_* env vars first")
        return 1

    migrator = Migrator(dry_run=args.dry_run)
    session = get_db_session()
    counts: dict[str, int] = {}
    try:
        for model, attr in SCALAR_COLUMNS:
            changed = 0
            for row in session.scalars(select(model)):
                current = getattr(row, attr)
                updated = migrator.move(current)
                if updated != current:
                    setattr(row, attr, updated)
                    changed += 1
            counts[f"{model.__tablename__}.{attr}"] = changed

        # Postgres ARRAY column: reassign the list so the change is detected.
        changed = 0
        for row in session.scalars(select(FeaturedImages)):
            if not row.images:
                continue
            updated = [migrator.move(u) for u in row.images]
            if updated != list(row.images):
                row.images = updated
                changed += 1
        counts["featured_images.images"] = changed

        # JSONB column, only meaningful for file-upload answers.
        file_question_ids = set(
            session.scalars(
                select(FormQuestion.id).where(
                    FormQuestion.question_type == QuestionType.FILE_UPLOAD
                )
            )
        )
        changed = 0
        if file_question_ids:
            for row in session.scalars(
                select(FormAnswer).where(FormAnswer.question_id.in_(file_question_ids))
            ):
                current = row.answer_value
                if isinstance(current, str):
                    updated = migrator.move(current)
                elif isinstance(current, list):
                    updated = [migrator.move(u) for u in current]
                else:
                    continue
                if updated != current:
                    row.answer_value = updated
                    flag_modified(row, "answer_value")
                    changed += 1
        counts["form_answer.answer_value"] = changed

        total = sum(counts.values())
        width = max(len(k) for k in counts)
        print()
        for label, count in counts.items():
            print(f"  {label.ljust(width)}  {count}")
        print(f"\n  {'rows'.ljust(width)}  {total}")
        print(f"  {'objects'.ljust(width)}  {len(migrator.results)}")

        if args.dry_run:
            session.rollback()
            print("\nDry run: no changes written.")
        elif total:
            session.commit()
            print(
                f"\nCommitted {total} row updates, "
                f"{migrator.total_bytes / 1_048_576:.1f} MB copied to R2."
            )
            print("Source objects left in Supabase; delete them once verified.")
        else:
            print("\nNothing to update.")

        if migrator.failed:
            print(f"\n{len(migrator.failed)} object(s) failed and were left as-is:")
            for url in migrator.failed:
                print(f"  {url}")
            print("Re-run the script to retry them.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return 1 if migrator.failed else 0


if __name__ == "__main__":
    sys.exit(main())
