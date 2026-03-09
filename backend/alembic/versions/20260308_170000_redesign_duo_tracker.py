"""redesign duo tracker

Revision ID: b8a2d3e4f5g6
Revises: f47f4cf19cb7
Create Date: 2026-03-08 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b8a2d3e4f5g6'
down_revision: Union[str, None] = 'f47f4cf19cb7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('duo_tracked_account',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('puuid', sa.String(), nullable=False),
        sa.Column('game_name', sa.String(length=100), nullable=False),
        sa.Column('tag_line', sa.String(length=10), nullable=False),
        sa.Column('last_updated', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id'),
    )

    op.create_table('duo_match',
        sa.Column('match_id', sa.String(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('win', sa.Boolean(), nullable=False),
        sa.Column('teammates', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('played_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('match_id', 'owner_id'),
    )

    op.drop_column('duo_entry', 'puuid')
    op.drop_column('duo_entry', 'shared_matches')


def downgrade() -> None:
    op.add_column('duo_entry', sa.Column('shared_matches', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('duo_entry', sa.Column('puuid', sa.String(), nullable=True))
    op.drop_table('duo_match')
    op.drop_table('duo_tracked_account')
