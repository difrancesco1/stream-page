"""flip custom-card-art product to CUSTOM category

Revision ID: c6d7e8f9a0b1
Revises: b5c6d7e8f9a0
Create Date: 2026-05-12 01:00:00.000000

Data migration that re-categorizes the existing ``custom card art`` product
(slug ``custom-card-art``) from ``TOKENS`` to the new ``CUSTOM`` category
introduced in revision ``b5c6d7e8f9a0``. This is what flips the public shop
from "click + and the item is added immediately" to "click + and the
customization modal opens" for that product.

Why we flip in place instead of creating a duplicate product:
- ``order_item`` references products by ``product_id``. There is no ``category``
  column on ``order_item``; the category is read from the product. Updating
  the product's category therefore makes every historical order containing
  this product (24 rows at the time of writing) naturally appear under the
  ``CUSTOM`` category for any future admin "filter by category" feature,
  without rewriting any historical data.
- ``order_item.unit_price`` is snapshotted at order creation time, so the
  flip cannot change historical totals.
- ``OrderDetail`` / ``OrderItemResponse`` and the receipt/admin emails never
  read ``Product.category``, so customer-facing renders for past orders are
  byte-for-byte identical.
- The new ``_persist_customizations`` validator only runs at order create
  time, so it does not retroactively reject past orders that lack
  ``order_customization`` rows; their ``customizations`` list is simply
  empty in the API response and the UI hides the empty list.

The ``WHERE ... AND category = 'TOKENS'`` clause makes this idempotent so
re-running on an environment that's already been flipped (e.g. by hand on
staging) is a no-op. Enum literals are uppercase because the
``productcategory`` enum stores Python member names (see the consolidated
shop migration ``d1e2f3a4b5c6``).
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c6d7e8f9a0b1'
down_revision: Union[str, None] = 'b5c6d7e8f9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE product
           SET category = 'CUSTOM',
               updated_at = NOW()
         WHERE slug = 'custom-card-art'
           AND category = 'TOKENS'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE product
           SET category = 'TOKENS',
               updated_at = NOW()
         WHERE slug = 'custom-card-art'
           AND category = 'CUSTOM'
        """
    )
