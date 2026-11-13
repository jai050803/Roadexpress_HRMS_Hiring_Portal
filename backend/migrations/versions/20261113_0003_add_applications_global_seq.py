"""Add applications_global_seq PostgreSQL sequence

Revision ID: 20261113_0003
Revises: 20261113_0002
Create Date: 2026-11-13 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261113_0003"
down_revision: Union[str, None] = "20261113_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS applications_global_seq START 1;")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS applications_global_seq;")
