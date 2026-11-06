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
from app.workers.tasks import run_screening_task


async def _seed_application_for_screening(
    role_id: uuid.UUID,
    name: str,
    experience_years: int,
    skills: list,
):
    async with TestSessionLocal() as session:
        cand = Candidate(
            name=name,
            email=f"{name.lower().replace(' ', '.')}@example.com",
            phone="+91-9876543211",
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)

        app = Application(
            candidate_id=cand.id,
            job_role_id=role_id,
            reference_number=f"APP-SCR-{uuid.uuid4().hex[:4].upper()}",
            current_status="APPLIED",
            source="portal",
            idempotency_key=uuid.uuid4(),
            status_version=1,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)

        resume = Resume(
            application_id=app.id,
            file_url=f"s3://road-express-resumes/resumes/{app.id}/resume.pdf",
            file_name="resume.pdf",
            parse_status="done",
            parsed_json={
                "name": name,
                "total_experience_years": experience_years,
                "skills": skills,
            },
        )
        session.add(resume)
        await session.commit()

        return app.id


def test_screening_worker_scoring_and_state_move(test_role: JobRole):
    """
    Test Celery run_screening_task scores candidate against JD and transitions APPLIED -> SCREENED.
    """
    app_id = asyncio.run(
        _seed_application_for_screening(
            test_role.id,
            name="Rahul Varma",
            experience_years=6,
            skills=["python", "fastapi", "postgresql", "redis"],
        )
    )

    mock_gemini_resp = {
        "score": 88,
        "matched_skills": ["python", "fastapi", "postgresql"],
        "missing_skills": ["redis"],
        "llm_rationale": "Strong candidate matching core logistics systems stack.",
        "hard_filter_passed": True,
    }

    with patch("app.services.screening.service.call_gemini_screening", return_value=mock_gemini_resp):
        res = run_screening_task(str(app_id))
        assert res["status"] == "done"
        assert res["score"] == 88
        assert res["hard_filter_passed"] is True

    # Verify DB state
    async def _verify_db():
        async with TestSessionLocal() as session:
            sr_res = await session.execute(
                select(ScreeningResult).where(ScreeningResult.application_id == app_id)
            )
            sr = sr_res.scalar_one()
            assert sr.score == 88
            assert sr.hard_filter_passed is True

            app_res = await session.execute(
                select(Application).where(Application.id == app_id)
            )
            app = app_res.scalar_one()
            assert app.current_status == "SCREENED"

    asyncio.run(_verify_db())


def test_screening_worker_hard_filter_insufficient_experience():
    """
    Candidate with 2 years on a 4-year minimum role fails hard filter deterministically,
    even if LLM evaluation claims hard_filter_passed=True.
    """
    async def _setup():
        async with TestSessionLocal() as session:
            role = JobRole(
                title="Lead Routing Engineer",
                department="Engineering",
                employment_type="full_time",
                location="Bangalore",
                work_mode="hybrid",
                min_experience_years=4,
                required_skills=["Python", "Route Optimization"],
                status="published",
                applications_count=0,
            )
            session.add(role)
            await session.commit()
            await session.refresh(role)
            return role.id

    role_id = asyncio.run(_setup())

    # Candidate with only 2 years experience
    app_id = asyncio.run(
        _seed_application_for_screening(
            role_id,
            name="Junior Dev",
            experience_years=2,
            skills=["python"],
        )
    )

    mock_gemini_resp = {
        "score": 75,
        "matched_skills": ["python"],
        "missing_skills": ["route optimization"],
        "llm_rationale": "Decent candidate.",
        "hard_filter_passed": True,  # LLM erroneously claims true
    }

    with patch("app.services.screening.service.call_gemini_screening", return_value=mock_gemini_resp):
        res = run_screening_task(str(app_id))
        # Deterministic check overrides LLM to False
        assert res["hard_filter_passed"] is False

    async def _verify():
        async with TestSessionLocal() as session:
            sr_res = await session.execute(
                select(ScreeningResult).where(ScreeningResult.application_id == app_id)
            )
            sr = sr_res.scalar_one()
            assert sr.hard_filter_passed is False

    asyncio.run(_verify())


def test_screening_worker_gemini_failure_fallback(test_role: JobRole):
    """
    If Gemini fails / exhausts retries:
    Celery task writes fallback result (score=0, hard_filter_passed=False,
    llm_rationale='Screening failed — manual review required')
    and still moves application from APPLIED -> SCREENED.
    """
    app_id = asyncio.run(
        _seed_application_for_screening(
            test_role.id,
            name="Fallback Cand",
            experience_years=5,
            skills=["python"],
        )
    )

    with patch("app.services.screening.prompts.settings.GEMINI_API_KEY", "mock-key"), \
         patch("google.genai.Client") as mock_client:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = RuntimeError("Gemini 503 Service Unavailable")
        mock_client.return_value = mock_instance

        # Call worker
        res = run_screening_task(str(app_id))
        assert res["status"] in ("fallback", "done")
        assert res["score"] == 0
        assert res["hard_filter_passed"] is False

    async def _verify():
        async with TestSessionLocal() as session:
            sr_res = await session.execute(
                select(ScreeningResult).where(ScreeningResult.application_id == app_id)
            )
            sr = sr_res.scalar_one()
            assert sr.score == 0
            assert sr.hard_filter_passed is False
            assert "Screening failed" in sr.llm_rationale

            app_res = await session.execute(
                select(Application).where(Application.id == app_id)
            )
            app = app_res.scalar_one()
            assert app.current_status == "SCREENED"

    asyncio.run(_verify())


def test_screening_worker_idempotency(test_role: JobRole):
    """
    Calling run_screening_task twice for the same application:
    Second call returns existing screening result without re-evaluating.
    No duplicate screening_results records created.
    """
    app_id = asyncio.run(
        _seed_application_for_screening(
            test_role.id,
            name="Idempotent Candidate",
            experience_years=5,
            skills=["python", "fastapi"],
        )
    )

    mock_gemini_resp = {
        "score": 82,
        "matched_skills": ["python", "fastapi"],
        "missing_skills": [],
        "llm_rationale": "Good match",
        "hard_filter_passed": True,
    }

    with patch("app.services.screening.service.call_gemini_screening") as mock_eval:
        mock_eval.return_value = mock_gemini_resp

        # First call
        r1 = run_screening_task(str(app_id))
        assert r1["status"] == "done"
        assert r1["score"] == 82
        assert mock_eval.call_count == 1

        # Second call
        r2 = run_screening_task(str(app_id))
        assert r2["status"] == "done"
        assert r2["score"] == 82
        assert mock_eval.call_count == 1  # Not called again

    async def _verify():
        async with TestSessionLocal() as session:
            sr_res = await session.execute(
                select(ScreeningResult).where(ScreeningResult.application_id == app_id)
            )
            rows = sr_res.scalars().all()
            assert len(rows) == 1

    asyncio.run(_verify())
