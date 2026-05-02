"""add product media table

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-04-27 00:00:00.000000

Adds the ``product_media`` table so a product can have many images/videos,
backfills any existing ``product.image_url`` value as a featured IMAGE row,
then drops the now-redundant ``product.image_url`` column.

Enum storage note: ``productmediatype`` uses the uppercase Python enum member
names (``IMAGE``, ``VIDEO``) because that is what SQLAlchemy's default
``Enum(ProductMediaType)`` column persists. The API layer returns the
lowercase ``.value`` to clients, so this is a DB-storage detail only.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


product_media_type = sa.Enum(
    'IMAGE', 'VIDEO',
    name='productmediatype',
)


def upgrade() -> None:
    op.create_table(
        'product_media',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('media_type', product_media_type, nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['product.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index(
        'ix_product_media_product_id',
        'product_media',
        ['product_id'],
    )

    op.create_index(
        'ux_product_media_one_featured',
        'product_media',
        ['product_id'],
        unique=True,
        postgresql_where=sa.text('is_featured'),
    )

    op.execute(
        sa.text(
            """
            INSERT INTO product_media (
                id, product_id, url, media_type,
                display_order, is_featured, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                p.id,
                p.image_url,
                'IMAGE',
                0,
                true,
                COALESCE(p.created_at, NOW()),
                COALESCE(p.updated_at, NOW())
            FROM product p
            WHERE p.image_url IS NOT NULL AND p.image_url <> ''
            """
        )
    )

    op.drop_column('product', 'image_url')


def downgrade() -> None:
    op.add_column(
        'product',
        sa.Column('image_url', sa.String(length=500), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE product p
            SET image_url = sub.url
            FROM (
                SELECT DISTINCT ON (product_id)
                    product_id, url
                FROM product_media
                WHERE media_type = 'IMAGE'
                ORDER BY product_id, is_featured DESC, display_order, created_at
            ) AS sub
            WHERE p.id = sub.product_id
            """
        )
    )

    op.drop_index('ux_product_media_one_featured', table_name='product_media')
    op.drop_index('ix_product_media_product_id', table_name='product_media')
    op.drop_table('product_media')
    product_media_type.drop(op.get_bind(), checkfirst=True)
