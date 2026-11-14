import uuid
from unittest.mock import patch
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.status_history import ApplicationStatusHistory
from app.schemas.applications import StatusHistoryItem
from app.services.applications.service import ApplicationService
from app.services.screening.service import ScreeningService
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_system_triggered_state_transition_no_fk_violation(test_role):
    """
    Verify AI screening Celery worker autonomously transitions APPLIED -> SCREENED
    and writes an audit row into application_status_history with:
    changed_by=None, changed_by_type='system', remarks='Automated AI screening completed'
    without triggering a Foreign Key violation on hr_users(id).
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Rohan Verma",
            email="rohan.verma@example.com",
            phone="+91-9876543299",
        )
        session.add(candidate)
        await session.flush()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-SYS-001",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.commit()

        parsed_resume = {
            "name": "Rohan Verma",
            "email": "rohan.verma@example.com",
            "total_experience_years": 5,
            "skills": ["python", "fastapi"],
            "experience": [{"title": "Software Engineer", "duration_months": 60}],
        }
        resume = Resume(
            application_id=app.id,
            file_url="s3://road-express-resumes/resumes/rohan.pdf",
            file_name="rohan.pdf",
            parse_status="done",
            parsed_json=parsed_resume,
        )
        session.add(resume)
        await session.commit()
        app_id = app.id

    # Run AI screening service
    mock_llm_response = {
        "score": 80,
        "matched_skills": ["python", "fastapi"],
        "missing_skills": [],
        "llm_rationale": "Automated screening evaluated successfully.",
    }
    with patch("app.services.screening.service.call_gemini_screening", return_value=mock_llm_response):
        result = await ScreeningService.screen_application(app_id)
    assert result is not None

    # Inspect status history entries
    async with TestSessionLocal() as session:
        stmt = (
            select(ApplicationStatusHistory)
            .where(ApplicationStatusHistory.application_id == app_id)
            .order_by(ApplicationStatusHistory.changed_at.asc())
        )
        res = await session.execute(stmt)
        entries = res.scalars().all()

        # Find the SCREENED transition entry
        screened_entry = next((e for e in entries if e.to_status == "SCREENED"), None)
        assert screened_entry is not None, "SCREENED status history entry not found"
        assert screened_entry.changed_by is None, "changed_by must be None for system transition"
        assert screened_entry.changed_by_type == "system", "changed_by_type must be 'system'"
        assert screened_entry.remarks == "Automated AI screening completed"

        # Verify Pydantic schema serialization includes changed_by_type
        schema_item = StatusHistoryItem.model_validate(screened_entry)
        assert schema_item.changed_by_type == "system"
        assert schema_item.changed_by is None
        assert schema_item.to_status == "SCREENED"


@pytest.mark.asyncio
async def test_hr_triggered_state_transition_sets_hr_type(test_role, hr_user):
    """
    Verify HR user actions (shortlist, reject) write audit rows with:
    changed_by=hr_user.id, changed_by_type='hr'
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Deepa Rao",
            email="deepa.rao@example.com",
            phone="+91-9876543298",
        )
        session.add(candidate)
        await session.flush()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-HR-002",
            current_status="SCREENED",
            source="portal",
        )
        session.add(app)
        await session.commit()
        app_id = app.id

    # HR Shortlist
    async with TestSessionLocal() as session:
        await ApplicationService.shortlist(
            db=session,
            application_id=app_id,
            hr_user_id=hr_user.id,
            remarks="Passed phone screen",
        )

    async with TestSessionLocal() as session:
        stmt = select(ApplicationStatusHistory).where(
            ApplicationStatusHistory.application_id == app_id,
            ApplicationStatusHistory.to_status == "SHORTLISTED",
        )
        res = await session.execute(stmt)
        shortlist_entry = res.scalar_one()

        assert shortlist_entry.changed_by == hr_user.id
        assert shortlist_entry.changed_by_type == "hr"
        assert shortlist_entry.remarks == "Passed phone screen"

        schema_item = StatusHistoryItem.model_validate(shortlist_entry)
        assert schema_item.changed_by_type == "hr"
        assert schema_item.changed_by == hr_user.id


@pytest.mark.asyncio
async def test_check_constraint_rejects_invalid_changed_by_type(test_role):
    """
    Verify PostgreSQL CHECK constraint chk_status_history_changed_by_type
    rejects values other than 'hr' and 'system'.
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Constraint Test",
            email="constraint.test@example.com",
            phone="+91-9876543297",
        )
        session.add(candidate)
        await session.flush()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-CHK-003",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.flush()

        invalid_history = ApplicationStatusHistory(
            application_id=app.id,
            from_status="APPLIED",
            to_status="SCREENED",
            changed_by_type="invalid_type",  # Neither 'hr' nor 'system'
            changed_by=None,
        )
        session.add(invalid_history)

        with pytest.raises(IntegrityError):
            await session.commit()
