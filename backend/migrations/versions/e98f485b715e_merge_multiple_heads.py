"""Merge multiple heads

Revision ID: e98f485b715e
Revises: 097bff943106, fix_connectionstatus_enum
Create Date: 2026-04-06 02:17:13.257820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e98f485b715e'
down_revision: Union[str, Sequence[str], None] = ('097bff943106', 'fix_connectionstatus_enum')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
