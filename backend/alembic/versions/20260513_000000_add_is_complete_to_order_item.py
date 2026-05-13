"""add is_complete to order_item

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-05-13 00:00:00.000000

Per-line-item fulfillment flag for the admin "queue" view. The queue now
shows every ``OrderItem`` (custom card art rows are still per
``OrderCustomization`` so each drawing can be ticked off individually, but
non-custom items like stickers/tokens are one row per line item). Each
non-custom line gets its own ``is_complete`` so admins can check off
"packaged" without touching the parent order's shipping status.

Defaults to ``FALSE`` so all existing rows show as to-do.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order_item',
        sa.Column(
            'is_complete',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column('order_item', 'is_complete')
