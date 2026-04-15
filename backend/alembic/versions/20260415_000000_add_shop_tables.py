"""add shop tables

Revision ID: d1e2f3a4b5c6
Revises: c9d3e4f5a6b7
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c9d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

product_category = sa.Enum(
    'apparel', 'accessories', 'prints', 'stickers', 'other',
    name='productcategory',
)

order_status = sa.Enum(
    'pending', 'completed', 'failed', 'refunded',
    name='orderstatus',
)


def upgrade() -> None:
    product_category.create(op.get_bind(), checkfirst=True)
    order_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'product',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('category', product_category, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    op.create_table(
        'order',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('paypal_order_id', sa.String(length=200), nullable=True),
        sa.Column('status', order_status, nullable=False),
        sa.Column('customer_name', sa.String(length=200), nullable=False),
        sa.Column('customer_email', sa.String(length=254), nullable=False),
        sa.Column('customer_phone', sa.String(length=30), nullable=True),
        sa.Column('shipping_street', sa.String(length=300), nullable=False),
        sa.Column('shipping_city', sa.String(length=100), nullable=False),
        sa.Column('shipping_state', sa.String(length=100), nullable=False),
        sa.Column('shipping_zip', sa.String(length=20), nullable=False),
        sa.Column('shipping_country', sa.String(length=100), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('paypal_order_id'),
    )

    op.create_table(
        'order_item',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['order.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['product.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('order_item')
    op.drop_table('order')
    op.drop_table('product')
    order_status.drop(op.get_bind(), checkfirst=True)
    product_category.drop(op.get_bind(), checkfirst=True)
