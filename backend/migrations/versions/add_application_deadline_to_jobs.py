"""
Alembic migration for adding application_deadline to jobs table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_application_deadline_to_jobs'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('jobs', sa.Column('application_deadline', sa.DateTime(), nullable=False, server_default=sa.text('(CURRENT_TIMESTAMP)')))
    op.alter_column('jobs', 'application_deadline', server_default=None)

def downgrade():
    op.drop_column('jobs', 'application_deadline')
