"""initial_schema

Revision ID: 17d79b10b77d
Revises: 
Create Date: 2025-12-26 22:48:48.438196

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '17d79b10b77d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user table first (no dependencies)
    op.create_table('user',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('birthday', sa.String(), nullable=True),
        sa.Column('profile_picture', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )

    # Create summoner_data table (no dependencies)
    op.create_table('summoner_data',
        sa.Column('puuid', sa.String(), nullable=False),
        sa.Column('game_name', sa.String(length=100), nullable=False),
        sa.Column('tag_line', sa.String(length=10), nullable=False),
        sa.Column('tier', sa.String(length=20), nullable=True),
        sa.Column('rank', sa.String(length=5), nullable=True),
        sa.Column('league_points', sa.Integer(), nullable=True),
        sa.Column('wins', sa.Integer(), nullable=True),
        sa.Column('losses', sa.Integer(), nullable=True),
        sa.Column('recent_matches', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('puuid')
    )

    # Create tables that depend on user
    op.create_table('UserLogin',
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('password', sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('username'),
        sa.UniqueConstraint('username')
    )

    op.create_table('biography',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('content', postgresql.ARRAY(sa.String()), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('socials',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('platform', sa.Enum('TWITTER', 'TWITCH', 'YOUTUBE', 'DISCORD', name='platform'), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('featured_images',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('images', postgresql.ARRAY(sa.String()), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('favorite_champions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('champions', postgresql.ARRAY(sa.String()), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('card_config',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('sections', postgresql.ARRAY(sa.String()), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('int_list_entry',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('page_owner_id', sa.UUID(), nullable=True),
        sa.Column('contributor_id', sa.UUID(), nullable=False),
        sa.Column('puuid', sa.String(), nullable=False),
        sa.Column('summoner_name', sa.String(), nullable=False),
        sa.Column('summoner_tag', sa.String(), nullable=False),
        sa.Column('user_reason', sa.String(), nullable=False),
        sa.Column('rank_when_added', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['contributor_id'], ['user.id']),
        sa.ForeignKeyConstraint(['page_owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('puuid')
    )

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

    op.create_table('hidden_match',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('match_id', sa.String(), nullable=False, index=True),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop tables in reverse order (dependent tables first)
    op.drop_table('hidden_match')
    op.drop_table('opgg_entry')
    op.drop_table('int_list_entry')
    op.drop_table('card_config')
    op.drop_table('favorite_champions')
    op.drop_table('featured_images')
    op.drop_table('socials')
    op.drop_table('biography')
    op.drop_table('UserLogin')
    op.drop_table('summoner_data')
    op.drop_table('user')
    
    # Drop the platform enum type
    op.execute('DROP TYPE IF EXISTS platform')
