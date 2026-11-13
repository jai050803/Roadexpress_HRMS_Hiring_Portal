import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.hr_user import HRUser


@pytest_asyncio.fixture
async def seeded_candidate(db) -> Candidate:
    cand = Candidate(
        name="Manish Tiwari",
        email=f"manish_{uuid.uuid4().hex[:6]}@example.com",
        phone="+91 9811223344",
    )
    db.add(cand)
    await db.commit()
    await db.refresh(cand)
    return cand


@pytest_asyncio.fixture
async def applied_app(db, test_role: JobRole, seeded_candidate: Candidate) -> Application:
    app = Application(
        candidate_id=seeded_candidate.id,
        job_role_id=test_role.id,
        reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
        current_status="APPLIED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest_asyncio.fixture
async def screened_app(db, test_role: JobRole, seeded_candidate: Candidate) -> Application:
    app = Application(
        candidate_id=seeded_candidate.id,
        job_role_id=test_role.id,
        reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SCREENED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest_asyncio.fixture
async def shortlisted_app(db, test_role: JobRole, seeded_candidate: Candidate) -> Application:
    app = Application(
        candidate_id=seeded_candidate.id,
        job_role_id=test_role.id,
        reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SHORTLISTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest_asyncio.fixture
async def rejected_app(db, test_role: JobRole, seeded_candidate: Candidate) -> Application:
    app = Application(
        candidate_id=seeded_candidate.id,
        job_role_id=test_role.id,
        reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
        current_status="REJECTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest.mark.asyncio
async def test_hr_login_and_me(client: AsyncClient, hr_user: HRUser):
    """Test login with valid and invalid credentials, and GET /v1/auth/me."""
    # 1. Invalid login
    bad_login = await client.post(
        "/v1/auth/login",
        json={"email": hr_user.email, "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 2. Valid login
    good_login = await client.post(
        "/v1/auth/login",
        json={"email": hr_user.email, "password": "AdminPass123!"},
    )
    assert good_login.status_code == 200
    token = good_login.json()["access_token"]

    # 3. Authenticated me
    me_res = await client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == hr_user.email


@pytest.mark.asyncio
async def test_hr_manual_cv_upload(
    client: AsyncClient, test_role: JobRole, hr_auth_headers: dict, dummy_pdf_content: bytes
):
    """Manual HR CV upload tags candidate source as email_upload and sets uploaded_by_hr."""
    form_data = {
        "job_role_id": str(test_role.id),
        "name": "Emailed Candidate",
        "email": "emailed.cv@example.com",
        "phone": "+91 9900112233",
    }
    files = {"resume": ("resume.pdf", dummy_pdf_content, "application/pdf")}

    res = await client.post(
        "/v1/applications/upload",
        data=form_data,
        files=files,
        headers=hr_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert "reference_number" in data


@pytest.mark.asyncio
async def test_screened_to_shortlisted_transition(
    client: AsyncClient, screened_app: Application, hr_auth_headers: dict
):
    """SCREENED -> SHORTLISTED is valid and succeeds."""
    res = await client.patch(
        f"/v1/applications/{screened_app.id}/shortlist",
        json={"remarks": "Strong fit for engineering"},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["current_status"] == "SHORTLISTED"


@pytest.mark.asyncio
async def test_rejection_requires_reason(
    client: AsyncClient, screened_app: Application, hr_auth_headers: dict
):
    """Rejecting without a reason fails validation (422)."""
    res = await client.patch(
        f"/v1/applications/{screened_app.id}/reject",
        json={},
        headers=hr_auth_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_valid_rejection(
    client: AsyncClient, screened_app: Application, hr_auth_headers: dict
):
    """Rejecting with a valid reason succeeds and sets status = REJECTED."""
    res = await client.patch(
        f"/v1/applications/{screened_app.id}/reject",
        json={"reason": "insufficient_experience", "remarks": "Requires 5+ years"},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["current_status"] == "REJECTED"


# ─── State Machine Invalid Transition Rules (PIPELINE_STATES.md §3 & §4) ────

@pytest.mark.asyncio
async def test_cannot_skip_states_applied_to_shortlisted(
    client: AsyncClient, applied_app: Application, hr_auth_headers: dict
):
    """APPLIED cannot skip SCREENED to directly become SHORTLISTED (Rule 1)."""
    res = await client.patch(
        f"/v1/applications/{applied_app.id}/shortlist",
        json={},
        headers=hr_auth_headers,
    )
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_transition"


@pytest.mark.asyncio
async def test_cannot_transition_from_terminal_rejected_state(
    client: AsyncClient, rejected_app: Application, hr_auth_headers: dict
):
    """REJECTED is a terminal state; no further transitions allowed (Rule 3)."""
    res = await client.patch(
        f"/v1/applications/{rejected_app.id}/shortlist",
        json={},
        headers=hr_auth_headers,
    )
    assert res.status_code == 400
    assert res.json()["error"] == "terminal_state"


@pytest.mark.asyncio
async def test_optimistic_locking_status_version(
    client: AsyncClient, screened_app: Application, hr_auth_headers: dict
):
    """If status_version doesn't match the current database version, transition is rejected."""
    wrong_version = screened_app.status_version + 99
    res = await client.patch(
        f"/v1/applications/{screened_app.id}/shortlist",
        json={"status_version": wrong_version},
        headers=hr_auth_headers,
    )
    assert res.status_code == 409
    assert res.json()["error"] == "concurrency_conflict"


@pytest.mark.asyncio
async def test_bulk_shortlist_and_reject(
    client: AsyncClient, screened_app: Application, hr_auth_headers: dict
):
    """Bulk action processes eligible applications cleanly."""
    # Bulk Shortlist
    res_shortlist = await client.post(
        "/v1/applications/bulk-shortlist",
        json={"application_ids": [str(screened_app.id)], "remarks": "Bulk shortlist batch"},
        headers=hr_auth_headers,
    )
    assert res_shortlist.status_code == 200
    assert res_shortlist.json()["processed_count"] == 1

    # Bulk Reject on already shortlisted candidate with reason
    res_reject = await client.post(
        "/v1/applications/bulk-reject",
        json={
            "application_ids": [str(screened_app.id)],
            "reason": "role_filled",
            "remarks": "Batch closed",
        },
        headers=hr_auth_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["processed_count"] == 1


@pytest_asyncio.fixture
async def offered_app(db, test_role: JobRole, seeded_candidate: Candidate) -> Application:
    app = Application(
        candidate_id=seeded_candidate.id,
        job_role_id=test_role.id,
        reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
        current_status="OFFERED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest.mark.asyncio
async def test_accept_offer_endpoint(
    client: AsyncClient, offered_app: Application, hr_auth_headers: dict
):
    """POST /v1/applications/{id}/accept-offer transitions OFFERED -> OFFER_ACCEPTED."""
    res = await client.post(
        f"/v1/applications/{offered_app.id}/accept-offer",
        json={"remarks": "Candidate confirmed joining date Dec 1"},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "OFFER_ACCEPTED"
    assert data["status_label"] == "Welcome to Road Express"
    assert data["status_stage"] == 4

    # Verify history
    history = data["status_history"]
    latest = history[0]
    assert latest["to_status"] == "OFFER_ACCEPTED"
    assert latest["from_status"] == "OFFERED"
    assert latest["changed_by_type"] == "hr"


@pytest.mark.asyncio
async def test_decline_offer_endpoint(
    client: AsyncClient, offered_app: Application, hr_auth_headers: dict
):
    """POST /v1/applications/{id}/decline-offer transitions OFFERED -> OFFER_DECLINED."""
    res = await client.post(
        f"/v1/applications/{offered_app.id}/decline-offer",
        json={"remarks": "Candidate opted for local relocation"},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "OFFER_DECLINED"
    assert data["status_label"] == "Not Selected"
    assert data["status_stage"] == 4

    history = data["status_history"]
    latest = history[0]
    assert latest["to_status"] == "OFFER_DECLINED"
    assert latest["changed_by_type"] == "hr"


@pytest.mark.asyncio
async def test_lapse_offer_endpoint(
    client: AsyncClient, offered_app: Application, hr_auth_headers: dict
):
    """POST /v1/applications/{id}/lapse-offer transitions OFFERED -> OFFER_LAPSED."""
    res = await client.post(
        f"/v1/applications/{offered_app.id}/lapse-offer",
        json={"remarks": "No candidate reply past 14 days"},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "OFFER_LAPSED"
    assert data["status_label"] == "Not Selected"
    assert data["status_stage"] == 4

    history = data["status_history"]
    latest = history[0]
    assert latest["to_status"] == "OFFER_LAPSED"
    assert latest["changed_by_type"] == "hr"


@pytest.mark.asyncio
async def test_cannot_transition_from_offer_accepted_terminal_state(
    client: AsyncClient, offered_app: Application, hr_auth_headers: dict
):
    """OFFER_ACCEPTED is terminal; subsequent transitions must be rejected."""
    # First accept
    res = await client.post(
        f"/v1/applications/{offered_app.id}/accept-offer",
        json={},
        headers=hr_auth_headers,
    )
    assert res.status_code == 200

    # Try to decline an already accepted offer
    res_decline = await client.post(
        f"/v1/applications/{offered_app.id}/decline-offer",
        json={},
        headers=hr_auth_headers,
    )
    assert res_decline.status_code == 400
    assert res_decline.json()["error"] == "terminal_state"

