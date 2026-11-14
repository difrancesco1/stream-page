"""Rewrite stored media URLs from one origin to another.

Existing rows hold absolute Supabase URLs, which bypass the Cloudflare cache
entirely. This swaps just the origin and leaves the path untouched, so the same
objects are served through the CDN instead.

Idempotent and reversible: re-running is a no-op once rows are migrated, and
passing --from/--to in reverse undoes it.

Usage (from the backend directory, with the venv active):
    python scripts/rewrite_media_urls.py --dry-run
    python scripts/rewrite_media_urls.py

Superseded by migrate_media_to_r2.py, which moves the objects themselves off
Supabase. Video rows are intentionally skipped.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from streampage.config import MEDIA_CDN_URL, SUPABASE_URL
from streampage.db.engine import get_db_session
from streampage.db.enums import ProductMediaType, QuestionType
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

# (model, attribute) pairs holding a single URL string.
SCALAR_COLUMNS = [
    (User, "profile_picture"),
    (CatEntry, "image_url"),
    (PageConfig, "background_image"),
    (OrderCustomization, "image_url"),
]


def rewrite(value: str | None, old: str, new: str) -> str | None:
    """Swap the origin prefix, returning the value unchanged if it does not match."""
    if isinstance(value, str) and value.startswith(old):
        return new + value[len(old):]
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--from",
        dest="old",
        default=SUPABASE_URL.rstrip("/"),
        help="Origin to replace (default: SUPABASE_URL)",
    )
    parser.add_argument(
        "--to",
        dest="new",
        default=MEDIA_CDN_URL,
        help="Replacement origin (default: MEDIA_CDN_URL)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing",
    )
    args = parser.parse_args()

    old, new = args.old.rstrip("/"), args.new.rstrip("/")
    if not old or not new:
        print("Both --from and --to are required (or set SUPABASE_URL and MEDIA_CDN_URL)")
        return 1
    if old == new:
        print("--from and --to are identical; nothing to do")
        return 1

    print(f"Rewriting {old} -> {new}{' (dry run)' if args.dry_run else ''}\n")

    session = get_db_session()
    counts: dict[str, int] = {}
    try:
        for model, attr in SCALAR_COLUMNS:
            changed = 0
            for row in session.scalars(select(model)):
                current = getattr(row, attr)
                updated = rewrite(current, old, new)
                if updated != current:
                    setattr(row, attr, updated)
                    changed += 1
            counts[f"{model.__tablename__}.{attr}"] = changed

        # Only images live in Supabase; videos are handled by the R2 migration.
        changed = 0
        for row in session.scalars(
            select(ProductMedia).where(ProductMedia.media_type == ProductMediaType.IMAGE)
        ):
            updated = rewrite(row.url, old, new)
            if updated != row.url:
                row.url = updated
                changed += 1
        counts["product_media.url (images)"] = changed

        # Postgres ARRAY column: reassign the list so the change is detected.
        changed = 0
        for row in session.scalars(select(FeaturedImages)):
            if not row.images:
                continue
            updated = [rewrite(u, old, new) for u in row.images]
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
                    updated = rewrite(current, old, new)
                elif isinstance(current, list):
                    updated = [rewrite(u, old, new) for u in current]
                else:
                    continue
                if updated != current:
                    row.answer_value = updated
                    flag_modified(row, "answer_value")
                    changed += 1
        counts["form_answer.answer_value"] = changed

        total = sum(counts.values())
        width = max(len(k) for k in counts)
        for label, count in counts.items():
            print(f"  {label.ljust(width)}  {count}")
        print(f"\n  {'total'.ljust(width)}  {total}")

        if args.dry_run:
            session.rollback()
            print("\nDry run: no changes written.")
        elif total:
            session.commit()
            print(f"\nCommitted {total} row updates.")
        else:
            print("\nNothing to update.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
