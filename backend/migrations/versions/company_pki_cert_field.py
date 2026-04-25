"""
Alembic migration for adding 'certificate' field to Profile (company PKI certificate)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'company_pki_cert_field'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('profiles', sa.Column('certificate', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('profiles', 'certificate')
