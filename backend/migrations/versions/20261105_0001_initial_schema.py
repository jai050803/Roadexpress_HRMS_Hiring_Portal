"""Initial schema: full recruitment pipeline tables

Revision ID: 20261105_0001
Revises: 
Create Date: 2026-11-05 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None

# revision identifiers, used by Alembic.
revision: str = "20261105_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Check and enable extensions if available
    conn = op.get_bind()
    vector_available = conn.execute(
        sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
    ).scalar()

    if vector_available:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        jd_embedding_type = Vector(1536) if Vector is not None else postgresql.ARRAY(sa.Float())
    else:
        jd_embedding_type = postgresql.ARRAY(sa.Float())

    # 1. hr_users
    op.create_table(
        "hr_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), server_default="hr", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_hr_users_email", "hr_users", ["email"], unique=True)

    # 2. job_roles
    op.create_table(
        "job_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("employment_type", sa.String(length=50), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("work_mode", sa.String(length=50), nullable=True),
        sa.Column("education_qualification", sa.Text(), nullable=True),
        sa.Column("min_experience_years", sa.Integer(), nullable=True),
        sa.Column("required_skills", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("responsibilities_text", sa.Text(), nullable=True),
        sa.Column("salary_band", sa.String(length=100), nullable=True),
        sa.Column("jd_text", sa.Text(), nullable=True),
        sa.Column("jd_embedding", jd_embedding_type, nullable=True),
        sa.Column("application_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_applications", sa.Integer(), nullable=True),
        sa.Column("applications_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="draft", nullable=False),
        sa.Column("linkedin_post_copy", sa.Text(), nullable=True),
        sa.Column("linkedin_posted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("linkedin_posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["hr_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_job_roles_status", "job_roles", ["status"])
    op.create_index("idx_job_roles_department", "job_roles", ["department"])

    # 3. candidates
    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_candidates_email", "candidates", ["email"], unique=True)

    # 4. applications
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("source", sa.String(length=50), server_default="portal", nullable=False),
        sa.Column("idempotency_key", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference_number", sa.String(length=50), nullable=False),
        sa.Column("current_status", sa.String(length=50), server_default="APPLIED", nullable=False),
        sa.Column("status_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("uploaded_by_hr", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"]),
        sa.ForeignKeyConstraint(["job_role_id"], ["job_roles.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_hr"], ["hr_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "job_role_id", name="uq_applications_candidate_job_role"),
        sa.UniqueConstraint("idempotency_key", name="uq_applications_idempotency_key"),
        sa.UniqueConstraint("reference_number", name="uq_applications_reference_number"),
    )
    op.create_index("idx_applications_job_role", "applications", ["job_role_id"])
    op.create_index("idx_applications_candidate", "applications", ["candidate_id"])
    op.create_index("idx_applications_status", "applications", ["current_status"])
    op.create_index("idx_applications_source", "applications", ["source"])
    op.create_index("idx_applications_applied_at", "applications", [sa.text("applied_at DESC")])

    # 5. resumes
    op.create_table(
        "resumes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("parse_status", sa.String(length=50), server_default="pending", nullable=False),
        sa.Column("parsed_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("parse_error", sa.Text(), nullable=True),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id"),
    )
    op.create_index("idx_resumes_parse_status", "resumes", ["parse_status"])
    op.create_index(
        "idx_resumes_skills",
        "resumes",
        [sa.text("(parsed_json -> 'skills')")],
        postgresql_using="gin",
    )

    # 6. screening_results
    op.create_table(
        "screening_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("matched_skills", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("missing_skills", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("llm_rationale", sa.Text(), nullable=True),
        sa.Column("hard_filter_passed", sa.Boolean(), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("score >= 0 AND score <= 100", name="chk_screening_score_range"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id"),
    )
    op.create_index("idx_screening_score", "screening_results", [sa.text("score DESC")])
    op.create_index("idx_screening_hard_filter", "screening_results", ["hard_filter_passed"])

    # 7. application_status_history
    op.create_table(
        "application_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", sa.String(length=50), nullable=True),
        sa.Column("to_status", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["changed_by"], ["hr_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_status_history_application", "application_status_history", ["application_id"])
    op.create_index("idx_status_history_changed_at", "application_status_history", [sa.text("changed_at DESC")])

    # 8. interviews
    op.create_table(
        "interviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("round_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("mode", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="scheduled", nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), server_default="60", nullable=False),
        sa.Column("interviewer_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("meeting_link", sa.String(length=1000), nullable=True),
        sa.Column("calendar_event_id", sa.String(length=500), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("required_documents", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("conditions_text", sa.Text(), nullable=True),
        sa.Column("outcome_notes", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["hr_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_interviews_application", "interviews", ["application_id"])
    op.create_index("idx_interviews_scheduled_at", "interviews", ["scheduled_at"])
    op.create_index("idx_interviews_status", "interviews", ["status"])

    # 9. notifications
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False),
        sa.Column("channel", sa.String(length=50), server_default="email", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="pending", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", "type", name="uq_notifications_application_type"),
    )
    op.create_index("idx_notifications_status", "notifications", ["status"])
    op.create_index("idx_notifications_application", "notifications", ["application_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("interviews")
    op.drop_table("application_status_history")
    op.drop_table("screening_results")
    op.drop_table("resumes")
    op.drop_table("applications")
    op.drop_table("candidates")
    op.drop_table("job_roles")
    op.drop_table("hr_users")
