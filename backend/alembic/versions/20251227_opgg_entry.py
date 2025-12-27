"""add opgg_entry table

Revision ID: 20251227_opgg
Revises: 17d79b10b77d
Create Date: 2025-12-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251227_opgg'
down_revision: Union[str, None] = '17d79b10b77d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('opgg_entry',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('contributor_id', sa.UUID(), nullable=True),
        sa.Column('puuid', sa.String(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.ForeignKeyConstraint(['contributor_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('puuid')
    )


def downgrade() -> None:
    op.drop_table('opgg_entry')

