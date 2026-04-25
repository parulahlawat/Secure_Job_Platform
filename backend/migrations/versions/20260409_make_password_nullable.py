"""
Alembic migration to make password_hash and password_salt nullable in users table.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260409_make_password_nullable'
down_revision = '20260409_add_must_reset_password_flag'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=True)
    op.alter_column('users', 'password_salt', existing_type=sa.String(length=255), nullable=True)

def downgrade():
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=False)
    op.alter_column('users', 'password_salt', existing_type=sa.String(length=255), nullable=False)
