import re
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.job_role import JobRole
from app.services.jobs.service import JobsService


@pytest.mark.asyncio
async def test_create_job_draft(client: AsyncClient, hr_auth_headers: dict):
    """Creating a job defaults to status = draft."""
    payload = {
        "title": "Senior Accounts Lead",
        "department": "Accounts & Finance",
        "employment_type": "full_time",
        "location": "Mumbai, Maharashtra",
        "work_mode": "onsite",
    }
    response = await client.post("/v1/jobs", json=payload, headers=hr_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Senior Accounts Lead"
    assert data["status"] == "draft"
    assert data["applications_count"] == 0
    assert data["jd_text"] is None
    assert data["linkedin_post_copy"] is None


@pytest.mark.asyncio
async def test_publish_job(client: AsyncClient, hr_auth_headers: dict):
    """Publishing a draft generates JD text and LinkedIn copy."""
    payload = {
        "title": "Supply Chain Routing Specialist",
        "department": "Supply Chain",
        "employment_type": "full_time",
        "location": "Bangalore, Karnataka",
        "work_mode": "hybrid",
        "min_experience_years": 4,
        "required_skills": ["Supply Chain Optimization", "Python", "SQL"],
        "responsibilities_text": "Oversee routing efficiency and vendor management.",
    }
    create_res = await client.post("/v1/jobs", json=payload, headers=hr_auth_headers)
    job_id = create_res.json()["id"]

    publish_res = await client.post(f"/v1/jobs/{job_id}/publish", headers=hr_auth_headers)
    assert publish_res.status_code == 200
    job = publish_res.json()
    assert job["status"] == "published"
    assert job["jd_text"] is not None
    assert "Supply Chain Routing Specialist" in job["jd_text"]
    assert "Supply Chain Optimization" in job["jd_text"]
    assert job["linkedin_post_copy"] is not None
    assert "Apply here:" in job["linkedin_post_copy"]


@pytest.mark.asyncio
async def test_close_job(client: AsyncClient, hr_auth_headers: dict):
    """Closing a job transitions status to closed."""
    payload = {
        "title": "Data Analyst — Logistics",
        "department": "Data & Analytics",
    }
    create_res = await client.post("/v1/jobs", json=payload, headers=hr_auth_headers)
    job_id = create_res.json()["id"]

    await client.post(f"/v1/jobs/{job_id}/publish", headers=hr_auth_headers)
    close_res = await client.post(f"/v1/jobs/{job_id}/close", headers=hr_auth_headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"


def test_generate_jd_text_omits_null_fields():
    """`generate_jd_text()` must omit any section whose data field is null/empty. Never print N/A or placeholders."""
    # Case 1: Sparse role with only title & department
    role_sparse = JobRole(
        title="Operations Team Lead",
        department="Operations",
        employment_type=None,
        location=None,
        work_mode=None,
        education_qualification=None,
        min_experience_years=None,
        required_skills=None,
        responsibilities_text=None,
        salary_band=None,
    )
    jd_sparse = JobsService.generate_jd_text(role_sparse)
    assert "Operations Team Lead" in jd_sparse
    assert "N/A" not in jd_sparse
    assert "None" not in jd_sparse
    assert "Education" not in jd_sparse
    assert "Skills" not in jd_sparse
    assert "Responsibilities" not in jd_sparse
    assert "Compensation" not in jd_sparse

    # Case 2: Role with skills and experience, but no education or salary
    role_partial = JobRole(
        title="Backend Software Engineer",
        department="Engineering",
        education_qualification=None,
        min_experience_years=3,
        required_skills=["FastAPI", "PostgreSQL"],
        responsibilities_text="Build high-throughput APIs.",
        salary_band=None,
    )
    jd_partial = JobsService.generate_jd_text(role_partial)
    assert "3 year(s)" in jd_partial
    assert "FastAPI" in jd_partial
    assert "Build high-throughput APIs." in jd_partial
    assert "Education" not in jd_partial
    assert "Compensation" not in jd_partial


def test_generate_linkedin_copy_format():
    """
    generate_linkedin_copy() produces:
    - Role title headline
    - 2-3 sentence plain-text summary
    - "Apply here: {CANDIDATE_PORTAL_URL}/jobs/{id}" link
    - No emojis, no hashtags.
    """
    job_id = uuid.uuid4()
    role = JobRole(
        id=job_id,
        title="Lead Fleet Logistics Engineer",
        department="Engineering",
        location="Bangalore",
        work_mode="hybrid",
        responsibilities_text="Build mission-critical routing engines.",
        required_skills=["Python", "Kafka"],
    )

    copy = JobsService.generate_linkedin_copy(role)
    assert role.title in copy
    assert f"/jobs/{job_id}" in copy
    assert "Apply here:" in copy

    # Assert no hashtags (#)
    assert "#" not in copy

    # Assert no common emojis (checking high unicode ranges)
    emoji_pattern = re.compile(
        "[\U00010000-\U0010ffff]",
        flags=re.UNICODE,
    )
    assert not emoji_pattern.search(copy), "LinkedIn copy must contain no emojis"


@pytest.mark.asyncio
async def test_cannot_edit_published_job_back_to_draft(client: AsyncClient, hr_auth_headers: dict):
    """Published roles cannot be modified to draft."""
    payload = {"title": "HR Operations Specialist", "department": "Human Resources"}
    c_res = await client.post("/v1/jobs", json=payload, headers=hr_auth_headers)
    job_id = c_res.json()["id"]
    await client.post(f"/v1/jobs/{job_id}/publish", headers=hr_auth_headers)

    # Attempt to edit status to draft
    patch_res = await client.patch(
        f"/v1/jobs/{job_id}",
        json={"title": "Updated Title"},
        headers=hr_auth_headers,
    )
    # Published roles cannot be modified via PATCH
    assert patch_res.status_code == 400


@pytest.mark.asyncio
async def test_mark_linkedin_posted(client: AsyncClient, hr_auth_headers: dict):
    """Marking a job as posted toggles linkedin_posted = true and records timestamp."""
    payload = {"title": "Supply Chain Lead", "department": "Supply Chain"}
    c_res = await client.post("/v1/jobs", json=payload, headers=hr_auth_headers)
    job_id = c_res.json()["id"]
    await client.post(f"/v1/jobs/{job_id}/publish", headers=hr_auth_headers)

    post_res = await client.post(f"/v1/jobs/{job_id}/mark-linkedin-posted", headers=hr_auth_headers)
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["linkedin_posted"] is True
    assert data["linkedin_posted_at"] is not None


# ─── Service Layer Edge Cases & Validations ────────────────────────────────────

@pytest.mark.asyncio
async def test_jobs_service_methods_and_validations():
    """Unit tests for JobsService methods, filters, and error handlers."""
    from datetime import datetime, timedelta, timezone
    from tests.conftest import TestSessionLocal
    from app.schemas.jobs import JobCreateRequest, JobUpdateRequest

    jobs_svc = JobsService()

    async with TestSessionLocal() as session:
        # 1. create_job via service
        create_data = JobCreateRequest(
            title="Finance Team Lead",
            department="Accounts",
            work_mode="hybrid",
        )
        job = await jobs_svc.create_job(session, create_data)
        assert job.status == "draft"
        assert job.title == "Finance Team Lead"

        # 2. update_draft_job via service
        update_data = JobUpdateRequest(title="Senior Finance Team Lead")
        updated_job = await jobs_svc.update_draft_job(session, job.id, update_data)
        assert updated_job.title == "Senior Finance Team Lead"

        # 3. get_job
        fetched = await jobs_svc.get_job(session, job.id)
        assert fetched is not None
        assert fetched.id == job.id

        # 4. publish_job
        published = await jobs_svc.publish_job(session, job.id)
        assert published.status == "published"
        assert published.jd_text is not None

        # 5. publish already published raises 400
        with pytest.raises(Exception) as pub_exc:
            await jobs_svc.publish_job(session, job.id)
        assert "role_already_published" in str(pub_exc.value)

        # 6. update published job raises 400
        with pytest.raises(Exception) as edit_exc:
            await jobs_svc.update_draft_job(session, job.id, update_data)
        assert "cannot_edit_published_role" in str(edit_exc.value)

        # 7. close_job
        closed = await jobs_svc.close_job(session, job.id)
        assert closed.status == "closed"

        # 8. close already closed raises 400
        with pytest.raises(Exception) as close_exc:
            await jobs_svc.close_job(session, job.id)
        assert "role_already_closed" in str(close_exc.value)

        # 9. publish closed raises 400
        with pytest.raises(Exception) as pub_closed_exc:
            await jobs_svc.publish_job(session, job.id)
        assert "cannot_publish_closed_role" in str(pub_closed_exc.value)

        # 10. list_all_jobs
        all_jobs = await jobs_svc.list_all_jobs(session, status_filter="closed", department="Accounts")
        assert len(all_jobs) >= 1

        # 11. calculate_still_open logic
        assert jobs_svc.calculate_still_open(closed) is False

        # Role with deadline in past
        past_role = JobRole(
            status="published",
            application_deadline=datetime.now(timezone.utc) - timedelta(days=1),
        )
        assert jobs_svc.calculate_still_open(past_role) is False

        # Role at capacity
        cap_role = JobRole(
            status="published",
            max_applications=5,
            applications_count=5,
        )
        assert jobs_svc.calculate_still_open(cap_role) is False

        # Open role
        open_role = JobRole(
            status="published",
            max_applications=10,
            applications_count=2,
        )
        assert jobs_svc.calculate_still_open(open_role) is True
