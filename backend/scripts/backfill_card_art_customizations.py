"""Interactive backfill of OrderCustomization rows for historical custom-card-art orders.

Before the CUSTOM product category and order_customization table existed,
custom-card-art orders captured the customer's card name and drawing
description in the freeform Order.notes field. This script walks every
custom-card-art OrderItem that does not yet have its full set of
OrderCustomization rows, displays the order's notes, and prompts you for
one (card_name, description) pair per unit of quantity.

Re-runnable: only OrderItems with fewer customizations than their quantity
are picked up, so you can quit and resume across sessions.

Usage:
    cd backend && source venv/bin/activate
    python scripts/backfill_card_art_customizations.py

Set DATABASE_URL to point at the env you want to fix (defaults to whatever
your .env / shell already configures, same as the rest of the backend).
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

# Make the backend package importable when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from streampage.db.engine import get_db_session
from streampage.db.models import (
    Order,
    OrderCustomization,
    OrderItem,
    Product,
)


CUSTOM_CARD_ART_SLUG = "custom-card-art"
DESCRIPTION_TERMINATOR = "."  # lone "." on its own line ends a multi-line description


@dataclass
class PendingItem:
    order: Order
    item: OrderItem
    existing_count: int

    @property
    def remaining(self) -> int:
        return self.item.quantity - self.existing_count


def _load_pending(session: Session) -> list[PendingItem]:
    """Return every custom-card-art OrderItem that still needs customizations.

    Sorted oldest-first so you work through history chronologically.
    """
    rows = session.execute(
        select(OrderItem)
        .join(Product, Product.id == OrderItem.product_id)
        .options(
            selectinload(OrderItem.order),
            selectinload(OrderItem.customizations),
        )
        .where(Product.slug == CUSTOM_CARD_ART_SLUG)
    ).scalars().all()

    pending: list[PendingItem] = []
    for item in rows:
        existing = len(item.customizations)
        if existing < item.quantity:
            pending.append(
                PendingItem(order=item.order, item=item, existing_count=existing)
            )

    pending.sort(key=lambda p: p.order.created_at)
    return pending


def _hr(char: str = "=", width: int = 72) -> str:
    return char * width


def _print_order_header(p: PendingItem, idx: int, total: int) -> None:
    o = p.order
    print()
    print(_hr("="))
    print(f"Order {idx} of {total}")
    print(f"  id           {o.id}")
    print(f"  placed       {o.created_at:%Y-%m-%d %H:%M}")
    print(f"  customer     {o.customer_first_name} {o.customer_last_name}")
    print(f"  email        {o.customer_email}")
    print(f"  discord      {o.customer_discord_handle or '—'}")
    print(f"  quantity     {p.item.quantity}  (existing: {p.existing_count}, "
          f"remaining: {p.remaining})")
    print(_hr("-"))
    print("notes:")
    if o.notes:
        for line in o.notes.splitlines() or [""]:
            print(f"  | {line}")
    else:
        print("  (no notes)")
    print(_hr("-"))


def _prompt_card_name(slot: int, total: int) -> str | None:
    while True:
        try:
            raw = input(f"[card {slot}/{total}] card name: ").strip()
        except EOFError:
            return None
        if not raw:
            print("  card name is required (or Ctrl-C to quit, blank to retry)")
            continue
        if len(raw) > 200:
            print(f"  card name is {len(raw)} chars (max 200), please shorten")
            continue
        return raw


def _prompt_description(slot: int, total: int) -> str | None:
    print(
        f"[card {slot}/{total}] description "
        f"(end with a single '{DESCRIPTION_TERMINATOR}' on its own line):"
    )
    lines: list[str] = []
    while True:
        try:
            line = input("  > ")
        except EOFError:
            return None
        if line.strip() == DESCRIPTION_TERMINATOR:
            break
        lines.append(line)
    text = "\n".join(lines).strip()
    if not text:
        print("  description is required, try again")
        return _prompt_description(slot, total)
    return text


def _confirm(prompt: str, default: str = "y") -> str:
    valid = {"y", "n", "s", "q"}
    suffix = " [Y/n/s=skip/q=quit] " if default == "y" else " [y/N/s=skip/q=quit] "
    while True:
        try:
            raw = input(prompt + suffix).strip().lower() or default
        except EOFError:
            return "q"
        if raw in valid:
            return raw
        print(f"  please answer one of: {sorted(valid)}")


def _process_item(session: Session, p: PendingItem, idx: int, total: int) -> str:
    """Drive the prompts for a single item. Returns 'committed', 'skipped',
    or 'quit'."""
    _print_order_header(p, idx, total)

    pending: list[tuple[str, str]] = []
    start_slot = p.existing_count + 1
    for slot in range(start_slot, p.item.quantity + 1):
        name = _prompt_card_name(slot, p.item.quantity)
        if name is None:
            return "quit"
        desc = _prompt_description(slot, p.item.quantity)
        if desc is None:
            return "quit"
        pending.append((name, desc))

    print()
    print("about to insert:")
    for i, (name, desc) in enumerate(pending, start=start_slot):
        print(f"  [{i}/{p.item.quantity}] card_name = {name!r}")
        first_line, *rest = desc.splitlines() or [""]
        print(f"           description = {first_line!r}"
              + (f"  (+{len(rest)} more line(s))" if rest else ""))

    answer = _confirm("\ncommit these rows?")
    if answer == "q":
        print("quitting without committing this order.")
        return "quit"
    if answer == "n" or answer == "s":
        print("skipped.")
        return "skipped"

    for name, desc in pending:
        session.add(
            OrderCustomization(
                order_id=p.order.id,
                order_item_id=p.item.id,
                card_name=name,
                description=desc,
            )
        )
    session.commit()
    print(f"committed {len(pending)} customization row(s) for order "
          f"{p.order.id}.")
    return "committed"


def main() -> int:
    session = get_db_session()
    try:
        pending = _load_pending(session)
        if not pending:
            print("Nothing to backfill — every custom-card-art OrderItem already "
                  "has its full set of OrderCustomization rows.")
            return 0

        print(f"Found {len(pending)} OrderItem(s) needing backfill "
              f"({sum(p.remaining for p in pending)} customization row(s) total).")

        committed = skipped = 0
        for idx, p in enumerate(pending, start=1):
            try:
                result = _process_item(session, p, idx, len(pending))
            except KeyboardInterrupt:
                print("\ninterrupted; rolling back any in-flight inserts.")
                session.rollback()
                result = "quit"

            if result == "committed":
                committed += 1
            elif result == "skipped":
                skipped += 1
            elif result == "quit":
                break

        remaining = len(pending) - committed - skipped
        print()
        print(_hr("="))
        print(f"done. committed: {committed}, skipped: {skipped}, "
              f"untouched: {remaining}")
        if remaining or skipped:
            print("re-run this script to pick up where you left off.")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
