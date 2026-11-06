import csv
import io
import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestSessionLocal
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult


async def create_candidate_app_bundle(
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
            phone="+91 9988776655",
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)

        app = Application(
            candidate_id=cand.id,
            job_role_id=role_id,
            reference_number=f"APP-TEST-{uuid.uuid4().hex[:6].upper()}",
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
                parsed_json={"name": name, "email": email, "skills": skills},
            )
            session.add(resume)
            await session.commit()

        if screening_score is not None:
            sr = ScreeningResult(
                application_id=app.id,
                score=screening_score,
                matched_skills=skills[:2] if skills else [],
                missing_skills=[],
                llm_rationale="Evaluation completed",
                hard_filter_passed=hard_filter_passed if hard_filter_passed is not None else True,
            )
            session.add(sr)
            await session.commit()

        return app.id


@pytest.mark.asyncio
async def test_cv_bank_no_filters_paginated(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    GET /cv-bank with no filters returns all applications paginated and sorted by applied_at DESC.
    """
    await create_candidate_app_bundle(
        test_role.id, name="Candidate Alpha", email="alpha@example.com", skills=["python"]
    )
    await create_candidate_app_bundle(
        test_role.id, name="Candidate Beta", email="beta@example.com", skills=["react"]
    )

    response = await client.get("/v1/cv-bank", headers=hr_auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert data["page"] == 1
    assert data["limit"] == 25
    assert len(data["items"]) == 2
    names = [item["candidate_name"] for item in data["items"]]
    assert "Candidate Alpha" in names
    assert "Candidate Beta" in names


@pytest.mark.asyncio
async def test_cv_bank_filter_by_skill(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Filter by skill uses JSONB containment on parsed_json->'skills'
    and matches case-insensitively (e.g. skill=Python matches ['python']).
    """
    await create_candidate_app_bundle(
        test_role.id, name="Pythonista", email="py@example.com", skills=["python", "fastapi"]
    )
    await create_candidate_app_bundle(
        test_role.id, name="Gopher", email="go@example.com", skills=["golang", "kubernetes"]
    )

    # Filter with 'Python'
    res = await client.get("/v1/cv-bank?skill=Python", headers=hr_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["candidate_name"] == "Pythonista"

    # Filter with skill that does not exist
    res_none = await client.get("/v1/cv-bank?skill=rust", headers=hr_auth_headers)
    assert res_none.status_code == 200
    assert res_none.json()["total"] == 0


@pytest.mark.asyncio
async def test_cv_bank_filter_by_min_score(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Filter by min_score=70 returns only applications with screening score >= 70.
    """
    await create_candidate_app_bundle(
        test_role.id, name="High Scorer", email="high@example.com", screening_score=85
    )
    await create_candidate_app_bundle(
        test_role.id, name="Low Scorer", email="low@example.com", screening_score=50
    )

    res = await client.get("/v1/cv-bank?min_score=70", headers=hr_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["candidate_name"] == "High Scorer"
    assert data["items"][0]["screening_score"] == 85


@pytest.mark.asyncio
async def test_cv_bank_filter_by_source(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Filter by source=email_upload returns only HR-uploaded CVs.
    """
    await create_candidate_app_bundle(
        test_role.id, name="Portal Applicant", email="portal@example.com", source="portal"
    )
    await create_candidate_app_bundle(
        test_role.id, name="Email Applicant", email="email@example.com", source="email_upload"
    )

    res = await client.get("/v1/cv-bank?source=email_upload", headers=hr_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["candidate_name"] == "Email Applicant"
    assert data["items"][0]["source"] == "email_upload"


@pytest.mark.asyncio
async def test_cv_bank_search_by_partial_name_and_email(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Free-text search matches candidate name OR email via ILIKE.
    """
    await create_candidate_app_bundle(
        test_role.id, name="Ravi Sharma", email="ravi.operations@example.com"
    )
    await create_candidate_app_bundle(
        test_role.id, name="Deepa Menon", email="deepa@logistics.com"
    )

    # Search by partial name
    res_name = await client.get("/v1/cv-bank?search=ravi", headers=hr_auth_headers)
    assert res_name.status_code == 200
    assert res_name.json()["total"] == 1
    assert res_name.json()["items"][0]["candidate_name"] == "Ravi Sharma"

    # Search by partial email domain
    res_email = await client.get("/v1/cv-bank?search=logistics.com", headers=hr_auth_headers)
    assert res_email.status_code == 200
    assert res_email.json()["total"] == 1
    assert res_email.json()["items"][0]["candidate_name"] == "Deepa Menon"


@pytest.mark.asyncio
async def test_cv_bank_unscreened_returns_null_score(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Applications without screening results return screening_score=null (LEFT JOIN).
    """
    await create_candidate_app_bundle(
        test_role.id, name="Unscreened Cand", email="unscreened@example.com", screening_score=None
    )

    res = await client.get("/v1/cv-bank", headers=hr_auth_headers)
    assert res.status_code == 200
    item = res.json()["items"][0]
    assert item["candidate_name"] == "Unscreened Cand"
    assert item["screening_score"] is None
    assert item["hard_filter_passed"] is None


@pytest.mark.asyncio
async def test_cv_bank_export_csv_streaming(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    GET /cv-bank/export streams a valid CSV with correct headers and data.
    """
    await create_candidate_app_bundle(
        test_role.id,
        name="Export Cand 1",
        email="export1@example.com",
        skills=["python", "fastapi"],
        screening_score=92,
        hard_filter_passed=True,
    )
    await create_candidate_app_bundle(
        test_role.id,
        name="Export Cand 2",
        email="export2@example.com",
        skills=["java"],
        screening_score=60,
        hard_filter_passed=False,
    )

    # Export all
    res = await client.get("/v1/cv-bank/export", headers=hr_auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert 'attachment; filename="cv_bank_export.csv"' in res.headers["content-disposition"]

    content = res.text
    reader = list(csv.reader(io.StringIO(content)))
    assert len(reader) >= 3  # Header + 2 rows

    headers = reader[0]
    expected_headers = [
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
    assert headers == expected_headers

    names = [row[2] for row in reader[1:]]
    assert "Export Cand 1" in names
    assert "Export Cand 2" in names

    # Export filtered by skill=Python
    res_filtered = await client.get("/v1/cv-bank/export?skill=Python", headers=hr_auth_headers)
    assert res_filtered.status_code == 200
    filtered_reader = list(csv.reader(io.StringIO(res_filtered.text)))
    assert len(filtered_reader) == 2  # Header + 1 row
    assert filtered_reader[1][2] == "Export Cand 1"


@pytest.mark.asyncio
async def test_cv_bank_filter_by_date_range_and_job_role(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
):
    """
    Test filtering by job_role_id, status, and from_date / to_date.
    """
    # Candidate 1: 2026-11-01
    dt_nov1 = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)
    await create_candidate_app_bundle(
        test_role.id,
        name="Nov 1 Cand",
        email="nov1@example.com",
        applied_at=dt_nov1,
        status="SCREENED",
    )
    # Candidate 2: 2026-11-10
    dt_nov10 = datetime(2026, 11, 10, 12, 0, 0, tzinfo=timezone.utc)
    await create_candidate_app_bundle(
        test_role.id,
        name="Nov 10 Cand",
        email="nov10@example.com",
        applied_at=dt_nov10,
        status="SHORTLISTED",
    )

    # Filter with from_date=2026-11-05
    res = await client.get(
        f"/v1/cv-bank?job_role_id={test_role.id}&from_date=2026-11-05",
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["candidate_name"] == "Nov 10 Cand"

    # Filter with status=SCREENED
    res_status = await client.get(
        f"/v1/cv-bank?status=SCREENED",
        headers=hr_auth_headers,
    )
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 1
    assert res_status.json()["items"][0]["candidate_name"] == "Nov 1 Cand"


@pytest.mark.asyncio
async def test_cv_bank_requires_authentication(client: AsyncClient):
    """
    GET /cv-bank without auth token returns 401 Unauthorized.
    """
    res = await client.get("/v1/cv-bank")
    assert res.status_code == 401

    res_export = await client.get("/v1/cv-bank/export")
    assert res_export.status_code == 401
