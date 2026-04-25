"""create blockchain_logs table (fix)

Revision ID: 608efde26b6f
Revises: 40f50d932360
Create Date: 2026-04-10 18:17:55.929729

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '608efde26b6f'
down_revision: Union[str, Sequence[str], None] = '40f50d932360'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
