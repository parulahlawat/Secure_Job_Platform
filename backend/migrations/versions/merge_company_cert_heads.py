"""
Alembic merge migration for company PKI cert field and previous head
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'merge_company_cert_heads'
down_revision = ('29d0012802b9', 'company_pki_cert_field')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
