"""add shop tables

Revision ID: d1e2f3a4b5c6
Revises: c9d3e4f5a6b7
Create Date: 2026-04-15 00:00:00.000000

Creates the full set of shop tables (``product``, ``product_media``, ``order``,
``order_item``) in their final shape. This is the consolidated single-migration
form of the shop feature; intermediate revisions that previously evolved the
schema (product media split-off, customer name split, tracking fields, status
rename) have been folded into this one upgrade.

Enum storage notes:
- ``productcategory`` and ``productmediatype`` persist the UPPERCASE Python
  enum *member names* (``TOKENS``/``STICKERS``/``ETC``, ``IMAGE``/``VIDEO``)
  because their SQLAlchemy columns are declared with the default
  ``Enum(MyEnum)`` (no ``values_callable``). The API layer returns
  ``.value`` (lowercase) to clients, so this is a DB-storage detail only.
  The declared order for ``productcategory`` is also the intended shop
  display order, so the API can simply ``ORDER BY category``.
- ``orderstatus`` persists the lowercase ``.value`` strings
  (``pending``/``paid``/``shipped``/``delivered``/``failed``/``refunded``)
  because the SQLAlchemy column was declared with ``values_callable``.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c9d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


product_category = sa.Enum(
    'TOKENS', 'STICKERS', 'ETC',
    name='productcategory',
)

product_media_type = sa.Enum(
    'IMAGE', 'VIDEO',
    name='productmediatype',
)

order_status = sa.Enum(
    'pending', 'paid', 'shipped', 'delivered', 'failed', 'refunded',
    name='orderstatus',
)


def upgrade() -> None:
    op.create_table(
        'product',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('category', product_category, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    op.create_table(
        'product_media',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('media_type', product_media_type, nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['product.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index(
        'ix_product_media_product_id',
        'product_media',
        ['product_id'],
    )

    op.create_index(
        'ux_product_media_one_featured',
        'product_media',
        ['product_id'],
        unique=True,
        postgresql_where=sa.text('is_featured'),
    )

    op.create_table(
        'order',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('paypal_order_id', sa.String(length=200), nullable=True),
        sa.Column('status', order_status, nullable=False),
        sa.Column('customer_first_name', sa.String(length=100), nullable=False),
        sa.Column('customer_last_name', sa.String(length=100), nullable=False),
        sa.Column('customer_email', sa.String(length=254), nullable=False),
        sa.Column('customer_phone', sa.String(length=30), nullable=False),
        sa.Column('shipping_street', sa.String(length=300), nullable=False),
        sa.Column('shipping_city', sa.String(length=100), nullable=False),
        sa.Column('shipping_state', sa.String(length=100), nullable=False),
        sa.Column('shipping_zip', sa.String(length=20), nullable=False),
        sa.Column('shipping_country', sa.String(length=100), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('tracking_number', sa.String(length=100), nullable=True),
        sa.Column('tracking_carrier', sa.String(length=50), nullable=True),
        sa.Column('tracking_url', sa.String(length=500), nullable=True),
        sa.Column('shipped_at', sa.DateTime(), nullable=True),
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
    op.drop_index('ux_product_media_one_featured', table_name='product_media')
    op.drop_index('ix_product_media_product_id', table_name='product_media')
    op.drop_table('product_media')
    op.drop_table('product')
    order_status.drop(op.get_bind(), checkfirst=True)
    product_media_type.drop(op.get_bind(), checkfirst=True)
    product_category.drop(op.get_bind(), checkfirst=True)
