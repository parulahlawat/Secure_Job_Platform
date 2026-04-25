"""merge blockchain log and failed login attempts branches

Revision ID: e0783f3ad00c
Revises: 20260409_add_blockchain_log, a1b2c3d4e5f6
Create Date: 2026-04-09 19:34:30.837470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0783f3ad00c'
down_revision: Union[str, Sequence[str], None] = ('20260409_add_blockchain_log', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
