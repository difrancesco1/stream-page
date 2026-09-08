"""add stripe_payment_intent_id and payment_provider to order

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-22 00:00:00.000000

Adds Stripe support alongside PayPal. ``stripe_payment_intent_id`` mirrors the
existing ``paypal_order_id`` (nullable, unique) and ``payment_provider`` records
which processor a paid order went through ("paypal" / "stripe" / "in_person").
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order',
        sa.Column('stripe_payment_intent_id', sa.String(length=200), nullable=True),
    )
    op.add_column(
        'order',
        sa.Column('payment_provider', sa.String(length=20), nullable=True),
    )
    op.create_unique_constraint(
        'uq_order_stripe_payment_intent_id',
        'order',
        ['stripe_payment_intent_id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_order_stripe_payment_intent_id', 'order', type_='unique'
    )
    op.drop_column('order', 'payment_provider')
    op.drop_column('order', 'stripe_payment_intent_id')
