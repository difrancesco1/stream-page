"""add notes column to order

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-05-08 01:00:00.000000

Adds an optional ``notes`` column to the ``order`` table. Customers can
include free-form notes at checkout (e.g. delivery instructions, gift
message, or in-person event context for custom orders) and admins can edit
them later. Stored as ``Text`` (no fixed length) and nullable since the
field is purely optional.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a4b5c6d7e8f9'
down_revision: Union[str, None] = 'f3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order',
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('order', 'notes')
