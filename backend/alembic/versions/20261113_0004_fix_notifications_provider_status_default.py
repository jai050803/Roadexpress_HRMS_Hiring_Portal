"""Fix notifications provider_status default to pending

Revision ID: 20261113_0004
Revises: 20261113_0003
Create Date: 2026-11-13 10:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261113_0004"
down_revision: Union[str, None] = "20261113_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("notifications")]

    if "provider_status" not in cols:
        op.add_column(
            "notifications",
            sa.Column(
                "provider_status",
                sa.String(length=50),
                server_default="pending",
                nullable=False,
            ),
        )
        op.create_index(
            "idx_notifications_provider_status",
            "notifications",
            ["provider_status"],
        )
    else:
        op.alter_column(
            "notifications",
            "provider_status",
            server_default="pending",
            existing_type=sa.String(length=50),
        )

    if "status" in cols:
        op.alter_column(
            "notifications",
            "status",
            server_default="pending",
            existing_type=sa.String(length=50),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("notifications")]
    if "provider_status" in cols:
        op.drop_index("idx_notifications_provider_status", table_name="notifications")
        op.drop_column("notifications", "provider_status")
