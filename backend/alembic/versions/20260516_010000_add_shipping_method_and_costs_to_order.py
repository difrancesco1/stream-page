"""add shipping_method, shipping_cost, discount_amount to order

Revision ID: a1b2c3d4e5f7
Revises: f9a0b1c2d3e4
Create Date: 2026-05-16 01:00:00.000000

Adds a required shipping-method picker to the public checkout. Three columns
are added to the ``order`` table:

- ``shipping_method`` (enum, nullable so admin in-person and historical rows
  remain valid)
- ``shipping_cost`` (NUMERIC, default 0)
- ``discount_amount`` (NUMERIC, default 0)

Pricing: ``TRACKING`` => $6 shipping, ``NO_TRACKING`` => $1 shipping,
``PICKUP`` => $0 shipping + $10 off each CUSTOM-category line item unit
(WA only).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'f9a0b1c2d3e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    shipping_method_enum = sa.Enum(
        'tracking', 'no_tracking', 'pickup', name='shippingmethod'
    )
    shipping_method_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'order',
        sa.Column('shipping_method', shipping_method_enum, nullable=True),
    )
    op.add_column(
        'order',
        sa.Column(
            'shipping_cost',
            sa.Numeric(10, 2),
            nullable=False,
            server_default='0',
        ),
    )
    op.add_column(
        'order',
        sa.Column(
            'discount_amount',
            sa.Numeric(10, 2),
            nullable=False,
            server_default='0',
        ),
    )


def downgrade() -> None:
    op.drop_column('order', 'discount_amount')
    op.drop_column('order', 'shipping_cost')
    op.drop_column('order', 'shipping_method')
    sa.Enum(name='shippingmethod').drop(op.get_bind(), checkfirst=True)
