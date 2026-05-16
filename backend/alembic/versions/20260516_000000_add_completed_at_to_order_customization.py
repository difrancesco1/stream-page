"""add completed_at to order_customization

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
Create Date: 2026-05-16 00:00:00.000000

Records when a custom-card-art request was marked complete so the public
waitlist gallery can sort by completion time (newest finished art first)
instead of order creation time. Backfills existing ``is_complete = true``
rows from their ``created_at`` so the gallery still has a stable ordering
for historical data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9a0b1c2d3e4'
down_revision: Union[str, None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order_customization',
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.execute(
        "UPDATE order_customization SET completed_at = created_at "
        "WHERE is_complete = true"
    )


def downgrade() -> None:
    op.drop_column('order_customization', 'completed_at')
