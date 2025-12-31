"""add tiktok and vgen to platform enum

Revision ID: a1b2c3d4e5f6
Revises: ef984a0a4bae
Create Date: 2025-12-30

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ef984a0a4bae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to the platform enum
    op.execute("ALTER TYPE platform ADD VALUE IF NOT EXISTS 'TIKTOK'")
    op.execute("ALTER TYPE platform ADD VALUE IF NOT EXISTS 'VGEN'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values easily
    # You would need to recreate the type and migrate data
    pass

