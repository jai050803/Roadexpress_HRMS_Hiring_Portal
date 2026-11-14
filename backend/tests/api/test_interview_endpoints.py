from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.hr_user import HRUser
from app.models.job_role import JobRole


@pytest.fixture
async def shortlisted_app_for_interviews(db, test_role: JobRole) -> Application:
    cand = Candidate(
        name="Candidate For Interview",
        email=f"cand_interview_{uuid.uuid4().hex[:6]}@example.com",
        phone="+91 9123456789",
    )
    db.add(cand)
    await db.flush()

    app = Application(
        candidate_id=cand.id,
        job_role_id=test_role.id,
        reference_number=f"APP-INT-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SHORTLISTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest.mark.asyncio
async def test_interview_endpoints_lifecycle(
    client: AsyncClient,
    hr_auth_headers: dict,
    hr_user: HRUser,
    shortlisted_app_for_interviews: Application,
    test_role: JobRole,
):
    app = shortlisted_app_for_interviews

    # 1. Unauthorized access fails
    unauth_res = await client.get("/v1/interviews")
    assert unauth_res.status_code == 401

    # 2. Schedule interview: POST /v1/interviews
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    with patch("app.services.interviews.service.send_notification_task.delay"):
        create_res = await client.post(
            "/v1/interviews",
            headers=hr_auth_headers,
            json={
                "application_id": str(app.id),
                "scheduled_at": future_time,
                "duration_minutes": 45,
                "mode": "video",
                "meeting_link": "https://meet.google.com/test-call",
                "interviewer_ids": [str(hr_user.id)],
                "hr_notes": "Prep notes for panel",
            },
        )
    assert create_res.status_code == 201
    created_data = create_res.json()
    interview_id = created_data["id"]
    assert created_data["status"] == "scheduled"
    assert created_data["candidate_name"] == "Candidate For Interview"
    assert created_data["job_title"] == test_role.title
    assert created_data["mode"] == "video"

    # 3. GET /v1/interviews
    list_res = await client.get("/v1/interviews", headers=hr_auth_headers)
    assert list_res.status_code == 200
    interviews = list_res.json()
    assert len(interviews) >= 1
    assert any(i["id"] == interview_id for i in interviews)

    # 4. GET /v1/interviews/today
    today_res = await client.get("/v1/interviews/today", headers=hr_auth_headers)
    assert today_res.status_code == 200
    assert isinstance(today_res.json(), list)

    # 5. GET /v1/interviews/{id}
    single_res = await client.get(f"/v1/interviews/{interview_id}", headers=hr_auth_headers)
    assert single_res.status_code == 200
    assert single_res.json()["id"] == interview_id

    # 6. PATCH /v1/interviews/{id}/reschedule
    reschedule_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    with patch("app.services.interviews.service.send_notification_task.delay"):
        resched_res = await client.patch(
            f"/v1/interviews/{interview_id}/reschedule",
            headers=hr_auth_headers,
            json={
                "scheduled_at": reschedule_time,
                "meeting_link": "https://meet.google.com/rescheduled-call",
            },
        )
    assert resched_res.status_code == 200
    assert resched_res.json()["meeting_link"] == "https://meet.google.com/rescheduled-call"

    # 7. GET /v1/applications/{app_id}/interviews
    app_interviews_res = await client.get(f"/v1/applications/{app.id}/interviews", headers=hr_auth_headers)
    assert app_interviews_res.status_code == 200
    assert len(app_interviews_res.json()) >= 1

    # 8. POST /v1/interviews/{id}/complete
    complete_res = await client.post(f"/v1/interviews/{interview_id}/complete", headers=hr_auth_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # 9. POST /v1/interviews/{id}/feedback
    feedback_res = await client.post(
        f"/v1/interviews/{interview_id}/feedback",
        headers=hr_auth_headers,
        json={
            "overall_rating": 5,
            "technical_rating": 4,
            "communication_rating": 5,
            "culture_rating": 4,
            "decision": "proceed",
            "strengths": "Great communication and architectural reasoning",
            "concerns": "None",
            "additional_notes": "Strong hire",
        },
    )
    assert feedback_res.status_code == 201
    feedback_data = feedback_res.json()
    assert feedback_data["overall_rating"] == 5
    assert feedback_data["decision"] == "proceed"
    assert feedback_data["interview_id"] == interview_id

    # Verify interview now includes feedback in single get
    single_with_fb = await client.get(f"/v1/interviews/{interview_id}", headers=hr_auth_headers)
    assert single_with_fb.status_code == 200
    assert len(single_with_fb.json()["feedback"]) == 1


@pytest.fixture
async def cancel_test_apps(db, test_role: JobRole) -> tuple[Application, Application]:
    cand1 = Candidate(name="Cancel Cand", email=f"cancel_{uuid.uuid4().hex[:6]}@example.com", phone="1234567890")
    cand2 = Candidate(name="NoShow Cand", email=f"noshow_{uuid.uuid4().hex[:6]}@example.com", phone="1234567891")
    db.add_all([cand1, cand2])
    await db.flush()

    app1 = Application(
        candidate_id=cand1.id,
        job_role_id=test_role.id,
        reference_number=f"APP-CAN-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SHORTLISTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    app2 = Application(
        candidate_id=cand2.id,
        job_role_id=test_role.id,
        reference_number=f"APP-NOS-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SHORTLISTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add_all([app1, app2])
    await db.commit()
    await db.refresh(app1)
    await db.refresh(app2)
    return app1, app2


@pytest.mark.asyncio
async def test_interview_cancel_and_no_show_endpoints(
    client: AsyncClient,
    hr_auth_headers: dict,
    cancel_test_apps: tuple[Application, Application],
):
    app1, app2 = cancel_test_apps

    # Schedule interview on app1 for cancel test
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    with patch("app.services.interviews.service.send_notification_task.delay"):
        create1_res = await client.post(
            "/v1/interviews",
            headers=hr_auth_headers,
            json={
                "application_id": str(app1.id),
                "scheduled_at": future_time,
                "mode": "phone",
            },
        )
    assert create1_res.status_code == 201
    int1_id = create1_res.json()["id"]

    # Cancel interview: POST /v1/interviews/{id}/cancel
    with patch("app.services.interviews.service.send_notification_task.delay"):
        cancel_res = await client.post(
            f"/v1/interviews/{int1_id}/cancel",
            headers=hr_auth_headers,
            json={"cancellation_reason": "Candidate requested postponement"},
        )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    assert cancel_res.json()["cancellation_reason"] == "Candidate requested postponement"

    # Schedule interview on app2 for no show test
    with patch("app.services.interviews.service.send_notification_task.delay"):
        create2_res = await client.post(
            "/v1/interviews",
            headers=hr_auth_headers,
            json={
                "application_id": str(app2.id),
                "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "mode": "phone",
            },
        )
    assert create2_res.status_code == 201
    int2_id = create2_res.json()["id"]

    noshow_res = await client.post(f"/v1/interviews/{int2_id}/no-show", headers=hr_auth_headers)
    assert noshow_res.status_code == 200
    assert noshow_res.json()["status"] == "no_show"


@pytest.fixture
async def offer_test_app(db, test_role: JobRole) -> Application:
    cand = Candidate(
        name="Vikram Sethi",
        email=f"vikram_{uuid.uuid4().hex[:6]}@example.com",
        phone="+91-9876543233",
    )
    db.add(cand)
    await db.flush()

    app = Application(
        candidate_id=cand.id,
        job_role_id=test_role.id,
        reference_number=f"APP-VIK-{uuid.uuid4().int % 9000 + 1000}",
        current_status="SHORTLISTED",
        source="portal",
        idempotency_key=uuid.uuid4(),
        status_version=1,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@pytest.mark.asyncio
async def test_application_serializer_includes_upcoming_interview_and_offer_flow(
    client: AsyncClient,
    hr_auth_headers: dict,
    test_role: JobRole,
    offer_test_app: Application,
):
    """
    Test PROMPT-E2 backend requirements:
    1. upcoming_interview serialized in GET /v1/applications/{id} and GET /v1/applications
    2. POST /v1/interviews/{id}/complete transitions to INTERVIEWED
    3. POST /v1/applications/{id}/offer transitions INTERVIEWED -> OFFERED
    """
    app = offer_test_app

    # 1. Schedule interview
    sched_dt = datetime.now(timezone.utc) + timedelta(days=3)
    with patch("app.services.interviews.service.send_notification_task.delay"):
        sched_res = await client.post(
            "/v1/interviews",
            headers=hr_auth_headers,
            json={
                "application_id": str(app.id),
                "scheduled_at": sched_dt.isoformat(),
                "duration_minutes": 45,
                "mode": "video",
                "meeting_link": "https://meet.google.com/abc-defg-hij",
            },
        )
    assert sched_res.status_code == 201
    interview_id = sched_res.json()["id"]

    # 2. Check dossier GET /v1/applications/{id}
    detail_res = await client.get(f"/v1/applications/{app.id}", headers=hr_auth_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["current_status"] == "INTERVIEW_SCHEDULED"
    assert detail_data["upcoming_interview"] is not None
    assert detail_data["upcoming_interview"]["id"] == interview_id
    assert detail_data["upcoming_interview"]["mode"] == "video"
    assert detail_data["upcoming_interview"]["duration_minutes"] == 45

    # 3. Check list GET /v1/applications?job_role_id=...
    list_res = await client.get(f"/v1/applications?job_role_id={test_role.id}", headers=hr_auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    item = next((it for it in list_data["items"] if it["id"] == str(app.id)), None)
    assert item is not None
    assert item["upcoming_interview"] is not None
    assert item["upcoming_interview"]["id"] == interview_id
    assert item["upcoming_interview"]["mode"] == "video"

    # 4. Complete interview: POST /v1/interviews/{interview_id}/complete
    complete_res = await client.post(f"/v1/interviews/{interview_id}/complete", headers=hr_auth_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # Verify application status is now INTERVIEWED
    check_app_res = await client.get(f"/v1/applications/{app.id}", headers=hr_auth_headers)
    assert check_app_res.json()["current_status"] == "INTERVIEWED"

    # 5. Make Offer: POST /v1/applications/{id}/offer
    with patch("app.services.applications.service.send_notification_task.delay"):
        offer_res = await client.post(
            f"/v1/applications/{app.id}/offer",
            headers=hr_auth_headers,
            json={"remarks": "Top candidate, extending lead position offer"},
        )
    assert offer_res.status_code == 200
    offer_data = offer_res.json()
    assert offer_data["current_status"] == "OFFERED"
    assert offer_data["status_label"] == "Offer Extended"
    assert any(h["to_status"] == "OFFERED" for h in offer_data["status_history"])
