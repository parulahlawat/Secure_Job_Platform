"""
Add must_reset_password flag to users table
"""
from alembic import op
import sqlalchemy as sa

revision = '20260409_add_must_reset_password_flag'
down_revision = 'e0783f3ad00c'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('must_reset_password', sa.Boolean(), nullable=False, server_default='false'))

def downgrade():
    op.drop_column('users', 'must_reset_password')
