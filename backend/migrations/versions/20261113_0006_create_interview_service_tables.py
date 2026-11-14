"""Create interview service tables (interviews, interview_feedback)

Revision ID: 20261113_0006
Revises: 20261113_0005
Create Date: 2026-11-13 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20261113_0006"
down_revision: Union[str, None] = "20261113_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop legacy interviews table if it exists (schema replacement for interview module)
    op.execute("DROP TABLE IF EXISTS interviews CASCADE;")

    # 1. TABLE: interviews
    op.create_table(
        "interviews",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_roles.id"),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), server_default="60", nullable=False),
        sa.Column("mode", sa.String(length=20), nullable=False),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("meeting_link", sa.Text(), nullable=True),
        sa.Column("interviewer_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="scheduled", nullable=False),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("hr_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hr_users.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("mode IN ('phone', 'video', 'in_person')", name="chk_interviews_mode"),
        sa.CheckConstraint("status IN ('scheduled', 'completed', 'cancelled', 'no_show')", name="chk_interviews_status"),
    )

    # 2. TABLE: interview_feedback
    op.create_table(
        "interview_feedback",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "interview_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interviews.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "submitted_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hr_users.id"),
            nullable=False,
        ),
        sa.Column("overall_rating", sa.Integer(), nullable=True),
        sa.Column("technical_rating", sa.Integer(), nullable=True),
        sa.Column("communication_rating", sa.Integer(), nullable=True),
        sa.Column("culture_rating", sa.Integer(), nullable=True),
        sa.Column("decision", sa.String(length=20), nullable=True),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("concerns", sa.Text(), nullable=True),
        sa.Column("additional_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("overall_rating BETWEEN 1 AND 5", name="chk_interview_feedback_overall_rating"),
        sa.CheckConstraint("technical_rating BETWEEN 1 AND 5", name="chk_interview_feedback_technical_rating"),
        sa.CheckConstraint("communication_rating BETWEEN 1 AND 5", name="chk_interview_feedback_communication_rating"),
        sa.CheckConstraint("culture_rating BETWEEN 1 AND 5", name="chk_interview_feedback_culture_rating"),
        sa.CheckConstraint("decision IN ('proceed', 'hold', 'reject')", name="chk_interview_feedback_decision"),
        sa.UniqueConstraint("interview_id", "submitted_by", name="uq_interview_feedback_interview_submitted_by"),
    )

    # 3. INDEXES
    op.create_index("idx_interviews_application_id", "interviews", ["application_id"])
    op.create_index("idx_interviews_job_role_id", "interviews", ["job_role_id"])
    op.create_index("idx_interviews_scheduled_at", "interviews", ["scheduled_at"])
    op.create_index("idx_interviews_status", "interviews", ["status"])
    op.create_index("idx_interview_feedback_interview_id", "interview_feedback", ["interview_id"])


def downgrade() -> None:
    op.drop_index("idx_interview_feedback_interview_id", table_name="interview_feedback")
    op.drop_table("interview_feedback")

    op.drop_index("idx_interviews_status", table_name="interviews")
    op.drop_index("idx_interviews_scheduled_at", table_name="interviews")
    op.drop_index("idx_interviews_job_role_id", table_name="interviews")
    op.drop_index("idx_interviews_application_id", table_name="interviews")
    op.drop_table("interviews")
