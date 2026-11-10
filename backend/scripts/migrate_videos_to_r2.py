"""Copy product videos from Supabase Storage to Cloudflare R2.

Cloudflare's CDN terms do not permit serving video from a third-party origin on
the free plan, so video moves into R2 (no egress fees) while images stay in
Supabase behind the caching Worker.

Downloads each video through its current public URL, re-uploads it to R2 under
the same key, and points the database row at the R2 URL. Source objects are
left in Supabase so the migration can be reverted; delete them once the new
URLs are verified.

Usage (from the backend directory, with the venv active):
    python scripts/migrate_videos_to_r2.py --dry-run
    python scripts/migrate_videos_to_r2.py

Requires the R2_* env vars. Note that downloading counts against Supabase
egress, so run it when the project is not quota-restricted.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from sqlalchemy import select

from streampage.config import SUPABASE_BUCKET
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductMediaType
from streampage.db.models import ProductMedia
from streampage.services.r2_storage import r2_storage_service

DOWNLOAD_TIMEOUT_SECONDS = 120


def key_for(url: str) -> str:
    """
    Derive the R2 object key from a Supabase public URL.

    Keeps the existing category layout (e.g. shop/products/<uuid>.webm) so keys
    stay predictable across both backends.
    """
    marker = f"/{SUPABASE_BUCKET}/"
    if marker in url:
        return url.split(marker, 1)[1].split("?")[0]
    # Fall back to the trailing path segments for any unexpected URL shape.
    return "/".join(url.split("?")[0].rsplit("/", 2)[-2:])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would move without downloading or writing",
    )
    args = parser.parse_args()

    if not args.dry_run and not r2_storage_service.is_configured:
        print("R2 is not configured; set the R2_* env vars first")
        return 1

    session = get_db_session()
    try:
        rows = list(
            session.scalars(
                select(ProductMedia).where(
                    ProductMedia.media_type == ProductMediaType.VIDEO
                )
            )
        )
        pending = [r for r in rows if not r2_storage_service.owns_url(r.url)]

        print(f"{len(rows)} video row(s), {len(pending)} to migrate\n")
        if not pending:
            print("Nothing to do.")
            return 0

        migrated = 0
        total_bytes = 0
        for row in pending:
            key = key_for(row.url)
            if args.dry_run:
                print(f"  would migrate {row.url}\n             -> {key}")
                continue

            try:
                response = httpx.get(
                    row.url,
                    timeout=DOWNLOAD_TIMEOUT_SECONDS,
                    follow_redirects=True,
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                print(f"  FAILED download {row.url}: {exc}")
                continue

            content = response.content
            new_url = r2_storage_service.upload(key, content, "video/webm")
            row.url = new_url
            migrated += 1
            total_bytes += len(content)
            print(f"  migrated {key} ({len(content) / 1_048_576:.1f} MB)")

        if args.dry_run:
            session.rollback()
            print("\nDry run: no changes written.")
        elif migrated:
            session.commit()
            print(
                f"\nMigrated {migrated} video(s), "
                f"{total_bytes / 1_048_576:.1f} MB of Supabase egress used."
            )
            print("Source objects left in Supabase; delete them once verified.")
        else:
            print("\nNo videos migrated.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
