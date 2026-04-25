"""
Revision ID: fix_connectionstatus_enum
Revises: 
Create Date: 2026-04-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fix_connectionstatus_enum'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Rename 'removed' to 'rejected' in the connectionstatus enum
    op.execute("""
        ALTER TYPE connectionstatus RENAME VALUE 'removed' TO 'rejected';
    """)

def downgrade():
    # Revert 'rejected' back to 'removed'
    op.execute("""
        ALTER TYPE connectionstatus RENAME VALUE 'rejected' TO 'removed';
    """)
