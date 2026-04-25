"""
Alembic migration to add company_name column to jobs table.
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('jobs', sa.Column('company_name', sa.String(length=255), nullable=True))

def downgrade():
    op.drop_column('jobs', 'company_name')
