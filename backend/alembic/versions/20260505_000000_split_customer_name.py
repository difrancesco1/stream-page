"""split customer_name into first_name/last_name

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-05-05 00:00:00.000000

Replaces ``order.customer_name`` with ``customer_first_name`` and
``customer_last_name``. Existing rows are backfilled by splitting on the first
whitespace run: the first token becomes ``customer_first_name`` and everything
after it (trimmed) becomes ``customer_last_name``. Names without a space land
their full value in ``customer_first_name`` and an empty string in
``customer_last_name``.

Also tightens ``customer_phone`` to NOT NULL — the checkout form now requires
phone. Any existing NULL values are coerced to an empty string so the column
can be made non-nullable without losing rows.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'order',
        sa.Column('customer_first_name', sa.String(length=100), nullable=True),
    )
    op.add_column(
        'order',
        sa.Column('customer_last_name', sa.String(length=100), nullable=True),
    )

    op.execute(
        """
        UPDATE "order"
        SET customer_first_name = split_part(customer_name, ' ', 1),
            customer_last_name  = COALESCE(
                NULLIF(regexp_replace(customer_name, '^\\S+\\s*', ''), ''),
                ''
            )
        """
    )

    op.alter_column('order', 'customer_first_name', nullable=False)
    op.alter_column('order', 'customer_last_name', nullable=False)

    op.execute(
        """UPDATE "order" SET customer_phone = '' WHERE customer_phone IS NULL"""
    )
    op.alter_column(
        'order',
        'customer_phone',
        existing_type=sa.String(length=30),
        nullable=False,
    )

    op.drop_column('order', 'customer_name')


def downgrade() -> None:
    op.add_column(
        'order',
        sa.Column('customer_name', sa.String(length=200), nullable=True),
    )

    op.execute(
        """
        UPDATE "order"
        SET customer_name = TRIM(
            BOTH ' ' FROM
            COALESCE(customer_first_name, '') || ' ' || COALESCE(customer_last_name, '')
        )
        """
    )

    op.alter_column('order', 'customer_name', nullable=False)

    op.alter_column(
        'order',
        'customer_phone',
        existing_type=sa.String(length=30),
        nullable=True,
    )

    op.drop_column('order', 'customer_last_name')
    op.drop_column('order', 'customer_first_name')
