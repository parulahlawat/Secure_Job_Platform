"""merge heads for deadline field

Revision ID: 1b308fd5f000
Revises: bc596be350b8, add_application_deadline_to_jobs
Create Date: 2026-04-07 13:32:01.214104

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b308fd5f000'
down_revision: Union[str, Sequence[str], None] = ('bc596be350b8', 'add_application_deadline_to_jobs')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
