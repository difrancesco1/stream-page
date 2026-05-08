"""replace customer_phone with customer_discord_handle on order

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-05-07 00:00:00.000000

The ``order`` table previously stored a customer phone number. Checkout now
collects a Discord handle instead, so we drop ``customer_phone`` and add
``customer_discord_handle`` (varchar 50, NOT NULL).

Existing phone data is intentionally not migrated: the field's meaning has
changed and copying phone numbers into a discord handle column would produce
nonsense. The migration adds the new column with a temporary empty-string
default so backfilling any pre-existing rows succeeds, then clears the default
so future inserts must supply a value (matching the SQLAlchemy model which has
no Python-level default).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('order', 'customer_phone')
    op.add_column(
        'order',
        sa.Column(
            'customer_discord_handle',
            sa.String(length=50),
            nullable=False,
            server_default='',
        ),
    )
    op.alter_column('order', 'customer_discord_handle', server_default=None)


def downgrade() -> None:
    op.drop_column('order', 'customer_discord_handle')
    op.add_column(
        'order',
        sa.Column(
            'customer_phone',
            sa.String(length=30),
            nullable=False,
            server_default=''
        ),
    )
    op.alter_column('order', 'customer_phone', server_default=None)
