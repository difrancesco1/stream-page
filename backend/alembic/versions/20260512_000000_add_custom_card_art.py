"""add custom product category and order_customization table

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-05-12 00:00:00.000000

Two changes for the "custom card art" feature:

1. Add ``CUSTOM`` to the ``productcategory`` Postgres enum so admins can mark
   a product as custom-card-art (the public shop opens a customization modal
   on add-to-cart for these). The existing enum stores Python enum *member
   names* (UPPERCASE) per the consolidated shop migration.

2. Create the ``order_customization`` junction table. One row per individual
   custom-card-art added to the cart, linked to both its parent ``order`` and
   its specific ``order_item`` (since a single OrderItem can have
   ``quantity > 1`` we keep per-instance customization detail in this child
   table). Cascading deletes mirror ``order_item``.

``ALTER TYPE ... ADD VALUE`` cannot run inside a transaction block, so we
use Alembic's ``autocommit_block`` (matching the in_person status migration).
``IF NOT EXISTS`` keeps the enum step idempotent. Postgres has no clean way
to drop an enum value, so the downgrade only removes the new table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b5c6d7e8f9a0'
down_revision: Union[str, None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE productcategory ADD VALUE IF NOT EXISTS 'CUSTOM'")

    op.create_table(
        'order_customization',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.UUID(), nullable=False),
        sa.Column('order_item_id', sa.UUID(), nullable=False),
        sa.Column('card_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['order.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['order_item_id'], ['order_item.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index(
        'ix_order_customization_order_id',
        'order_customization',
        ['order_id'],
    )
    op.create_index(
        'ix_order_customization_order_item_id',
        'order_customization',
        ['order_item_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_order_customization_order_item_id', table_name='order_customization'
    )
    op.drop_index(
        'ix_order_customization_order_id', table_name='order_customization'
    )
    op.drop_table('order_customization')
