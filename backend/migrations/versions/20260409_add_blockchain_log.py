
"""
Add BlockchainLog table for blockchain-based logging
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260409_add_blockchain_log'
down_revision = '1b308fd5f000'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'blockchain_logs',
        sa.Column('index', sa.Integer, primary_key=True, index=True),
        sa.Column('timestamp', sa.String(64), nullable=False),
        sa.Column('data', sa.Text, nullable=False),
        sa.Column('previous_hash', sa.String(255), nullable=False),
        sa.Column('block_hash', sa.String(255), nullable=False),
    )

def downgrade():
    op.drop_table('blockchain_logs')
