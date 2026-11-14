from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.hr_user import HRUser
from app.models.interview import Interview
from app.models.interview_feedback import InterviewFeedback
from app.models.job_role import JobRole
from app.models.status_history import ApplicationStatusHistory
from app.services.interviews.service import InterviewService
from tests.conftest import TestSessionLocal


@pytest.fixture
async def interview_setup():
    """Sets up an HR user, job role, candidate, and shortlisted application."""
    async with TestSessionLocal() as session:
        # Create HR user 1 (creator)
        hr1 = HRUser(
            name="HR Recruiter",
            email=f"recruiter_{uuid.uuid4().hex[:6]}@roadexpress.com",
            password_hash="mock_hash",
            role="hr",
        )
        # Create HR user 2 (panelist)
        hr2 = HRUser(
            name="Panel Interviewer",
            email=f"panelist_{uuid.uuid4().hex[:6]}@roadexpress.com",
            password_hash="mock_hash",
            role="hr",
        )
        # Create HR user 3 (external / non-panelist)
        hr3 = HRUser(
            name="Other HR",
            email=f"other_{uuid.uuid4().hex[:6]}@roadexpress.com",
            password_hash="mock_hash",
            role="hr",
        )
        session.add_all([hr1, hr2, hr3])

        # Create Job Role
        role = JobRole(
            title="Senior Logistics Engineer",
            department="Supply Chain",
            status="published",
        )
        session.add(role)

        # Create Candidate 1
        candidate1 = Candidate(
            name="Test Interviewee",
            email=f"interviewee_{uuid.uuid4().hex[:6]}@example.com",
            phone="9876543210",
        )
        # Create Candidate 2
        candidate2 = Candidate(
            name="Other Candidate",
            email=f"other_cand_{uuid.uuid4().hex[:6]}@example.com",
            phone="9876543211",
        )
        session.add_all([candidate1, candidate2])
        await session.flush()

        # Create Application in SHORTLISTED status
        app_shortlisted = Application(
            candidate_id=candidate1.id,
            job_role_id=role.id,
            idempotency_key=uuid.uuid4(),
            reference_number=f"APP-TEST-{uuid.uuid4().hex[:6]}",
            current_status="SHORTLISTED",
            source="portal",
        )
        # Create another Application in APPLIED status
        app_applied = Application(
            candidate_id=candidate2.id,
            job_role_id=role.id,
            idempotency_key=uuid.uuid4(),
            reference_number=f"APP-APPLIED-{uuid.uuid4().hex[:6]}",
            current_status="APPLIED",
            source="portal",
        )
        session.add_all([app_shortlisted, app_applied])
        await session.commit()

        await session.refresh(hr1)
        await session.refresh(hr2)
        await session.refresh(hr3)
        await session.refresh(role)
        await session.refresh(candidate1)
        await session.refresh(candidate2)
        await session.refresh(app_shortlisted)
        await session.refresh(app_applied)

        return {
            "hr1": hr1,
            "hr2": hr2,
            "hr3": hr3,
            "role": role,
            "candidate": candidate1,
            "app_shortlisted": app_shortlisted,
            "app_applied": app_applied,
        }


@pytest.mark.asyncio
async def test_schedule_interview_validations(interview_setup):
    setup = interview_setup
    app_applied = setup["app_applied"]
    app_shortlisted = setup["app_shortlisted"]
    hr1 = setup["hr1"]

    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    past_time = datetime.now(timezone.utc) - timedelta(days=1)

    # 1. Non-shortlisted rejection
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.schedule_interview(
            application_id=app_applied.id,
            data={"scheduled_at": future_time, "mode": "video", "meeting_link": "https://meet.google.com/xyz"},
            created_by_hr_id=hr1.id,
        )
    assert exc_info.value.status_code == 400
    assert "Only shortlisted candidates can be scheduled for an interview." in exc_info.value.detail

    # 2. Past time validation
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.schedule_interview(
            application_id=app_shortlisted.id,
            data={"scheduled_at": past_time, "mode": "video", "meeting_link": "https://meet.google.com/xyz"},
            created_by_hr_id=hr1.id,
        )
    assert exc_info.value.status_code == 400
    assert "Scheduled time must be in the future." in exc_info.value.detail

    # 3. Video mode requires meeting_link
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.schedule_interview(
            application_id=app_shortlisted.id,
            data={"scheduled_at": future_time, "mode": "video", "meeting_link": ""},
            created_by_hr_id=hr1.id,
        )
    assert exc_info.value.status_code == 400
    assert "Meeting link is required for video interviews." in exc_info.value.detail

    # 4. In_person mode requires location
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.schedule_interview(
            application_id=app_shortlisted.id,
            data={"scheduled_at": future_time, "mode": "in_person", "location": "   "},
            created_by_hr_id=hr1.id,
        )
    assert exc_info.value.status_code == 400
    assert "Location is required for in-person interviews." in exc_info.value.detail


@pytest.mark.asyncio
async def test_schedule_interview_success_and_transitions(interview_setup):
    setup = interview_setup
    app_shortlisted = setup["app_shortlisted"]
    hr1 = setup["hr1"]
    hr2 = setup["hr2"]

    future_time = datetime.now(timezone.utc) + timedelta(days=3)

    with patch("app.services.interviews.service.send_notification_task.delay") as mock_notif:
        interview = await InterviewService.schedule_interview(
            application_id=app_shortlisted.id,
            data={
                "scheduled_at": future_time,
                "duration_minutes": 45,
                "mode": "video",
                "meeting_link": "https://meet.google.com/abc-defg-hij",
                "interviewer_ids": [hr2.id],
                "hr_notes": "Focus on distributed systems experience.",
            },
            created_by_hr_id=hr1.id,
        )

        assert interview is not None
        assert interview.status == "scheduled"
        assert interview.duration_minutes == 45
        assert interview.meeting_link == "https://meet.google.com/abc-defg-hij"
        assert interview.created_by == hr1.id
        mock_notif.assert_called_once()
        assert mock_notif.call_args[0][0] == str(app_shortlisted.id)
        assert mock_notif.call_args[0][1] == "interview_invite"

    # Verify application transitioned to INTERVIEW_SCHEDULED and status history written
    async with TestSessionLocal() as session:
        app_db = await session.get(Application, app_shortlisted.id)
        assert app_db.current_status == "INTERVIEW_SCHEDULED"

        stmt = select(ApplicationStatusHistory).where(
            ApplicationStatusHistory.application_id == app_shortlisted.id,
            ApplicationStatusHistory.to_status == "INTERVIEW_SCHEDULED",
        )
        res = await session.execute(stmt)
        history = res.scalar_one_or_none()
        assert history is not None
        assert history.from_status == "SHORTLISTED"
        assert history.changed_by_type == "hr"
        assert history.changed_by == hr1.id


@pytest.mark.asyncio
async def test_reschedule_cancel_and_queries(interview_setup):
    setup = interview_setup
    app_shortlisted = setup["app_shortlisted"]
    hr1 = setup["hr1"]

    # 1. Schedule initial interview
    time1 = datetime.now(timezone.utc) + timedelta(days=2)
    interview = await InterviewService.schedule_interview(
        application_id=app_shortlisted.id,
        data={
            "scheduled_at": time1,
            "mode": "video",
            "meeting_link": "https://meet.google.com/initial",
        },
        created_by_hr_id=hr1.id,
    )

    # 2. Reschedule
    new_time = datetime.now(timezone.utc) + timedelta(days=4)
    with patch("app.services.interviews.service.send_notification_task.delay") as mock_notif:
        updated = await InterviewService.reschedule_interview(
            interview_id=interview.id,
            new_scheduled_at=new_time,
            new_meeting_link="https://meet.google.com/rescheduled",
            updated_by_hr_id=hr1.id,
        )
        assert updated.meeting_link == "https://meet.google.com/rescheduled"
        mock_notif.assert_called_once_with(str(app_shortlisted.id), "interview_rescheduled")

    # 3. Get application interviews
    app_interviews = await InterviewService.get_application_interviews(app_shortlisted.id)
    assert len(app_interviews) >= 1
    assert app_interviews[0].id == interview.id

    # 4. Cancel interview
    with patch("app.services.interviews.service.send_notification_task.delay") as mock_notif:
        cancelled = await InterviewService.cancel_interview(
            interview_id=interview.id,
            cancellation_reason="Panelist unavailable",
            cancelled_by_hr_id=hr1.id,
        )
        assert cancelled.status == "cancelled"
        assert cancelled.cancellation_reason == "Panelist unavailable"
        mock_notif.assert_called_once_with(
            str(app_shortlisted.id), "interview_cancelled"
        )

    # Cannot reschedule cancelled interview
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.reschedule_interview(
            interview_id=interview.id,
            new_scheduled_at=datetime.now(timezone.utc) + timedelta(days=5),
        )
    assert exc_info.value.status_code == 400
    assert "Only scheduled interviews can be rescheduled." in exc_info.value.detail


@pytest.mark.asyncio
async def test_mark_completed_and_submit_feedback(interview_setup):
    setup = interview_setup
    app_shortlisted = setup["app_shortlisted"]
    hr1 = setup["hr1"]  # creator
    hr2 = setup["hr2"]  # panelist
    hr3 = setup["hr3"]  # unauthorized

    # Schedule interview with hr2 as panelist
    interview = await InterviewService.schedule_interview(
        application_id=app_shortlisted.id,
        data={
            "scheduled_at": datetime.now(timezone.utc) + timedelta(hours=12),
            "mode": "in_person",
            "location": "Gurugram HQ, Conf Room 4A",
            "interviewer_ids": [hr2.id],
        },
        created_by_hr_id=hr1.id,
    )

    # Cannot submit feedback before completion
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.submit_feedback(
            interview_id=interview.id,
            feedback_data={"overall_rating": 4, "decision": "proceed"},
            submitted_by_hr_id=hr2.id,
        )
    assert exc_info.value.status_code == 400
    assert "Feedback can only be submitted for completed interviews." in exc_info.value.detail

    # Mark completed
    completed = await InterviewService.mark_completed(interview.id, completed_by_hr_id=hr1.id)
    assert completed.status == "completed"

    # Application status moved to INTERVIEWED
    async with TestSessionLocal() as session:
        app_db = await session.get(Application, app_shortlisted.id)
        assert app_db.current_status == "INTERVIEWED"

    # Unauthorized HR user cannot submit feedback
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.submit_feedback(
            interview_id=interview.id,
            feedback_data={"overall_rating": 5, "decision": "proceed"},
            submitted_by_hr_id=hr3.id,
        )
    assert exc_info.value.status_code == 403
    assert "Only assigned panelists can submit feedback." in exc_info.value.detail

    # Assigned panelist submits feedback
    feedback = await InterviewService.submit_feedback(
        interview_id=interview.id,
        feedback_data={
            "overall_rating": 5,
            "technical_rating": 4,
            "communication_rating": 5,
            "culture_rating": 4,
            "decision": "proceed",
            "strengths": "Strong system design skills",
            "concerns": "None",
        },
        submitted_by_hr_id=hr2.id,
    )
    assert feedback is not None
    assert feedback.overall_rating == 5
    assert feedback.decision == "proceed"

    # Duplicate feedback submission is prevented
    with pytest.raises(HTTPException) as exc_info:
        await InterviewService.submit_feedback(
            interview_id=interview.id,
            feedback_data={"overall_rating": 4, "decision": "hold"},
            submitted_by_hr_id=hr2.id,
        )
    assert exc_info.value.status_code == 400
    assert "Feedback already submitted by this panelist." in exc_info.value.detail


@pytest.mark.asyncio
async def test_mark_no_show_and_get_interviews(interview_setup):
    setup = interview_setup
    app_shortlisted = setup["app_shortlisted"]
    hr1 = setup["hr1"]
    role = setup["role"]

    interview = await InterviewService.schedule_interview(
        application_id=app_shortlisted.id,
        data={
            "scheduled_at": datetime.now(timezone.utc) + timedelta(hours=5),
            "mode": "phone",
        },
        created_by_hr_id=hr1.id,
    )

    # Mark no show
    no_show = await InterviewService.mark_no_show(interview.id, marked_by_hr_id=hr1.id)
    assert no_show.status == "no_show"

    # Verify status history logged no-show remarks without changing application status to REJECTED
    async with TestSessionLocal() as session:
        app_db = await session.get(Application, app_shortlisted.id)
        assert app_db.current_status == "INTERVIEW_SCHEDULED"

        stmt = select(ApplicationStatusHistory).where(
            ApplicationStatusHistory.application_id == app_shortlisted.id,
            ApplicationStatusHistory.remarks == "Candidate no-show at scheduled interview",
        )
        res = await session.execute(stmt)
        hist = res.scalar_one_or_none()
        assert hist is not None
        assert hist.changed_by == hr1.id

    # Test get_interviews with filters
    all_role_interviews = await InterviewService.get_interviews(filters={"job_role_id": role.id})
    assert len(all_role_interviews) >= 1
    assert all_role_interviews[0].candidate_name is not None
    assert all_role_interviews[0].job_title is not None

    # Test get_today_interviews
    today_interviews = await InterviewService.get_today_interviews()
    assert len(today_interviews) >= 1
