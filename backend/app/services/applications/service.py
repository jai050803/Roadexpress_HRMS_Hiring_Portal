import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.models.status_history import ApplicationStatusHistory
from app.schemas.applications import (
    ApplicationDetailResponse,
    ApplicationListItemResponse,
    ApplicationListResponse,
    ApplicationSubmitResponse,
    ApplicationTrackResponse,
    BulkActionResponse,
    CandidateInfo,
    ResumeInfo,
    ScreeningResultInfo,
    StatusHistoryItem,
    UpcomingInterviewInfo,
)
from app.services.auth.service import get_redis_client
from app.services.candidates.service import CandidateService
from app.services.resumes.service import ResumeService
from app.utils.reference_number import generate_reference_number
from app.utils.storage import generate_presigned_download_url
from app.workers.tasks import send_notification_task

logger = logging.getLogger(__name__)


STATUS_MAPPING: Dict[str, Dict[str, Any]] = {
    "APPLIED": {"label": "Application Received", "stage": 1},
    "SCREENED": {"label": "Under Review", "stage": 2},
    "SHORTLISTED": {"label": "Shortlisted  -  Interview Details Sent", "stage": 3},
    "INTERVIEW_SCHEDULED": {"label": "Shortlisted  -  Interview Details Sent", "stage": 3},
    "INTERVIEWED": {"label": "Under Review", "stage": 2},
    "OFFERED": {"label": "Offer Extended", "stage": 3},
    "OFFER_ACCEPTED": {"label": "Welcome to Road Express", "stage": 4},
    "OFFER_DECLINED": {"label": "Not Selected", "stage": 4},
    "OFFER_LAPSED": {"label": "Not Selected", "stage": 4},
    "REJECTED": {"label": "Not Selected", "stage": 4},
    "CLOSED": {"label": "Not Selected", "stage": 4},
}

VALID_TRANSITIONS: Dict[str, List[str]] = {
    "APPLIED": ["SCREENED", "REJECTED"],
    "SCREENED": ["SHORTLISTED", "REJECTED"],
    "SHORTLISTED": ["INTERVIEW_SCHEDULED", "REJECTED"],
    "INTERVIEW_SCHEDULED": ["INTERVIEWED", "REJECTED"],
    "INTERVIEWED": ["OFFERED", "REJECTED"],
    "OFFERED": ["OFFER_ACCEPTED", "OFFER_DECLINED", "OFFER_LAPSED", "CLOSED", "REJECTED"],
}

TERMINAL_STATES = {
    "REJECTED",
    "CLOSED",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "OFFER_LAPSED",
}


class ApplicationService:
    @staticmethod
    def _get_status_meta(status_code: str) -> Dict[str, Any]:
        return STATUS_MAPPING.get(status_code, {"label": "Under Review", "stage": 2})

    @classmethod
    async def _run_gate(cls, db: AsyncSession, job_role_id: uuid.UUID) -> int:
        """
        Executes the atomic application gate query.
        Updates applications_count if and only if:
        - status = 'published'
        - applications_count < max_applications (or max_applications is null)
        - application_deadline > now() (or deadline is null)
        Returns the new applications_count.
        Raises 409 if gate fails.
        """
        stmt = text(
            """
            UPDATE job_roles
            SET applications_count = applications_count + 1
            WHERE id = :job_role_id
              AND status = 'published'
              AND (max_applications IS NULL OR applications_count < max_applications)
              AND (application_deadline IS NULL OR application_deadline > now())
            RETURNING applications_count;
            """
        )
        result = await db.execute(stmt, {"job_role_id": job_role_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "applications_closed", "message": "Applications for this role are no longer being accepted."},
            )
        return row[0]

    @classmethod
    async def _log_history(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        from_status: Optional[str],
        to_status: str,
        reason: Optional[str] = None,
        remarks: Optional[str] = None,
        changed_by: Optional[uuid.UUID] = None,
        changed_by_type: str = "hr",
    ) -> ApplicationStatusHistory:
        history_entry = ApplicationStatusHistory(
            application_id=application_id,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            remarks=remarks,
            changed_by=changed_by,
            changed_by_type=changed_by_type,
        )
        db.add(history_entry)
        await db.flush()
        return history_entry

    @classmethod
    async def _transition_status(
        cls,
        db: AsyncSession,
        application: Application,
        to_status: str,
        reason: Optional[str] = None,
        remarks: Optional[str] = None,
        changed_by: Optional[uuid.UUID] = None,
        changed_by_type: str = "hr",
        expected_version: Optional[int] = None,
    ) -> Application:
        """
        Enforces state machine rules:
        - Terminal states accept no transitions
        - Only forward valid transitions allowed
        - Rejection requires a mandatory reason
        - Optimistic locking via status_version
        - Logs history entry
        """
        current_status = application.current_status

        if current_status in TERMINAL_STATES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "terminal_state",
                    "message": f"Application is already in terminal state '{current_status}' and cannot be transitioned.",
                },
            )

        allowed = VALID_TRANSITIONS.get(current_status, [])
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_transition",
                    "message": f"Cannot transition application from '{current_status}' to '{to_status}'.",
                },
            )

        if to_status == "REJECTED":
            if not reason or not reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error": "rejection_reason_required",
                        "message": "Rejection reason is mandatory when transitioning to REJECTED.",
                    },
                )

        if expected_version is not None and application.status_version != expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "concurrency_conflict",
                    "message": "Application has been modified by another user. Please refresh and try again.",
                },
            )

        from_status = application.current_status
        application.current_status = to_status
        application.status_version += 1

        await cls._log_history(
            db=db,
            application_id=application.id,
            from_status=from_status,
            to_status=to_status,
            reason=reason.strip() if reason else None,
            remarks=remarks.strip() if remarks else None,
            changed_by=changed_by,
            changed_by_type=changed_by_type,
        )

        await db.flush()
        return application

    @classmethod
    async def submit_application(
        cls,
        db: AsyncSession,
        idempotency_key: uuid.UUID,
        job_role_id: uuid.UUID,
        name: str,
        email: str,
        phone: Optional[str],
        resume: UploadFile,
        source: str = "portal",
        uploaded_by_hr: Optional[uuid.UUID] = None,
    ) -> ApplicationSubmitResponse:
        """
        Candidate application submission flow:
        1. Check idempotency key first. If matches existing, return 201 no-op with existing reference number.
        2. Check for duplicate candidate application to this job role.
        3. Verify job role exists and is published.
        4. Run atomic gate (increments applications_count).
        5. Upsert candidate by email.
        6. Generate reference number (APP-YYYYMMDD-NNNN).
        7. Save resume file to storage.
        8. Insert application record.
        9. Insert resume record & link to application.
        10. Insert initial status history entry (APPLIED).
        11. Commit transaction.
        """
        # 1. Idempotency Check
        existing_stmt = (
            select(Application)
            .options(joinedload(Application.job_role))
            .where(Application.idempotency_key == idempotency_key)
        )
        res = await db.execute(existing_stmt)
        existing_app = res.scalar_one_or_none()
        if existing_app:
            return ApplicationSubmitResponse(
                reference_number=existing_app.reference_number,
                job_title=existing_app.job_role.title,
                message="Application submitted successfully",
            )

        # 2. Check for duplicate application by candidate email + job role
        candidate = await CandidateService.get_candidate_by_email(db, email)
        if candidate:
            dup_stmt = select(Application.id).where(
                Application.candidate_id == candidate.id,
                Application.job_role_id == job_role_id,
            )
            dup_res = await db.execute(dup_stmt)
            if dup_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error": "duplicate_application",
                        "message": "You have already applied for this role.",
                    },
                )

        # 3. Check Job Role Existence
        job_stmt = select(JobRole).where(JobRole.id == job_role_id)
        job_res = await db.execute(job_stmt)
        job_role = job_res.scalar_one_or_none()
        if not job_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found."},
            )

        # 4. Run the Atomic Gate (checks status, deadline, cap and increments applications_count)
        await cls._run_gate(db, job_role_id)

        # 5. Upsert Candidate
        candidate = await CandidateService.upsert_candidate(
            db=db,
            email=email,
            name=name,
            phone=phone,
        )

        # 6. Generate Reference Number
        ref_number = await generate_reference_number(db)

        # Create application entity
        app_id = uuid.uuid4()
        application = Application(
            id=app_id,
            candidate_id=candidate.id,
            job_role_id=job_role_id,
            applied_at=datetime.now(timezone.utc),
            source=source,
            idempotency_key=idempotency_key,
            reference_number=ref_number,
            current_status="APPLIED",
            status_version=1,
            uploaded_by_hr=uploaded_by_hr,
        )
        db.add(application)
        await db.flush()

        # 7. Upload resume via ResumeService (validates PDF, size, uploads to S3/MinIO, enqueues celery task)
        await ResumeService.upload_resume(
            db=db,
            file=resume,
            application_id=app_id,
            job_role_id=job_role_id,
        )

        # 8. Log initial status history row
        await cls._log_history(
            db=db,
            application_id=app_id,
            from_status=None,
            to_status="APPLIED",
            reason=None,
            remarks="Application submitted via candidate portal" if not uploaded_by_hr else "Uploaded by HR",
            changed_by=uploaded_by_hr,
            changed_by_type="hr" if uploaded_by_hr else "system",
        )

        # 9. Commit transaction
        await db.commit()

        # Record idempotency key in Redis with 48h TTL (172800s)
        try:
            redis_client = get_redis_client()
            redis_client.set(f"idempotency:{idempotency_key}", ref_number, ex=172800)
        except Exception as r_err:
            logger.error(f"Failed to set idempotency in redis: {r_err}")

        # 10. Asynchronously trigger application acknowledgement notification
        try:
            send_notification_task.delay(str(app_id), "applied_ack")
        except Exception:
            pass

        return ApplicationSubmitResponse(
            reference_number=ref_number,
            job_title=job_role.title,
            message="Application submitted successfully",
        )

    @classmethod
    async def upload_cv_by_hr(
        cls,
        db: AsyncSession,
        job_role_id: uuid.UUID,
        name: str,
        email: str,
        phone: Optional[str],
        resume: UploadFile,
        hr_user_id: uuid.UUID,
        idempotency_key: Optional[uuid.UUID] = None,
    ) -> ApplicationSubmitResponse:
        """
        HR manual CV upload flow (source: 'email_upload').
        Validates that the target job role is published before running the gate.
        """
        # Validate job role status before gate (HR cannot upload to draft or closed roles)
        job_stmt = select(JobRole).where(JobRole.id == job_role_id)
        job_res = await db.execute(job_stmt)
        job_role = job_res.scalar_one_or_none()
        if not job_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found."},
            )
        if job_role.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_job_status",
                    "message": f"Cannot upload resume: job role status is '{job_role.status}'. Resumes can only be uploaded to published roles.",
                },
            )

        key = idempotency_key or uuid.uuid4()
        resp = await cls.submit_application(
            db=db,
            idempotency_key=key,
            job_role_id=job_role_id,
            name=name,
            email=email,
            phone=phone,
            resume=resume,
            source="email_upload",
            uploaded_by_hr=hr_user_id,
        )
        resp.message = "Candidate CV uploaded successfully"
        return resp

    @classmethod
    async def track_by_reference(
        cls,
        db: AsyncSession,
        email: str,
        reference_number: str,
    ) -> ApplicationTrackResponse:
        """
        Public candidate tracking endpoint.
        Returns plain-language label and stage number.
        """
        clean_ref = reference_number.strip().upper()
        clean_email = email.strip().lower()

        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.reference_number == clean_ref)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()

        if not application or application.candidate.email.lower() != clean_email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "not_found",
                    "message": "No application found matching the provided details.",
                },
            )

        meta = cls._get_status_meta(application.current_status)

        return ApplicationTrackResponse(
            reference_number=application.reference_number,
            job_title=application.job_role.title,
            applied_at=application.applied_at,
            status_label=meta["label"],
            status_stage=meta["stage"],
        )

    @staticmethod
    def _extract_upcoming_interview(interviews: Any) -> Optional[UpcomingInterviewInfo]:
        if not interviews:
            return None
        scheduled = [it for it in interviews if getattr(it, "status", None) == "scheduled"]
        if scheduled:
            target = min(scheduled, key=lambda x: x.scheduled_at)
        else:
            target = max(interviews, key=lambda x: x.scheduled_at)
        return UpcomingInterviewInfo(
            id=target.id,
            scheduled_at=target.scheduled_at,
            duration_minutes=target.duration_minutes,
            mode=target.mode,
            status=target.status,
            meeting_link=target.meeting_link,
            location=target.location,
        )

    @classmethod
    async def get_application(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
    ) -> ApplicationDetailResponse:
        """
        Get full application details for HR portal.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
                joinedload(Application.resume),
                joinedload(Application.screening_result),
                selectinload(Application.status_history),
                selectinload(Application.interviews),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        meta = cls._get_status_meta(app.current_status)

        candidate_info = CandidateInfo(
            id=app.candidate.id,
            name=app.candidate.name,
            email=app.candidate.email,
            phone=app.candidate.phone,
            created_at=app.candidate.created_at,
        )

        resume_info = None
        if app.resume:
            presigned_url = generate_presigned_download_url(app.resume.file_url)
            resume_info = ResumeInfo(
                id=app.resume.id,
                file_name=app.resume.file_name,
                file_url=app.resume.file_url,
                download_url=presigned_url,
                file_size_bytes=app.resume.file_size_bytes,
                parse_status=app.resume.parse_status,
                parsed_json=app.resume.parsed_json,
                parse_error=app.resume.parse_error,
                parsed_at=app.resume.parsed_at,
                created_at=app.resume.created_at,
            )

        screening_info = None
        if app.screening_result:
            screening_info = ScreeningResultInfo(
                id=app.screening_result.id,
                score=app.screening_result.score,
                matched_skills=app.screening_result.matched_skills or [],
                missing_skills=app.screening_result.missing_skills or [],
                hard_filter_passed=app.screening_result.hard_filter_passed,
                experience_years_detected=getattr(app.screening_result, "experience_years_detected", None),
                recommendation=getattr(app.screening_result, "recommendation", None),
                reasoning=app.screening_result.llm_rationale,
                llm_rationale=app.screening_result.llm_rationale,
                decided_at=app.screening_result.decided_at,
                created_at=app.screening_result.decided_at,
            )

        history_items = [
            StatusHistoryItem(
                id=h.id,
                from_status=h.from_status,
                to_status=h.to_status,
                reason=h.reason,
                remarks=h.remarks,
                changed_by=h.changed_by,
                changed_at=h.changed_at,
            )
            for h in sorted(app.status_history, key=lambda x: x.changed_at, reverse=True)
        ]

        return ApplicationDetailResponse(
            id=app.id,
            reference_number=app.reference_number,
            candidate=candidate_info,
            job_role_id=app.job_role_id,
            job_title=app.job_role.title,
            department=app.job_role.department,
            applied_at=app.applied_at,
            source=app.source,
            current_status=app.current_status,
            status_version=app.status_version,
            status_label=meta["label"],
            status_stage=meta["stage"],
            uploaded_by_hr=app.uploaded_by_hr,
            resume=resume_info,
            screening_result=screening_info,
            status_history=history_items,
            upcoming_interview=cls._extract_upcoming_interview(app.interviews),
        )

    @classmethod
    async def list_applications(
        cls,
        db: AsyncSession,
        job_role_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 25,
    ) -> ApplicationListResponse:
        """
        List applications with filtering and pagination for HR portal.
        """
        query = (
            select(Application)
            .join(Application.candidate)
            .join(Application.job_role)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
                joinedload(Application.resume),
                joinedload(Application.screening_result),
                selectinload(Application.interviews),
            )
        )

        count_query = (
            select(func.count(Application.id))
            .join(Application.candidate)
            .join(Application.job_role)
        )

        if job_role_id:
            query = query.where(Application.job_role_id == job_role_id)
            count_query = count_query.where(Application.job_role_id == job_role_id)

        if status_filter:
            query = query.where(Application.current_status == status_filter)
            count_query = count_query.where(Application.current_status == status_filter)

        if source:
            query = query.where(Application.source == source)
            count_query = count_query.where(Application.source == source)

        if search:
            search_pattern = f"%{search.strip()}%"
            search_cond = (Candidate.name.ilike(search_pattern)) | (Candidate.email.ilike(search_pattern))
            query = query.where(search_cond)
            count_query = count_query.where(search_cond)

        # Count total
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        query = query.order_by(Application.applied_at.desc()).offset(offset).limit(limit)

        result = await db.execute(query)
        apps = result.scalars().all()

        items = []
        for app in apps:
            meta = cls._get_status_meta(app.current_status)
            items.append(
                ApplicationListItemResponse(
                    id=app.id,
                    reference_number=app.reference_number,
                    candidate_id=app.candidate.id,
                    candidate_name=app.candidate.name,
                    candidate_email=app.candidate.email,
                    candidate_phone=app.candidate.phone,
                    job_role_id=app.job_role_id,
                    job_title=app.job_role.title,
                    department=app.job_role.department,
                    applied_at=app.applied_at,
                    source=app.source,
                    current_status=app.current_status,
                    status_version=app.status_version,
                    status_label=meta["label"],
                    status_stage=meta["stage"],
                    screening_score=app.screening_result.score if app.screening_result else None,
                    hard_filter_passed=app.screening_result.hard_filter_passed if app.screening_result else None,
                    matched_skills=app.screening_result.matched_skills if app.screening_result else None,
                    missing_skills=app.screening_result.missing_skills if app.screening_result else None,
                    resume_file_name=app.resume.file_name if app.resume else None,
                    upcoming_interview=cls._extract_upcoming_interview(app.interviews),
                )
            )

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return ApplicationListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    @classmethod
    async def screen(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: Optional[uuid.UUID] = None,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
        changed_by: Optional[uuid.UUID] = None,
        changed_by_type: Optional[str] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application to SCREENED.
        Transitions from APPLIED.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        effective_changed_by = changed_by if changed_by is not None else hr_user_id
        effective_changed_by_type = (
            changed_by_type
            if changed_by_type is not None
            else ("hr" if effective_changed_by is not None else "system")
        )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="SCREENED",
            reason=None,
            remarks=remarks or "Application screened",
            changed_by=effective_changed_by,
            changed_by_type=effective_changed_by_type,
            expected_version=status_version,
        )

        await db.commit()
        return await cls.get_application(db, application_id)

    @classmethod
    async def shortlist(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application to SHORTLISTED.
        Typically transitions from SCREENED.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="SHORTLISTED",
            reason=None,
            remarks=remarks,
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()

        # Asynchronously trigger shortlist notification
        try:
            send_notification_task.delay(str(application_id), "shortlisted")
        except Exception:
            pass

        return await cls.get_application(db, application_id)

    @classmethod
    async def reject(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        reason: str,
        remarks: Optional[str] = None,
        custom_message: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application to REJECTED.
        Reason is mandatory.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        full_remarks = remarks
        if custom_message:
            full_remarks = f"{remarks or ''}\n[Custom Candidate Message]: {custom_message}".strip()

        await cls._transition_status(
            db=db,
            application=application,
            to_status="REJECTED",
            reason=reason,
            remarks=full_remarks,
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()

        # Asynchronously trigger rejection notification (generic message to candidate)
        try:
            send_notification_task.delay(str(application_id), "rejected", custom_message=custom_message)
        except Exception:
            pass

        return await cls.get_application(db, application_id)

    @classmethod
    async def make_offer(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application to OFFERED (from INTERVIEWED).
        Writes to application_status_history with changed_by_type='hr'.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="OFFERED",
            reason=None,
            remarks=remarks or "Offer extended by HR",
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()

        try:
            send_notification_task.delay(str(application_id), "offer_extended")
        except Exception:
            pass

        return await cls.get_application(db, application_id)

    @classmethod
    async def accept_offer(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application from OFFERED to OFFER_ACCEPTED.
        Requires no mandatory reason.
        Writes to application_status_history with changed_by_type='hr'.
        Triggers internal HR notification only (no candidate email).
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="OFFER_ACCEPTED",
            reason=None,
            remarks=remarks or "Candidate accepted offer",
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()

        # Internal HR notification only
        try:
            send_notification_task.delay(str(application_id), "offer_accepted_hr_alert")
        except Exception:
            pass

        return await cls.get_application(db, application_id)

    @classmethod
    async def decline_offer(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application from OFFERED to OFFER_DECLINED.
        Optional remarks.
        Writes to application_status_history with changed_by_type='hr'.
        No automated candidate email.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="OFFER_DECLINED",
            reason=None,
            remarks=remarks or "Candidate declined offer",
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()
        return await cls.get_application(db, application_id)

    @classmethod
    async def lapse_offer(
        cls,
        db: AsyncSession,
        application_id: uuid.UUID,
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
        status_version: Optional[int] = None,
    ) -> ApplicationDetailResponse:
        """
        Transition application from OFFERED to OFFER_LAPSED.
        Optional remarks.
        Writes to application_status_history with changed_by_type='hr'.
        No automated candidate email.
        """
        stmt = (
            select(Application)
            .options(
                joinedload(Application.candidate),
                joinedload(Application.job_role),
            )
            .where(Application.id == application_id)
        )
        res = await db.execute(stmt)
        application = res.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Application not found."},
            )

        await cls._transition_status(
            db=db,
            application=application,
            to_status="OFFER_LAPSED",
            reason=None,
            remarks=remarks or "Offer lapsed due to no candidate response",
            changed_by=hr_user_id,
            changed_by_type="hr",
            expected_version=status_version,
        )

        await db.commit()
        return await cls.get_application(db, application_id)

    @classmethod
    async def bulk_shortlist(
        cls,
        db: AsyncSession,
        application_ids: List[uuid.UUID],
        hr_user_id: uuid.UUID,
        remarks: Optional[str] = None,
    ) -> BulkActionResponse:
        """
        Bulk shortlist applications. Skips applications that cannot transition to SHORTLISTED.
        """
        processed_count = 0
        skipped_count = 0
        errors: List[str] = []
        shortlisted_ids: List[uuid.UUID] = []

        for app_id in application_ids:
            stmt = select(Application).where(Application.id == app_id)
            res = await db.execute(stmt)
            application = res.scalar_one_or_none()

            if not application:
                skipped_count += 1
                errors.append(f"Application {app_id} not found.")
                continue

            if application.current_status in TERMINAL_STATES:
                skipped_count += 1
                errors.append(f"Application {application.reference_number} is already in terminal state '{application.current_status}'.")
                continue

            if "SHORTLISTED" not in VALID_TRANSITIONS.get(application.current_status, []):
                skipped_count += 1
                errors.append(f"Application {application.reference_number} in '{application.current_status}' cannot be shortlisted.")
                continue

            try:
                await cls._transition_status(
                    db=db,
                    application=application,
                    to_status="SHORTLISTED",
                    remarks=remarks or "Bulk shortlisted",
                    changed_by=hr_user_id,
                    changed_by_type="hr",
                )
                processed_count += 1
                shortlisted_ids.append(app_id)
            except Exception as e:
                skipped_count += 1
                errors.append(f"Error shortlisting {application.reference_number}: {str(e)}")

        await db.commit()

        # Trigger notifications for all shortlisted candidates
        for s_id in shortlisted_ids:
            try:
                send_notification_task.delay(str(s_id), "shortlisted")
            except Exception:
                pass

        return BulkActionResponse(
            processed_count=processed_count,
            skipped_count=skipped_count,
            errors=errors,
        )

    @classmethod
    async def bulk_reject(
        cls,
        db: AsyncSession,
        application_ids: List[uuid.UUID],
        hr_user_id: uuid.UUID,
        reason: str,
        remarks: Optional[str] = None,
    ) -> BulkActionResponse:
        """
        Bulk reject applications. Reason is mandatory.
        """
        if not reason or not reason.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": "rejection_reason_required", "message": "Rejection reason is mandatory for bulk rejection."},
            )

        processed_count = 0
        skipped_count = 0
        errors: List[str] = []
        rejected_ids: List[uuid.UUID] = []

        for app_id in application_ids:
            stmt = select(Application).where(Application.id == app_id)
            res = await db.execute(stmt)
            application = res.scalar_one_or_none()

            if not application:
                skipped_count += 1
                errors.append(f"Application {app_id} not found.")
                continue

            if application.current_status in TERMINAL_STATES:
                skipped_count += 1
                errors.append(f"Application {application.reference_number} is already in terminal state '{application.current_status}'.")
                continue

            try:
                await cls._transition_status(
                    db=db,
                    application=application,
                    to_status="REJECTED",
                    reason=reason.strip(),
                    remarks=remarks or "Bulk rejected",
                    changed_by=hr_user_id,
                    changed_by_type="hr",
                )
                processed_count += 1
                rejected_ids.append(app_id)
            except Exception as e:
                skipped_count += 1
                errors.append(f"Error rejecting {application.reference_number}: {str(e)}")

        await db.commit()

        # Trigger notifications for all rejected candidates
        for r_id in rejected_ids:
            try:
                send_notification_task.delay(str(r_id), "rejected")
            except Exception:
                pass

        return BulkActionResponse(
            processed_count=processed_count,
            skipped_count=skipped_count,
            errors=errors,
        )
