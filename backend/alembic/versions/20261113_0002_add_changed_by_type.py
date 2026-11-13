"""Add changed_by_type to application_status_history

Revision ID: 20261113_0002
Revises: 20261105_0001
Create Date: 2026-11-13 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20261113_0002"
down_revision: Union[str, None] = "20261105_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add changed_by_type column with server_default='hr'
    op.add_column(
        "application_status_history",
        sa.Column(
            "changed_by_type",
            sa.String(length=20),
            server_default="hr",
            nullable=False,
        ),
    )

    # 2. Add check constraint for valid values ('hr', 'system')
    op.create_check_constraint(
        "chk_status_history_changed_by_type",
        "application_status_history",
        "changed_by_type IN ('hr', 'system')",
    )

    # 3. Ensure changed_by is nullable (when changed_by_type = 'system', changed_by is null)
    op.alter_column(
        "application_status_history",
        "changed_by",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # 1. Drop check constraint
    op.drop_constraint(
        "chk_status_history_changed_by_type",
        "application_status_history",
        type_="check",
    )

    # 2. Drop changed_by_type column
    op.drop_column("application_status_history", "changed_by_type")
