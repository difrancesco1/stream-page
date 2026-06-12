"""add PREORDER product category and product.display_order

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-06 00:00:00.000000

Two changes:

1. Add ``PREORDER`` to the ``productcategory`` Postgres enum so admins can
   mark a product as a preorder item. Existing enum stores Python enum
   *member names* (UPPERCASE). ``ALTER TYPE ... ADD VALUE`` cannot run in a
   transaction block, so we use ``autocommit_block``.

2. Add ``display_order`` (INTEGER NOT NULL DEFAULT 0) to ``product`` so
   admins can manually order products on the shop page. Backfill existing
   rows with a deterministic order (newest first within each category) so
   the column has meaningful values immediately after migration.

Postgres has no clean way to drop an enum value, so the downgrade only
removes the new column.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE productcategory ADD VALUE IF NOT EXISTS 'PREORDER'")

    op.add_column(
        'product',
        sa.Column(
            'display_order',
            sa.Integer(),
            nullable=False,
            server_default='0',
        ),
    )

    op.execute(
        """
        UPDATE product AS p
        SET display_order = sub.rn
        FROM (
            SELECT id,
                   (ROW_NUMBER() OVER (
                       PARTITION BY category ORDER BY created_at DESC
                   ) - 1) AS rn
            FROM product
        ) AS sub
        WHERE p.id = sub.id
        """
    )


def downgrade() -> None:
    op.drop_column('product', 'display_order')
