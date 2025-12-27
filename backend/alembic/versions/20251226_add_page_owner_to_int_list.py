"""add_page_owner_to_int_list

Revision ID: a1b2c3d4e5f6
Revises: 236b36956780
Create Date: 2025-12-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '236b36956780'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename creator_id to contributor_id
    op.alter_column('int_list_entry', 'creator_id', new_column_name='contributor_id')
    
    # Add page_owner_id column
    op.add_column('int_list_entry', sa.Column('page_owner_id', sa.UUID(), nullable=True))
    
    # Add foreign key constraint for page_owner_id
    op.create_foreign_key(
        'fk_int_list_entry_page_owner_id',
        'int_list_entry',
        'user',
        ['page_owner_id'],
        ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_int_list_entry_page_owner_id', 'int_list_entry', type_='foreignkey')
    
    # Drop page_owner_id column
    op.drop_column('int_list_entry', 'page_owner_id')
    
    # Rename contributor_id back to creator_id
    op.alter_column('int_list_entry', 'contributor_id', new_column_name='creator_id')

