"""merge heads before resume_id migration

Revision ID: 28d1f265c55d
Revises: e98f485b715e, 58d0f1798275
Create Date: 2026-04-06 23:12:23.506102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '28d1f265c55d'
down_revision: Union[str, Sequence[str], None] = ('e98f485b715e', '58d0f1798275')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
