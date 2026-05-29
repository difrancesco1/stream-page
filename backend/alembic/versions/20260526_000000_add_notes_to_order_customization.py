"""add notes column to order_customization

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f7
Create Date: 2026-05-26 00:00:00.000000

Adds an optional ``notes`` column to the ``order_customization`` table so
each custom card art request can carry its own free-form notes (e.g.
special instructions from the customer). Nullable since the field is
optional.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order_customization',
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('order_customization', 'notes')
