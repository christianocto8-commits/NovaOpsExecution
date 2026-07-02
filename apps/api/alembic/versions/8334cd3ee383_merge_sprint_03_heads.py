"""merge sprint 03 heads

Revision ID: 8334cd3ee383
Revises: 6be263dcbb35, c08eee036612
Create Date: 2026-07-02 22:12:07.662320

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8334cd3ee383'
down_revision: Union[str, Sequence[str], None] = ('6be263dcbb35', 'c08eee036612')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
