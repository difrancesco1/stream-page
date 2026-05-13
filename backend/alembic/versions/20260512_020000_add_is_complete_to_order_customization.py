"""add is_complete and image_url to order_customization

Revision ID: d7e8f9a0b1c2
Revises: c6d7e8f9a0b1
Create Date: 2026-05-12 02:00:00.000000

Two columns for the admin "custom queue" view:

- ``is_complete`` — per-card-art completion flag so each individual custom
  card request can be marked drawn/done independently of the parent order's
  shipping status. Defaults to ``FALSE`` so all existing backfilled rows
  surface in the to-do queue (admins can mark already-drawn historical
  cards done by hand, or via a one-off SQL update keyed off
  ``order.status IN ('shipped', 'delivered')``).
- ``image_url`` — optional URL pointing at the finished card art uploaded by
  the admin (Supabase storage). Nullable since the workflow is "place
  order -> draw later -> attach image" and most rows will start without
  one.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = 'c6d7e8f9a0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order_customization',
        sa.Column(
            'is_complete',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        'order_customization',
        sa.Column('image_url', sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('order_customization', 'image_url')
    op.drop_column('order_customization', 'is_complete')
