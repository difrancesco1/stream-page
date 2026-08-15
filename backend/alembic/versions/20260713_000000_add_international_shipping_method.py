"""add international value to shippingmethod enum

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-13 00:00:00.000000

Adds a new ``international`` value to the native ``shippingmethod`` Postgres
enum so the public checkout can offer a flat-rate international shipping
option (currently US + Canada). ``ALTER TYPE ... ADD VALUE`` cannot run inside
a transaction block, so it is executed in an autocommit block.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE shippingmethod ADD VALUE IF NOT EXISTS 'international'"
        )


def downgrade() -> None:
    # Postgres cannot drop a value from an enum type; leave as a no-op.
    pass
