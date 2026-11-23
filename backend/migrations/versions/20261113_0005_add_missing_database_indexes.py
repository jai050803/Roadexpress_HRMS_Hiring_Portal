"""Add all missing database indexes for performance

Revision ID: 20261113_0005
Revises: 20261113_0004
Create Date: 2026-11-13 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261113_0005"
down_revision: Union[str, None] = "20261113_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pg_trgm extension for GIN trigram indexing on candidate name and email
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # 2. Ensure template_type column exists on notifications for idx_notifications_app_template
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("notifications")]
    if "template_type" not in cols:
        op.execute(
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_type VARCHAR(100) GENERATED ALWAYS AS (type) STORED;"
        )

    # 3. CONCURRENTLY index creation outside transaction block
    with op.get_context().autocommit_block():
        # Pipeline view performance
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_role_status ON applications(job_role_id, current_status);"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);"
        )

        # CV Bank performance
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_screening_results_score ON screening_results(score DESC);"
        )

        # JSONB skill search (most critical  -  without this, every skill filter is a full table scan)
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_parsed_json_skills ON resumes USING GIN((parsed_json -> 'skills'));"
        )

        # Full text search on candidate name + email
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_name_trgm ON candidates USING GIN(name gin_trgm_ops);"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_email_trgm ON candidates USING GIN(email gin_trgm_ops);"
        )

        # Audit trail lookup
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_history_application_id ON application_status_history(application_id);"
        )

        # Notifications deduplication check
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_app_template ON notifications(application_id, template_type);"
        )

        # Job roles status filter (candidate portal and HR all-roles view)
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_roles_status ON job_roles(status);"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_job_roles_status;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_app_template;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_status_history_application_id;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_candidates_email_trgm;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_candidates_name_trgm;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_resumes_parsed_json_skills;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_screening_results_score;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_applications_applied_at;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_applications_candidate_id;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_applications_role_status;")

    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("notifications")]
    if "template_type" in cols:
        op.execute("ALTER TABLE notifications DROP COLUMN IF EXISTS template_type;")
