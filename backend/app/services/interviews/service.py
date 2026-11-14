import contextlib
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

import app.database
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.interview import Interview
from app.models.interview_feedback import InterviewFeedback
from app.models.job_role import JobRole
from app.models.status_history import ApplicationStatusHistory
from app.schemas.interviews import (
    InterviewCancelRequest,
    InterviewFeedbackCreateRequest,
    InterviewFilterParams,
    InterviewRescheduleRequest,
    InterviewScheduleRequest,
)
from app.workers.tasks import send_notification_task

logger = logging.getLogger(__name__)


@contextlib.asynccontextmanager
async def _session_scope(session: Optional[AsyncSession] = None):
    """
    Context manager that yields the given session if provided,
    otherwise acquires a new AsyncSessionLocal, commits on success,
    rolls back on error, and closes.
    """
    if session is not None:
        yield session
    else:
        async with app.database.AsyncSessionLocal() as new_session:
            try:
                yield new_session
                await new_session.commit()
            except Exception:
                await new_session.rollback()
                raise


def _extract_db_and_args(
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
    param_names: List[str],
) -> Tuple[Optional[AsyncSession], Dict[str, Any]]:
    """
    Normalizes calls supporting either (db, arg1, ...) or (arg1, ..., db=db).
    """
    db = kwargs.pop("db", None)
    call_args = list(args)
    if call_args and isinstance(call_args[0], AsyncSession):
        db = call_args.pop(0)

    bound: Dict[str, Any] = {}
    for name, val in zip(param_names, call_args):
        bound[name] = val
    for k, v in kwargs.items():
        bound[k] = v
    return db, bound


def _to_dict(obj: Any) -> Dict[str, Any]:
    if obj is None:
        return {}
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if isinstance(obj, dict):
        return dict(obj)
    return vars(obj)


def _ensure_utc(dt: Union[datetime, str]) -> datetime:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class InterviewService:
    @classmethod
    async def schedule_interview(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Schedules an interview for a shortlisted candidate.
        Atomically updates application status: SHORTLISTED -> INTERVIEW_SCHEDULED.
        Enqueues 'interview_invite' notification.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["application_id", "data", "created_by_hr_id"])
        application_id = bound["application_id"]
        data = bound["data"]
        created_by_hr_id = bound.get("created_by_hr_id")

        app_uuid = uuid.UUID(str(application_id))
        hr_uuid = uuid.UUID(str(created_by_hr_id)) if created_by_hr_id else None

        data_dict = _to_dict(data)

        async with _session_scope(db) as session:
            # 1. Fetch application and validate status
            stmt = select(Application).where(Application.id == app_uuid)
            res = await session.execute(stmt)
            application = res.scalar_one_or_none()

            if not application:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application {app_uuid} not found.",
                )

            if application.current_status != "SHORTLISTED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only shortlisted candidates can be scheduled for an interview.",
                )

            # 2. Validate scheduled_at in the future
            raw_scheduled_at = data_dict.get("scheduled_at")
            if not raw_scheduled_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="scheduled_at is required.",
                )
            scheduled_at = _ensure_utc(raw_scheduled_at)
            now = datetime.now(timezone.utc)
            if scheduled_at <= now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled time must be in the future.",
                )

            # 3. Validate mode-specific requirements
            mode = data_dict.get("mode")
            if not mode or mode not in ("phone", "video", "in_person"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid interview mode. Must be 'phone', 'video', or 'in_person'.",
                )

            meeting_link = data_dict.get("meeting_link")
            location = data_dict.get("location")

            if mode == "video" and not (meeting_link and str(meeting_link).strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Meeting link is required for video interviews.",
                )

            if mode == "in_person" and not (location and str(location).strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Location is required for in-person interviews.",
                )

            interviewer_ids = data_dict.get("interviewer_ids")
            if interviewer_ids:
                interviewer_ids = [uuid.UUID(str(iid)) for iid in interviewer_ids]

            # 4. Insert interview row
            interview = Interview(
                application_id=application.id,
                job_role_id=application.job_role_id,
                scheduled_at=scheduled_at,
                duration_minutes=int(data_dict.get("duration_minutes", 60) or 60),
                mode=mode,
                location=str(location).strip() if location else None,
                meeting_link=str(meeting_link).strip() if meeting_link else None,
                interviewer_ids=interviewer_ids,
                status="scheduled",
                hr_notes=data_dict.get("hr_notes"),
                created_by=hr_uuid,
            )
            session.add(interview)

            # 5. Atomically transition application status
            application.current_status = "INTERVIEW_SCHEDULED"
            application.status_version += 1
            application.updated_at = datetime.now(timezone.utc)

            history_entry = ApplicationStatusHistory(
                application_id=application.id,
                from_status="SHORTLISTED",
                to_status="INTERVIEW_SCHEDULED",
                remarks=None,
                changed_by_type="hr",
                changed_by=hr_uuid,
            )
            session.add(history_entry)

            await session.flush()
            await session.commit()
            await session.refresh(interview)

            # 6. Enqueue notification
            try:
                send_notification_task.delay(
                    str(application.id),
                    "interview_invite",
                    custom_message=f"Scheduled for {scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}",
                )
            except Exception as notif_err:
                logger.warning(f"Could not enqueue interview_invite notification: {notif_err}")

            return interview

    @classmethod
    async def get_interviews(
        cls,
        *args,
        **kwargs,
    ) -> List[Interview]:
        """
        Returns interviews matching filters (job_role_id, status, date_from, date_to)
        ordered by scheduled_at ASC. Eagerly joins Application, Candidate, and JobRole.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["filters"])
        filters = bound.get("filters")
        filter_dict = _to_dict(filters)

        async with _session_scope(db) as session:
            query = (
                select(Interview)
                .join(Application, Interview.application_id == Application.id)
                .join(Candidate, Application.candidate_id == Candidate.id)
                .join(JobRole, Interview.job_role_id == JobRole.id)
                .options(
                    selectinload(Interview.feedback),
                    joinedload(Interview.application).joinedload(Application.candidate),
                    joinedload(Interview.job_role),
                )
            )

            job_role_id = filter_dict.get("job_role_id")
            if job_role_id:
                query = query.where(Interview.job_role_id == uuid.UUID(str(job_role_id)))

            status_val = filter_dict.get("status")
            if status_val:
                query = query.where(Interview.status == status_val)

            date_from = filter_dict.get("date_from")
            if date_from:
                query = query.where(Interview.scheduled_at >= _ensure_utc(date_from))

            date_to = filter_dict.get("date_to")
            if date_to:
                query = query.where(Interview.scheduled_at <= _ensure_utc(date_to))

            query = query.order_by(Interview.scheduled_at.asc())
            result = await session.execute(query)
            interviews = result.scalars().unique().all()

            for it in interviews:
                if it.application and it.application.candidate:
                    it.candidate_name = it.application.candidate.name
                    it.candidate_email = it.application.candidate.email
                if it.job_role:
                    it.job_title = it.job_role.title

            return list(interviews)

    @classmethod
    async def get_today_interviews(
        cls,
        *args,
        **kwargs,
    ) -> List[Interview]:
        """
        Returns all interviews scheduled for today (UTC date match) ordered by scheduled_at ASC.
        """
        db, _ = _extract_db_and_args(args, kwargs, [])

        now_utc = datetime.now(timezone.utc)
        start_of_day = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, 999999, tzinfo=timezone.utc)

        async with _session_scope(db) as session:
            query = (
                select(Interview)
                .join(Application, Interview.application_id == Application.id)
                .join(Candidate, Application.candidate_id == Candidate.id)
                .join(JobRole, Interview.job_role_id == JobRole.id)
                .options(
                    selectinload(Interview.feedback),
                    joinedload(Interview.application).joinedload(Application.candidate),
                    joinedload(Interview.job_role),
                )
                .where(Interview.scheduled_at >= start_of_day, Interview.scheduled_at <= end_of_day)
                .order_by(Interview.scheduled_at.asc())
            )
            result = await session.execute(query)
            interviews = result.scalars().unique().all()

            for it in interviews:
                if it.application and it.application.candidate:
                    it.candidate_name = it.application.candidate.name
                    it.candidate_email = it.application.candidate.email
                if it.job_role:
                    it.job_title = it.job_role.title

            return list(interviews)

    @classmethod
    async def get_application_interviews(
        cls,
        *args,
        **kwargs,
    ) -> List[Interview]:
        """
        Returns all interviews for a specific application, ordered by scheduled_at ASC,
        including associated feedback.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["application_id"])
        application_id = bound["application_id"]
        app_uuid = uuid.UUID(str(application_id))

        async with _session_scope(db) as session:
            query = (
                select(Interview)
                .where(Interview.application_id == app_uuid)
                .options(
                    selectinload(Interview.feedback),
                    joinedload(Interview.application).joinedload(Application.candidate),
                    joinedload(Interview.job_role),
                )
                .order_by(Interview.scheduled_at.asc())
            )
            result = await session.execute(query)
            interviews = result.scalars().unique().all()
            for it in interviews:
                if it.application and it.application.candidate:
                    it.candidate_name = it.application.candidate.name
                    it.candidate_email = it.application.candidate.email
                if it.job_role:
                    it.job_title = it.job_role.title
            return list(interviews)

    @classmethod
    async def get_interview(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Returns a single interview by ID with feedback, application, candidate, and job role.
        Raises 404 if not found.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["interview_id"])
        interview_id = bound["interview_id"]
        int_uuid = uuid.UUID(str(interview_id))

        async with _session_scope(db) as session:
            query = (
                select(Interview)
                .where(Interview.id == int_uuid)
                .options(
                    selectinload(Interview.feedback),
                    joinedload(Interview.application).joinedload(Application.candidate),
                    joinedload(Interview.job_role),
                )
            )
            result = await session.execute(query)
            interview = result.scalar_one_or_none()
            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )
            if interview.application and interview.application.candidate:
                interview.candidate_name = interview.application.candidate.name
                interview.candidate_email = interview.application.candidate.email
            if interview.job_role:
                interview.job_title = interview.job_role.title

            return interview

    @classmethod
    async def reschedule_interview(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Reschedules a scheduled interview to a new future time and updates meeting link if provided.
        Enqueues 'interview_rescheduled' notification.
        """
        db, bound = _extract_db_and_args(
            args, kwargs, ["interview_id", "new_scheduled_at", "new_meeting_link", "updated_by_hr_id"]
        )
        interview_id = bound["interview_id"]
        raw_new_scheduled_at = bound["new_scheduled_at"]
        new_meeting_link = bound.get("new_meeting_link")

        int_uuid = uuid.UUID(str(interview_id))
        new_scheduled_at = _ensure_utc(raw_new_scheduled_at)

        now = datetime.now(timezone.utc)
        if new_scheduled_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be in the future.",
            )

        async with _session_scope(db) as session:
            interview = await session.get(Interview, int_uuid)
            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )

            if interview.status != "scheduled":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only scheduled interviews can be rescheduled.",
                )

            interview.scheduled_at = new_scheduled_at
            if new_meeting_link is not None and str(new_meeting_link).strip():
                interview.meeting_link = str(new_meeting_link).strip()
            interview.updated_at = datetime.now(timezone.utc)

            await session.flush()
            await session.commit()
            await session.refresh(interview)

            try:
                send_notification_task.delay(
                    str(interview.application_id),
                    "interview_rescheduled",
                )
            except Exception as notif_err:
                logger.warning(f"Could not enqueue interview_rescheduled notification: {notif_err}")

            return interview

    @classmethod
    async def cancel_interview(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Cancels an interview, records cancellation reason, and notifies candidate.
        Does NOT roll back application status (remains INTERVIEW_SCHEDULED).
        """
        db, bound = _extract_db_and_args(
            args, kwargs, ["interview_id", "cancellation_reason", "cancelled_by_hr_id"]
        )
        interview_id = bound["interview_id"]
        cancellation_reason = bound.get("cancellation_reason")

        int_uuid = uuid.UUID(str(interview_id))

        async with _session_scope(db) as session:
            interview = await session.get(Interview, int_uuid)
            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )

            interview.status = "cancelled"
            if cancellation_reason:
                interview.cancellation_reason = str(cancellation_reason).strip()
            interview.updated_at = datetime.now(timezone.utc)

            await session.flush()
            await session.commit()
            await session.refresh(interview)

            try:
                send_notification_task.delay(
                    str(interview.application_id),
                    "interview_cancelled",
                )
            except Exception as notif_err:
                logger.warning(f"Could not enqueue interview_cancelled notification: {notif_err}")

            return interview

    @classmethod
    async def mark_completed(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Sets interview.status = 'completed'.
        Atomically transitions application status: INTERVIEW_SCHEDULED -> INTERVIEWED.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["interview_id", "completed_by_hr_id"])
        interview_id = bound["interview_id"]
        completed_by_hr_id = bound.get("completed_by_hr_id")

        int_uuid = uuid.UUID(str(interview_id))
        hr_uuid = uuid.UUID(str(completed_by_hr_id)) if completed_by_hr_id else None

        async with _session_scope(db) as session:
            stmt = (
                select(Interview)
                .options(joinedload(Interview.application))
                .where(Interview.id == int_uuid)
            )
            res = await session.execute(stmt)
            interview = res.scalar_one_or_none()

            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )

            interview.status = "completed"
            interview.updated_at = datetime.now(timezone.utc)

            # Atomically transition application status
            application = interview.application
            if application:
                from_status = application.current_status
                application.current_status = "INTERVIEWED"
                application.status_version += 1
                application.updated_at = datetime.now(timezone.utc)

                history_entry = ApplicationStatusHistory(
                    application_id=application.id,
                    from_status=from_status,
                    to_status="INTERVIEWED",
                    remarks=None,
                    changed_by_type="hr",
                    changed_by=hr_uuid,
                )
                session.add(history_entry)

            await session.flush()
            await session.commit()
            await session.refresh(interview)
            return interview

    @classmethod
    async def mark_no_show(
        cls,
        *args,
        **kwargs,
    ) -> Interview:
        """
        Sets interview.status = 'no_show'.
        Does NOT auto-reject application.
        Writes application_status_history entry with remarks = 'Candidate no-show at scheduled interview'.
        """
        db, bound = _extract_db_and_args(args, kwargs, ["interview_id", "marked_by_hr_id"])
        interview_id = bound["interview_id"]
        marked_by_hr_id = bound.get("marked_by_hr_id")

        int_uuid = uuid.UUID(str(interview_id))
        hr_uuid = uuid.UUID(str(marked_by_hr_id)) if marked_by_hr_id else None

        async with _session_scope(db) as session:
            stmt = (
                select(Interview)
                .options(joinedload(Interview.application))
                .where(Interview.id == int_uuid)
            )
            res = await session.execute(stmt)
            interview = res.scalar_one_or_none()

            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )

            interview.status = "no_show"
            interview.updated_at = datetime.now(timezone.utc)

            application = interview.application
            if application:
                history_entry = ApplicationStatusHistory(
                    application_id=application.id,
                    from_status=application.current_status,
                    to_status=application.current_status,
                    remarks="Candidate no-show at scheduled interview",
                    changed_by_type="hr",
                    changed_by=hr_uuid,
                )
                session.add(history_entry)

            await session.flush()
            await session.commit()
            await session.refresh(interview)
            return interview

    @classmethod
    async def submit_feedback(
        cls,
        *args,
        **kwargs,
    ) -> InterviewFeedback:
        """
        Submits feedback for a completed interview.
        Validates submitting HR user is an assigned panelist or the creator.
        Enforces UNIQUE (interview_id, submitted_by).
        """
        db, bound = _extract_db_and_args(
            args, kwargs, ["interview_id", "feedback_data", "submitted_by_hr_id"]
        )
        interview_id = bound["interview_id"]
        feedback_data = bound["feedback_data"]
        submitted_by_hr_id = bound["submitted_by_hr_id"]

        int_uuid = uuid.UUID(str(interview_id))
        hr_uuid = uuid.UUID(str(submitted_by_hr_id))

        data_dict = _to_dict(feedback_data)

        async with _session_scope(db) as session:
            interview = await session.get(Interview, int_uuid)
            if not interview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interview {int_uuid} not found.",
                )

            if interview.status != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Feedback can only be submitted for completed interviews.",
                )

            # Check authorization: must be in interviewer_ids OR creator
            is_panelist = False
            if interview.interviewer_ids:
                panelist_strs = [str(pid) for pid in interview.interviewer_ids]
                if str(hr_uuid) in panelist_strs:
                    is_panelist = True
            if interview.created_by and str(interview.created_by) == str(hr_uuid):
                is_panelist = True

            if not is_panelist:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only assigned panelists can submit feedback.",
                )

            # Check if feedback already submitted by this panelist
            existing_stmt = select(InterviewFeedback).where(
                InterviewFeedback.interview_id == int_uuid,
                InterviewFeedback.submitted_by == hr_uuid,
            )
            existing_res = await session.execute(existing_stmt)
            if existing_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Feedback already submitted by this panelist.",
                )

            # Validate ratings if provided
            for rating_field in ("overall_rating", "technical_rating", "communication_rating", "culture_rating"):
                val = data_dict.get(rating_field)
                if val is not None:
                    if not (isinstance(val, int) and 1 <= val <= 5):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"{rating_field} must be an integer between 1 and 5.",
                        )

            decision = data_dict.get("decision")
            if decision is not None and decision not in ("proceed", "hold", "reject"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="decision must be one of 'proceed', 'hold', or 'reject'.",
                )

            feedback = InterviewFeedback(
                interview_id=int_uuid,
                submitted_by=hr_uuid,
                overall_rating=data_dict.get("overall_rating"),
                technical_rating=data_dict.get("technical_rating"),
                communication_rating=data_dict.get("communication_rating"),
                culture_rating=data_dict.get("culture_rating"),
                decision=decision,
                strengths=data_dict.get("strengths"),
                concerns=data_dict.get("concerns"),
                additional_notes=data_dict.get("additional_notes"),
            )
            session.add(feedback)
            await session.flush()
            await session.commit()
            await session.refresh(feedback)
            return feedback
