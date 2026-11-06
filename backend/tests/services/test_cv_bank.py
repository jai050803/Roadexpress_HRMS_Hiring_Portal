import csv
import io
import uuid
from datetime import date, datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestSessionLocal
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.schemas.cv_bank import CVBankFilterParams
from app.services.cv_bank.service import CVBankService


async def _seed_cv_candidate(
    role_id: uuid.UUID,
    name: str,
    email: str,
    source: str = "portal",
    status: str = "APPLIED",
    applied_at: datetime = None,
    skills: list = None,
    screening_score: int = None,
    hard_filter_passed: bool = None,
):
    async with TestSessionLocal() as session:
        cand = Candidate(
            name=name,
            email=email,
            phone="+91-9876543299",
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)

        app = Application(
            candidate_id=cand.id,
            job_role_id=role_id,
            reference_number=f"APP-SVC-{uuid.uuid4().hex[:4].upper()}",
            current_status=status,
            source=source,
            idempotency_key=uuid.uuid4(),
            status_version=1,
            applied_at=applied_at or datetime.now(timezone.utc),
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)

        if skills is not None:
            resume = Resume(
                application_id=app.id,
                file_url=f"s3://road-express-resumes/resumes/{app.id}/resume.pdf",
                file_name="resume.pdf",
                parse_status="done",
                parsed_json={"name": name, "skills": skills},
            )
            session.add(resume)
            await session.commit()

        if screening_score is not None:
            sr = ScreeningResult(
                application_id=app.id,
                score=screening_score,
                matched_skills=skills[:2] if skills else [],
                missing_skills=[],
                llm_rationale="Evaluated",
                hard_filter_passed=hard_filter_passed if hard_filter_passed is not None else True,
            )
            session.add(sr)
            await session.commit()

        return app.id


@pytest.mark.asyncio
async def test_cv_bank_service_skill_filter_case_insensitive_jsonb(test_role: JobRole):
    """
    Test CVBankService skill filter uses JSONB containment:
    Candidate with ["Python", "FastAPI"] in parsed_json is matched by skill='python'
    and skill='Python' without LIKE query.
    """
    await _seed_cv_candidate(
        test_role.id,
        name="Python Developer",
        email="py.dev@example.com",
        skills=["Python", "FastAPI", "PostgreSQL"],
    )
    await _seed_cv_candidate(
        test_role.id,
        name="Java Developer",
        email="java.dev@example.com",
        skills=["Java", "Spring", "MySQL"],
    )

    async with TestSessionLocal() as session:
        # Match with lowercase 'python'
        filters_lower = CVBankFilterParams(skill="python")
        res_lower = await CVBankService.search(session, filters_lower)
        assert res_lower.total == 1
        assert res_lower.items[0].candidate_name == "Python Developer"

        # Match with uppercase 'Python'
        filters_upper = CVBankFilterParams(skill="Python")
        res_upper = await CVBankService.search(session, filters_upper)
        assert res_upper.total == 1
        assert res_upper.items[0].candidate_name == "Python Developer"

        # Unmatched skill returns 0
        filters_none = CVBankFilterParams(skill="C++")
        res_none = await CVBankService.search(session, filters_none)
        assert res_none.total == 0


@pytest.mark.asyncio
async def test_cv_bank_service_all_8_filters(test_role: JobRole):
    """
    Test all 8 filter parameters in CVBankService.search:
    1. job_role_id
    2. status
    3. min_score
    4. source
    5. skill
    6. from_date
    7. to_date
    8. search
    """
    d1 = datetime(2026, 11, 2, 10, 0, 0, tzinfo=timezone.utc)
    d2 = datetime(2026, 11, 8, 14, 0, 0, tzinfo=timezone.utc)

    # Candidate 1: matches all target criteria
    await _seed_cv_candidate(
        test_role.id,
        name="Target Candidate",
        email="target.cand@roadexpress.com",
        source="email_upload",
        status="SCREENED",
        applied_at=d2,
        skills=["python", "logistics"],
        screening_score=85,
        hard_filter_passed=True,
    )

    # Candidate 2: different role/status/score
    await _seed_cv_candidate(
        test_role.id,
        name="Other Candidate",
        email="other@roadexpress.com",
        source="portal",
        status="APPLIED",
        applied_at=d1,
        skills=["react"],
        screening_score=40,
        hard_filter_passed=False,
    )

    async with TestSessionLocal() as session:
        # 1. Filter by job_role_id
        res_role = await CVBankService.search(session, CVBankFilterParams(job_role_id=test_role.id))
        assert res_role.total == 2

        # 2. Filter by status
        res_status = await CVBankService.search(session, CVBankFilterParams(status="SCREENED"))
        assert res_status.total == 1
        assert res_status.items[0].candidate_name == "Target Candidate"

        # 3. Filter by min_score
        res_score = await CVBankService.search(session, CVBankFilterParams(min_score=80))
        assert res_score.total == 1
        assert res_score.items[0].candidate_name == "Target Candidate"

        # 4. Filter by source
        res_source = await CVBankService.search(session, CVBankFilterParams(source="email_upload"))
        assert res_source.total == 1
        assert res_source.items[0].candidate_name == "Target Candidate"

        # 5. Filter by skill
        res_skill = await CVBankService.search(session, CVBankFilterParams(skill="logistics"))
        assert res_skill.total == 1
        assert res_skill.items[0].candidate_name == "Target Candidate"

        # 6. Filter by from_date
        res_from = await CVBankService.search(session, CVBankFilterParams(from_date=date(2026, 11, 5)))
        assert res_from.total == 1
        assert res_from.items[0].candidate_name == "Target Candidate"

        # 7. Filter by to_date
        res_to = await CVBankService.search(session, CVBankFilterParams(to_date=date(2026, 11, 4)))
        assert res_to.total == 1
        assert res_to.items[0].candidate_name == "Other Candidate"

        # 8. Filter by search (name / email ILIKE)
        res_search = await CVBankService.search(session, CVBankFilterParams(search="target.cand"))
        assert res_search.total == 1
        assert res_search.items[0].candidate_name == "Target Candidate"


@pytest.mark.asyncio
async def test_cv_bank_service_unscreened_returns_null_score(test_role: JobRole):
    """
    Verify applications without screening results return screening_score=None (LEFT JOIN).
    """
    await _seed_cv_candidate(
        test_role.id,
        name="Pending Candidate",
        email="pending@example.com",
        screening_score=None,
    )

    async with TestSessionLocal() as session:
        res = await CVBankService.search(session, CVBankFilterParams())
        assert res.total == 1
        assert res.items[0].screening_score is None
        assert res.items[0].hard_filter_passed is None


@pytest.mark.asyncio
async def test_cv_bank_service_export_csv_content(test_role: JobRole):
    """
    Test CVBankService.export_csv produces valid CSV headers, rows, and values.
    """
    await _seed_cv_candidate(
        test_role.id,
        name="Export User",
        email="export.user@example.com",
        source="portal",
        status="SCREENED",
        skills=["python", "fastapi"],
        screening_score=95,
        hard_filter_passed=True,
    )

    async with TestSessionLocal() as session:
        response = CVBankService.export_csv(CVBankFilterParams(), db=session)
        assert response.media_type == "text/csv"
        assert 'attachment; filename="cv_bank_export.csv"' in response.headers["Content-Disposition"]

        # Collect streamed chunks
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        csv_text = "".join(chunks)
        reader = list(csv.reader(io.StringIO(csv_text)))
        assert len(reader) == 2  # Header + 1 row

        headers = reader[0]
        assert headers == [
            "Reference Number",
            "Applied Date",
            "Candidate Name",
            "Candidate Email",
            "Candidate Phone",
            "Job Title",
            "Department",
            "Source",
            "Current Status",
            "Screening Score",
            "Hard Filter Passed",
            "Matched Skills",
        ]

        data_row = reader[1]
        assert data_row[2] == "Export User"
        assert data_row[3] == "export.user@example.com"
        assert data_row[7] == "portal"
        assert data_row[8] == "SCREENED"
        assert data_row[9] == "95"
        assert data_row[10] == "Passed"
        assert "python" in data_row[11]
