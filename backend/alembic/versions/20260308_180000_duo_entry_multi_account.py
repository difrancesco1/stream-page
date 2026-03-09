"""duo entry multi account

Revision ID: c9d3e4f5a6b7
Revises: b8a2d3e4f5g6
Create Date: 2026-03-08 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9d3e4f5a6b7'
down_revision: Union[str, None] = 'b8a2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('duo_entry_account',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('entry_id', sa.UUID(), nullable=False),
        sa.Column('summoner_name', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['duo_entry.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entry_id', 'summoner_name', name='uq_duo_entry_account_entry_name'),
    )

    conn = op.get_bind()
    entries = conn.execute(sa.text("SELECT id, name FROM duo_entry WHERE name IS NOT NULL"))
    for row in entries:
        conn.execute(
            sa.text(
                "INSERT INTO duo_entry_account (id, entry_id, summoner_name) "
                "VALUES (gen_random_uuid(), :entry_id, :name)"
            ),
            {"entry_id": row.id, "name": row.name},
        )

    op.drop_constraint('uq_duo_entry_owner_name', 'duo_entry', type_='unique')
    op.alter_column('duo_entry', 'name', existing_type=sa.String(length=100), nullable=True)


def downgrade() -> None:
    op.alter_column('duo_entry', 'name', existing_type=sa.String(length=100), nullable=False)
    op.create_unique_constraint('uq_duo_entry_owner_name', 'duo_entry', ['owner_id', 'name'])
    op.drop_table('duo_entry_account')
