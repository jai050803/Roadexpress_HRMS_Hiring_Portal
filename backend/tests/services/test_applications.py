import asyncio
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.job_role import JobRole
from app.models.application import Application


@pytest.mark.asyncio
async def test_gate_passes_when_role_open(client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes):
    """Normal application to an open role with no limits succeeds."""
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "phone": "+91 9876543210",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    response = await client.post("/v1/applications", data=form_data, files=files)
    assert response.status_code == 201
    data = response.json()
    assert "reference_number" in data
    assert data["reference_number"].startswith("APP-")
    assert data["job_title"] == test_role.title


@pytest.mark.asyncio
async def test_gate_rejects_when_deadline_passed(
    client: AsyncClient, test_role_past_deadline: JobRole, dummy_pdf_content: bytes
):
    """Application submitted after deadline is rejected with 409 applications_closed."""
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role_past_deadline.id),
        "name": "Arun Kumar",
        "email": "arun.kumar@example.com",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    response = await client.post("/v1/applications", data=form_data, files=files)
    assert response.status_code == 409
    body = response.json()
    assert body["error"] == "applications_closed"


@pytest.mark.asyncio
async def test_gate_rejects_when_cap_reached(
    client: AsyncClient, test_role_at_capacity: JobRole, dummy_pdf_content: bytes
):
    """Application submitted when cap is reached is rejected with 409 applications_closed."""
    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role_at_capacity.id),
        "name": "Deepak Verma",
        "email": "deepak.verma@example.com",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    response = await client.post("/v1/applications", data=form_data, files=files)
    assert response.status_code == 409
    body = response.json()
    assert body["error"] == "applications_closed"


@pytest.mark.asyncio
async def test_gate_concurrent_submissions_no_oversell(
    client: AsyncClient, test_role_cap_1: JobRole, dummy_pdf_content: bytes
):
    """
    Critical gate test: Send 10 concurrent requests to a role with max_applications = 1.
    Exactly 1 request must succeed (201).
    Exactly 9 requests must be rejected (409 applications_closed).
    applications_count in database must be exactly 1.
    """
    async def make_submission(i: int):
        form_data = {
            "idempotency_key": str(uuid.uuid4()),
            "job_role_id": str(test_role_cap_1.id),
            "name": f"Candidate {i}",
            "email": f"candidate_{i}_{uuid.uuid4().hex[:6]}@example.com",
            "phone": f"+91 98765432{i:02d}",
        }
        files = {"resume": (f"resume_{i}.pdf", dummy_pdf_content, "application/pdf")}
        return await client.post("/v1/applications", data=form_data, files=files)

    tasks = [make_submission(i) for i in range(10)]
    responses = await asyncio.gather(*tasks)

    successes = [r for r in responses if r.status_code == 201]
    rejections = [r for r in responses if r.status_code == 409]

    assert len(successes) == 1, f"Expected 1 success, got {len(successes)}"
    assert len(rejections) == 9, f"Expected 9 rejections, got {len(rejections)}"

    for r in rejections:
        assert r.json()["error"] == "applications_closed"

    # Verify database state using a fresh session
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        role = await session.get(JobRole, test_role_cap_1.id)
        assert role is not None
        assert role.applications_count == 1


@pytest.mark.asyncio
async def test_duplicate_application_rejected(
    client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes
):
    """The same email cannot apply twice to the same role."""
    candidate_email = "duplicate.test@example.com"

    form_data_1 = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Kavita Rao",
        "email": candidate_email,
    }
    files_1 = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    r1 = await client.post("/v1/applications", data=form_data_1, files=files_1)
    assert r1.status_code == 201

    # Second submission with same email to same role
    form_data_2 = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Kavita Rao",
        "email": candidate_email,
    }
    files_2 = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    r2 = await client.post("/v1/applications", data=form_data_2, files=files_2)
    assert r2.status_code == 409
    body = r2.json()
    assert body["error"] == "duplicate_application"


@pytest.mark.asyncio
async def test_idempotency_key_prevents_double_submit(
    client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes
):
    """Submitting the exact same idempotency_key twice returns the same reference number without double-counting."""
    fixed_key = str(uuid.uuid4())
    form_data = {
        "idempotency_key": fixed_key,
        "job_role_id": str(test_role.id),
        "name": "Vikas Patel",
        "email": "vikas.patel@example.com",
    }

    files1 = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}
    r1 = await client.post("/v1/applications", data=form_data, files=files1)
    assert r1.status_code == 201
    ref1 = r1.json()["reference_number"]

    files2 = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}
    r2 = await client.post("/v1/applications", data=form_data, files=files2)
    assert r2.status_code == 201
    ref2 = r2.json()["reference_number"]

    assert ref1 == ref2

    # Check that applications_count is 1
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        role = await session.get(JobRole, test_role.id)
        assert role is not None
        assert role.applications_count == 1


# ─── Service Method Tests for Coverage & Edge Cases ────────────────────────────

@pytest.mark.asyncio
async def test_get_application_service(client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes):
    """ApplicationService.get_application fetches full detail including candidate and history."""
    from app.services.applications.service import ApplicationService
    from tests.conftest import TestSessionLocal

    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Ananya Roy",
        "email": "ananya.roy@example.com",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}
    res = await client.post("/v1/applications", data=form_data, files=files)
    assert res.status_code == 201

    async with TestSessionLocal() as session:
        # Find the application
        stmt = select(Application).where(Application.reference_number == res.json()["reference_number"])
        app_res = await session.execute(stmt)
        app = app_res.scalar_one()

        detail = await ApplicationService.get_application(session, app.id)
        assert detail.id == app.id
        assert detail.candidate.name == "Ananya Roy"
        assert detail.job_title == test_role.title
        assert len(detail.status_history) >= 1

        # Test non-existent application raises 404
        with pytest.raises(Exception) as exc_info:
            await ApplicationService.get_application(session, uuid.uuid4())
        assert "404" in str(exc_info.value)


@pytest.mark.asyncio
async def test_list_applications_service(client: AsyncClient, test_role: JobRole, dummy_pdf_content: bytes):
    """ApplicationService.list_applications supports filtering and pagination."""
    from app.services.applications.service import ApplicationService
    from tests.conftest import TestSessionLocal

    form_data = {
        "idempotency_key": str(uuid.uuid4()),
        "job_role_id": str(test_role.id),
        "name": "Searchable Name",
        "email": "searchable.email@example.com",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}
    res = await client.post("/v1/applications", data=form_data, files=files)
    assert res.status_code == 201

    async with TestSessionLocal() as session:
        # 1. Filter by job_role_id
        res_role = await ApplicationService.list_applications(session, job_role_id=test_role.id)
        assert res_role.total >= 1

        # 2. Filter by status
        res_status = await ApplicationService.list_applications(session, status_filter="APPLIED")
        assert res_status.total >= 1

        # 3. Filter by source
        res_source = await ApplicationService.list_applications(session, source="portal")
        assert res_source.total >= 1

        # 4. Filter by search name
        res_search_name = await ApplicationService.list_applications(session, search="Searchable")
        assert res_search_name.total >= 1

        # 5. Filter by search email
        res_search_email = await ApplicationService.list_applications(session, search="searchable.email")
        assert res_search_email.total >= 1

        # 6. Pagination
        res_page = await ApplicationService.list_applications(session, page=1, limit=5)
        assert len(res_page.items) <= 5


@pytest.mark.asyncio
async def test_track_by_reference_service_errors(test_role: JobRole):
    """ApplicationService.track_by_reference raises 404 on bad reference or mismatching email."""
    from app.services.applications.service import ApplicationService
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        # Non-existent reference
        with pytest.raises(Exception) as exc1:
            await ApplicationService.track_by_reference(
                session, email="test@example.com", reference_number="APP-99999999-9999"
            )
        assert "404" in str(exc1.value)


@pytest.mark.asyncio
async def test_application_service_state_machine_and_bulk(
    test_role: JobRole, hr_user, dummy_pdf_content: bytes
):
    """Test ApplicationService shortlist, reject, bulk operations, and transition validations."""
    from app.services.applications.service import ApplicationService
    from app.models.candidate import Candidate
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        # Create candidate and application
        cand = Candidate(name="State Test", email="state.test@example.com")
        session.add(cand)
        await session.flush()

        app = Application(
            candidate_id=cand.id,
            job_role_id=test_role.id,
            reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
            current_status="SCREENED",
            source="portal",
            idempotency_key=uuid.uuid4(),
            status_version=1,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)

        # 1. Shortlist
        shortlisted = await ApplicationService.shortlist(
            session, application_id=app.id, hr_user_id=hr_user.id, remarks="Passed screening"
        )
        assert shortlisted.current_status == "SHORTLISTED"

        # Verify shortlist audit history has changed_by_type='hr'
        from app.models.status_history import ApplicationStatusHistory
        sh_short_res = await session.execute(
            select(ApplicationStatusHistory).where(
                ApplicationStatusHistory.application_id == app.id,
                ApplicationStatusHistory.to_status == "SHORTLISTED",
            )
        )
        sh_short = sh_short_res.scalar_one()
        assert sh_short.changed_by_type == "hr"
        assert sh_short.changed_by == hr_user.id

        # 2. Reject
        rejected = await ApplicationService.reject(
            session,
            application_id=app.id,
            hr_user_id=hr_user.id,
            reason="not_a_fit",
            remarks="Needs more experience",
            custom_message="Thank you for interviewing.",
        )
        assert rejected.current_status == "REJECTED"

        # Verify reject audit history has changed_by_type='hr'
        sh_rej_res = await session.execute(
            select(ApplicationStatusHistory).where(
                ApplicationStatusHistory.application_id == app.id,
                ApplicationStatusHistory.to_status == "REJECTED",
            )
        )
        sh_rej = sh_rej_res.scalar_one()
        assert sh_rej.changed_by_type == "hr"
        assert sh_rej.changed_by == hr_user.id

        # 3. Transition from terminal state raises 400
        with pytest.raises(Exception) as term_exc:
            await ApplicationService._transition_status(session, app, to_status="SHORTLISTED")
        assert "terminal_state" in str(term_exc.value)

        # 4. Rejecting without reason raises 422
        app.current_status = "SCREENED"
        with pytest.raises(Exception) as r_exc:
            await ApplicationService._transition_status(session, app, to_status="REJECTED", reason="")
        assert "rejection_reason_required" in str(r_exc.value)

        # 5. Invalid transition raises 400
        app.current_status = "APPLIED"
        with pytest.raises(Exception) as inv_exc:
            await ApplicationService._transition_status(session, app, to_status="OFFERED")
        assert "invalid_transition" in str(inv_exc.value)

        # 6. Bulk shortlist with valid and invalid IDs
        res_bulk_short = await ApplicationService.bulk_shortlist(
            session,
            application_ids=[app.id, uuid.uuid4()],
            hr_user_id=hr_user.id,
        )
        assert res_bulk_short.skipped_count >= 1  # APPLIED cannot transition directly to SHORTLISTED

        # 7. Bulk reject without reason raises 422
        with pytest.raises(Exception) as br_exc:
            await ApplicationService.bulk_reject(
                session,
                application_ids=[app.id],
                hr_user_id=hr_user.id,
                reason="",
            )
        assert "rejection_reason_required" in str(br_exc.value)


@pytest.mark.asyncio
async def test_upload_cv_by_hr_validations(hr_user):
    """upload_cv_by_hr validates job role exists and is published."""
    from app.services.applications.service import ApplicationService
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as session:
        # Non-existent role
        with pytest.raises(Exception) as exc1:
            await ApplicationService.upload_cv_by_hr(
                db=session,
                job_role_id=uuid.uuid4(),
                name="Test",
                email="test@example.com",
                phone=None,
                resume=None,
                hr_user_id=hr_user.id,
            )
        assert "404" in str(exc1.value)

        # Draft role
        draft_role = JobRole(
            title="Draft Role Test",
            department="Accounts",
            status="draft",
        )
        session.add(draft_role)
        await session.commit()
        await session.refresh(draft_role)

        with pytest.raises(Exception) as exc2:
            await ApplicationService.upload_cv_by_hr(
                db=session,
                job_role_id=draft_role.id,
                name="Test",
                email="test@example.com",
                phone=None,
                resume=None,
                hr_user_id=hr_user.id,
            )
        assert "invalid_job_status" in str(exc2.value)
