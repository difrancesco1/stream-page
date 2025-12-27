"""add_rank_when_added

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rank_when_added column
    op.add_column('int_list_entry', sa.Column('rank_when_added', sa.String(length=50), nullable=True))


def downgrade() -> None:
    # Drop rank_when_added column
    op.drop_column('int_list_entry', 'rank_when_added')

