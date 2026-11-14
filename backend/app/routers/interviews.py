from datetime import datetime
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.hr_user import HRUser
from app.schemas.interviews import (
    InterviewCancel,
    InterviewCreate,
    InterviewFeedbackCreate,
    InterviewFeedbackResponse,
    InterviewReschedule,
    InterviewResponse,
)
from app.services.interviews.service import InterviewService

router = APIRouter(tags=["interviews"])


@router.post(
    "/interviews",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule an interview (HR only)",
)
async def schedule_interview(
    payload: InterviewCreate,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Schedules an interview for a shortlisted candidate:
    - Transitions application status: SHORTLISTED -> INTERVIEW_SCHEDULED
    - Enqueues 'interview_invite' email notification
    """
    interview = await InterviewService.schedule_interview(
        db,
        application_id=payload.application_id,
        data=payload,
        created_by_hr_id=current_user.id,
    )
    # Refresh/load relationships for response
    return await InterviewService.get_interview(db, interview_id=interview.id)


@router.get(
    "/interviews/today",
    response_model=List[InterviewResponse],
    summary="Get interviews scheduled for today (HR only)",
)
async def get_today_interviews(
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all interviews scheduled for today (UTC date match) for the dashboard widget.
    """
    return await InterviewService.get_today_interviews(db)


@router.get(
    "/interviews",
    response_model=List[InterviewResponse],
    summary="List interviews with filters (HR only)",
)
async def get_interviews(
    job_role_id: Optional[uuid.UUID] = Query(None, description="Filter by job role ID"),
    status: Optional[str] = Query(None, description="Filter by status: scheduled, completed, cancelled, no_show"),
    date_from: Optional[datetime] = Query(None, description="Filter by minimum scheduled_at"),
    date_to: Optional[datetime] = Query(None, description="Filter by maximum scheduled_at"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns interviews matching the given filters, ordered by scheduled_at ASC.
    """
    filters = {
        "job_role_id": job_role_id,
        "status": status,
        "date_from": date_from,
        "date_to": date_to,
    }
    return await InterviewService.get_interviews(db, filters=filters)


@router.get(
    "/interviews/{id}",
    response_model=InterviewResponse,
    summary="Get single interview by ID (HR only)",
)
async def get_interview(
    id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a single interview with panel feedback and candidate details.
    """
    return await InterviewService.get_interview(db, interview_id=id)


@router.patch(
    "/interviews/{id}/reschedule",
    response_model=InterviewResponse,
    summary="Reschedule an interview (HR only)",
)
async def reschedule_interview(
    id: uuid.UUID,
    payload: InterviewReschedule,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reschedules a scheduled interview to a new future time and dispatches notification.
    """
    await InterviewService.reschedule_interview(
        db,
        interview_id=id,
        new_scheduled_at=payload.scheduled_at,
        new_meeting_link=payload.meeting_link,
        updated_by_hr_id=current_user.id,
    )
    return await InterviewService.get_interview(db, interview_id=id)


@router.post(
    "/interviews/{id}/cancel",
    response_model=InterviewResponse,
    summary="Cancel an interview (HR only)",
)
async def cancel_interview(
    id: uuid.UUID,
    payload: InterviewCancel,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancels an interview with reason. Keeps application in INTERVIEW_SCHEDULED for re-scheduling.
    """
    await InterviewService.cancel_interview(
        db,
        interview_id=id,
        cancellation_reason=payload.cancellation_reason,
        cancelled_by_hr_id=current_user.id,
    )
    return await InterviewService.get_interview(db, interview_id=id)


@router.post(
    "/interviews/{id}/complete",
    response_model=InterviewResponse,
    summary="Mark interview completed (HR only)",
)
async def mark_completed(
    id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks an interview as completed. Atomically transitions application: INTERVIEW_SCHEDULED -> INTERVIEWED.
    """
    await InterviewService.mark_completed(
        db,
        interview_id=id,
        completed_by_hr_id=current_user.id,
    )
    return await InterviewService.get_interview(db, interview_id=id)


@router.post(
    "/interviews/{id}/no-show",
    response_model=InterviewResponse,
    summary="Mark candidate no-show (HR only)",
)
async def mark_no_show(
    id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks an interview as no_show. Records audit note without auto-rejecting.
    """
    await InterviewService.mark_no_show(
        db,
        interview_id=id,
        marked_by_hr_id=current_user.id,
    )
    return await InterviewService.get_interview(db, interview_id=id)


@router.post(
    "/interviews/{id}/feedback",
    response_model=InterviewFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit interview feedback (Assigned panelist only)",
)
async def submit_feedback(
    id: uuid.UUID,
    payload: InterviewFeedbackCreate,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits panel feedback for a completed interview.
    Requires caller to be an assigned panelist or creator.
    """
    return await InterviewService.submit_feedback(
        db,
        interview_id=id,
        feedback_data=payload,
        submitted_by_hr_id=current_user.id,
    )


@router.get(
    "/applications/{app_id}/interviews",
    response_model=List[InterviewResponse],
    summary="Get all interviews for an application (HR only)",
)
async def get_application_interviews(
    app_id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all interviews and feedback rounds for a specific candidate application.
    """
    return await InterviewService.get_application_interviews(db, application_id=app_id)
