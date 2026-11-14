import asyncio
import uuid
from unittest.mock import MagicMock, patch
import pytest
from sqlalchemy import select

from tests.conftest import TestSessionLocal
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.services.screening.prompts import call_gemini_screening
from app.services.screening.service import ScreeningService
from app.workers.tasks import run_screening_task


@pytest.mark.asyncio
async def test_deterministic_hard_filter_fails_when_experience_insufficient(test_role):
    """
    Candidate with 2 years experience on a 3-year-min role -> hard_filter_passed = false.
    Verify this is deterministic even if Gemini claims otherwise.
    """
    async with TestSessionLocal() as session:
        # Create role requiring 3 years minimum
        role = JobRole(
            title="Senior Operations Specialist",
            department="Operations",
            employment_type="full_time",
            location="Delhi NCR",
            work_mode="onsite",
            min_experience_years=3,
            required_skills=["Fleet Management", "Route Optimization", "Vendor Management"],
            status="published",
            applications_count=0,
            created_by=test_role.created_by,
        )
        session.add(role)
        await session.commit()
        await session.refresh(role)

        candidate = Candidate(
            name="Anil Kumar",
            email="anil.filter@example.com",
            phone="+91-9876543220",
        )
        session.add(candidate)
        await session.commit()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-FILTER-001",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.commit()

        # Candidate with only 2 years experience
        parsed_resume = {
            "name": "Anil Kumar",
            "email": "anil.filter@example.com",
            "total_experience_years": 2,
            "skills": ["fleet management", "route optimization"],
            "experience": [{"title": "Operations Exec", "duration_months": 24}],
        }
        resume = Resume(
            application_id=app.id,
            file_url="s3://road-express-resumes/resumes/dummy.pdf",
            file_name="resume.pdf",
            parse_status="done",
            parsed_json=parsed_resume,
        )
        session.add(resume)
        await session.commit()
        app_id = app.id

    # Mock Gemini returning score with hard_filter_passed=True to test deterministic override
    mock_gemini_resp = {
        "score": 85,
        "matched_skills": ["fleet management", "route optimization"],
        "missing_skills": ["vendor management"],
        "llm_rationale": "Strong candidate with good operations experience.",
        "hard_filter_passed": True,  # Gemini claims true, but code must override to false!
    }

    with patch("app.services.screening.service.call_gemini_screening", return_value=mock_gemini_resp):
        res = await ScreeningService.screen_application(app_id)

    # Verification: deterministic override forced hard_filter_passed = False
    assert res.hard_filter_passed is False
    assert 0 <= res.score <= 100

    # Verify status transitioned APPLIED -> SCREENED
    async with TestSessionLocal() as session:
        app_res = await session.execute(select(Application).where(Application.id == app_id))
        app_record = app_res.scalar_one()
        assert app_record.current_status == "SCREENED"


@pytest.mark.asyncio
async def test_screening_success_and_status_transition(test_role):
    """
    Verify successful screening:
    1. Score between 0 and 100
    2. screening_results row created
    3. Application status transitions from APPLIED to SCREENED
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Sneha Patil",
            email="sneha.patil@example.com",
            phone="+91-9876543221",
        )
        session.add(candidate)
        await session.commit()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-SCREEN-002",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.commit()

        parsed_resume = {
            "name": "Sneha Patil",
            "email": "sneha.patil@example.com",
            "total_experience_years": 6,
            "skills": ["python", "fastapi", "postgresql", "redis"],
            "experience": [{"title": "Senior Engineer", "duration_months": 72}],
        }
        resume = Resume(
            application_id=app.id,
            file_url="s3://road-express-resumes/resumes/sneha.pdf",
            file_name="sneha.pdf",
            parse_status="done",
            parsed_json=parsed_resume,
        )
        session.add(resume)
        await session.commit()
        app_id = app.id

    mock_llm_response = {
        "score": 85,
        "matched_skills": ["python", "fastapi"],
        "missing_skills": [],
        "llm_rationale": "Strong candidate matching all technical requirements.",
    }
    with patch("app.services.screening.service.call_gemini_screening", return_value=mock_llm_response):
        result = await ScreeningService.screen_application(app_id)

    assert result is not None
    assert 0 <= result.score <= 100
    assert result.hard_filter_passed is True
    assert len(result.matched_skills) > 0

    # Verify DB state
    async with TestSessionLocal() as session:
        sr_res = await session.execute(
            select(ScreeningResult).where(ScreeningResult.application_id == app_id)
        )
        sr = sr_res.scalar_one()
        assert sr.score == result.score
        assert sr.llm_rationale is not None

        # Verify application status transitioned to SCREENED
        app_res = await session.execute(select(Application).where(Application.id == app_id))
        app_record = app_res.scalar_one()
        assert app_record.current_status == "SCREENED"

        # Verify status history audit entry was written with system attributes
        from app.models.status_history import ApplicationStatusHistory
        sh_res = await session.execute(
            select(ApplicationStatusHistory).where(
                ApplicationStatusHistory.application_id == app_id,
                ApplicationStatusHistory.to_status == "SCREENED",
            )
        )
        sh = sh_res.scalar_one()
        assert sh.changed_by_type == "system"
        assert sh.changed_by is None
        assert sh.remarks == "Automated AI screening completed"


@pytest.mark.asyncio
async def test_screening_idempotency(test_role):
    """
    Run screening task twice on same application -> second call is a no-op,
    no duplicate screening_results rows created.
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Vikram Mehta",
            email="vikram.idem@example.com",
            phone="+91-9876543222",
        )
        session.add(candidate)
        await session.commit()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-IDEM-003",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.commit()

        parsed_resume = {
            "name": "Vikram Mehta",
            "total_experience_years": 5,
            "skills": ["python", "postgresql"],
        }
        resume = Resume(
            application_id=app.id,
            file_url="s3://road-express-resumes/resumes/vikram.pdf",
            file_name="vikram.pdf",
            parse_status="done",
            parsed_json=parsed_resume,
        )
        session.add(resume)
        await session.commit()
        app_id = app.id

    with patch("app.services.screening.service.call_gemini_screening") as mock_eval:
        mock_eval.return_value = {
            "score": 78,
            "matched_skills": ["python", "postgresql"],
            "missing_skills": ["redis"],
            "llm_rationale": "Solid backend profile.",
            "hard_filter_passed": True,
        }

        # First call
        first_result = await ScreeningService.screen_application(app_id)
        assert mock_eval.call_count == 1

        # Second call
        second_result = await ScreeningService.screen_application(app_id)
        # Should NOT evaluate again
        assert mock_eval.call_count == 1
        assert first_result.id == second_result.id
        assert first_result.score == second_result.score

    # Confirm only one row exists in DB
    async with TestSessionLocal() as session:
        res = await session.execute(
            select(ScreeningResult).where(ScreeningResult.application_id == app_id)
        )
        rows = res.scalars().all()
        assert len(rows) == 1


@pytest.mark.asyncio
async def test_screening_malformed_json_fallback_moves_to_screened(test_role):
    """
    Gemini returns malformed JSON -> after 3 retries, fallback result written:
    score = 0, hard_filter_passed = false,
    llm_rationale = 'Screening failed — manual review required',
    and application still moves to SCREENED.
    """
    async with TestSessionLocal() as session:
        candidate = Candidate(
            name="Error Candidate",
            email="error.cand@example.com",
            phone="+91-9876543223",
        )
        session.add(candidate)
        await session.commit()

        app = Application(
            candidate_id=candidate.id,
            job_role_id=test_role.id,
            idempotency_key=uuid.uuid4(),
            reference_number="APP-FAIL-004",
            current_status="APPLIED",
            source="portal",
        )
        session.add(app)
        await session.commit()

        parsed_resume = {
            "name": "Error Candidate",
            "total_experience_years": 3,
            "skills": ["python"],
        }
        resume = Resume(
            application_id=app.id,
            file_url="s3://road-express-resumes/resumes/error.pdf",
            file_name="error.pdf",
            parse_status="done",
            parsed_json=parsed_resume,
        )
        session.add(resume)
        await session.commit()
        app_id = app.id

    # Simulate Gemini failing/raising ValueError repeatedly
    with patch("app.services.screening.prompts.settings.GEMINI_API_KEY", "real-mock-key"), \
         patch("google.genai.Client") as mock_client:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = ValueError("Malformed invalid JSON from model")
        mock_client.return_value = mock_instance

        # Execute screening
        result = await ScreeningService.screen_application(app_id)

    # Verification: required fallback output
    assert result.score == 0
    assert result.hard_filter_passed is False
    assert result.llm_rationale == "Screening failed — manual review required"

    # Verification: application still transitions to SCREENED
    async with TestSessionLocal() as session:
        app_res = await session.execute(select(Application).where(Application.id == app_id))
        app_record = app_res.scalar_one()
        assert app_record.current_status == "SCREENED"


def test_celery_run_screening_task_wrapper(test_role):
    """
    Verify Celery run_screening_task wrapper executes correctly synchronously.
    """
    from app.workers.tasks import run_screening_task

    async def _setup():
        async with TestSessionLocal() as session:
            candidate = Candidate(
                name="Worker Cand",
                email="worker.cand@example.com",
                phone="+91-9876543224",
            )
            session.add(candidate)
            await session.commit()

            app = Application(
                candidate_id=candidate.id,
                job_role_id=test_role.id,
                idempotency_key=uuid.uuid4(),
                reference_number="APP-CELERY-005",
                current_status="APPLIED",
                source="portal",
            )
            session.add(app)
            await session.commit()

            parsed_resume = {
                "name": "Worker Cand",
                "total_experience_years": 5,
                "skills": ["python", "fastapi"],
            }
            resume = Resume(
                application_id=app.id,
                file_url="s3://road-express-resumes/resumes/worker.pdf",
                file_name="worker.pdf",
                parse_status="done",
                parsed_json=parsed_resume,
            )
            session.add(resume)
            await session.commit()
            return app.id

    app_id = asyncio.run(_setup())

    with patch("app.services.screening.service.call_gemini_screening") as mock_gemini:
        mock_gemini.return_value = {
            "score": 88,
            "matched_skills": ["python"],
            "missing_skills": [],
            "llm_rationale": "High score match",
            "hard_filter_passed": True,
        }

        task_result = run_screening_task(str(app_id))
        assert task_result["status"] == "done"
        assert task_result["score"] == 88
        assert task_result["hard_filter_passed"] is True
