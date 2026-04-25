"""
Add failed_login_attempts table for login throttling

Revision ID: a1b2c3d4e5f6
Revises: 1b308fd5f000
Create Date: 2026-04-09 01:00:00.000000
"""

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1b308fd5f000'
branch_labels = None
depends_on = None
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'failed_login_attempts',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(255), index=True, nullable=False),
        sa.Column('count', sa.Integer, default=0),
        sa.Column('last_attempt', sa.DateTime, nullable=False),
        sa.Column('locked_until', sa.DateTime, nullable=True),
    )

def downgrade():
    op.drop_table('failed_login_attempts')
