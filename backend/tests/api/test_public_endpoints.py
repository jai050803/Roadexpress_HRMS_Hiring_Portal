import uuid
import pytest
from httpx import AsyncClient
from app.models.job_role import JobRole


@pytest.mark.asyncio
async def test_public_jobs_list_returns_only_published(
    client: AsyncClient, test_role: JobRole, hr_auth_headers: dict
):
    """Public GET /v1/jobs returns only status = published roles. Never returns draft or closed."""
    # Create draft role
    await client.post(
        "/v1/jobs",
        json={"title": "Draft Engineering Role", "department": "Engineering"},
        headers=hr_auth_headers,
    )

    # Fetch public jobs
    res = await client.get("/v1/jobs")
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 1
    for r in roles:
        # None should be draft
        assert r["title"] != "Draft Engineering Role"
        # Never expose internal applications_count
        assert "applications_count" not in r


@pytest.mark.asyncio
async def test_public_job_detail(client: AsyncClient, test_role: JobRole):
    """Public GET /v1/jobs/{id} returns job details."""
    res = await client.get(f"/v1/jobs/{test_role.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(test_role.id)
    assert data["title"] == test_role.title


@pytest.mark.asyncio
async def test_public_application_submission_and_tracking(
    client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes
):
    """Submits an application and subsequently tracks it with email and reference number."""
    candidate_email = "rohit.sen@example.com"
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Rohit Sen",
        "email": candidate_email,
        "phone": "+91 9123456789",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    submit_res = await client.post("/v1/applications", data=form_data, files=files)
    assert submit_res.status_code == 201
    submit_data = submit_res.json()
    ref_num = submit_data["reference_number"]

    # Track application
    track_res = await client.get(
        f"/v1/applications/track?email={candidate_email}&reference_number={ref_num}"
    )
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["reference_number"] == ref_num
    assert track_data["status_stage"] == 1
    assert track_data["status_label"] == "Application Received"
    assert track_data["job_title"] == test_role.title


@pytest.mark.asyncio
async def test_public_track_unknown_returns_404(client: AsyncClient):
    """Tracking with unknown email or reference returns 404."""
    track_res = await client.get(
        "/v1/applications/track?email=nonexistent@example.com&reference_number=APP-20261105-9999"
    )
    assert track_res.status_code == 404
    body = track_res.json()
    assert body["error"] == "not_found"


@pytest.mark.asyncio
async def test_public_application_rejects_non_pdf(client: AsyncClient, test_role: JobRole):
    """Uploading a non-PDF file returns 400."""
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Invalid File Candidate",
        "email": "invalid.file@example.com",
    }
    files = {"resume": ("resume.docx", b"PK\x03\x04...", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}

    res = await client.post("/v1/applications", data=form_data, files=files)
    assert res.status_code == 400
    assert "PDF" in res.json()["message"]


@pytest.mark.asyncio
async def test_public_application_rejects_oversized_file(client: AsyncClient, test_role: JobRole):
    """Uploading a file exceeding 5MB returns 400."""
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Oversized Candidate",
        "email": "oversized@example.com",
    }
    oversized_bytes = b"%PDF-1.4 " + (b"0" * (6 * 1024 * 1024))
    files = {"resume": ("huge.pdf", oversized_bytes, "application/pdf")}

    res = await client.post("/v1/applications", data=form_data, files=files)
    assert res.status_code == 400
    assert "5MB" in res.json()["message"]
