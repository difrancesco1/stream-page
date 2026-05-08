"""add in_person value to orderstatus enum

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-05-08 00:00:00.000000

Adds the ``in_person`` value to the existing ``orderstatus`` Postgres enum.
This supports admin-created cash/in-person orders that bypass the PayPal flow.

``ALTER TYPE ... ADD VALUE`` cannot run inside a transaction block, so we use
Alembic's ``autocommit_block`` to issue the statement on a dedicated
auto-committing connection. ``IF NOT EXISTS`` keeps the migration idempotent.

Postgres has no clean way to drop an enum value (you'd have to recreate the
type and rewrite every row that references it), so the downgrade is a no-op.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'in_person'")


def downgrade() -> None:
    pass
