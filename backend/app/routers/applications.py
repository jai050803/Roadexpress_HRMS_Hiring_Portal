import uuid
from typing import Optional
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.hr_user import HRUser
from app.schemas.applications import (
    ApplicationDetailResponse,
    ApplicationListResponse,
    ApplicationSubmitResponse,
    ApplicationTrackResponse,
    BulkActionResponse,
    BulkRejectRequest,
    BulkShortlistRequest,
    OfferActionRequest,
    RejectRequest,
    ShortlistRequest,
)
from app.services.applications.service import ApplicationService
from app.services.resumes.service import MAX_RESUME_SIZE_BYTES

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post(
    "",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit candidate application (Public)",
)
async def submit_application(
    idempotency_key: uuid.UUID = Form(..., description="Client-generated UUID idempotency key"),
    job_role_id: uuid.UUID = Form(..., description="Target job role UUID"),
    name: str = Form(..., min_length=1, description="Candidate full name"),
    email: str = Form(..., min_length=3, description="Candidate email address"),
    phone: Optional[str] = Form(None, description="Candidate phone number"),
    resume: UploadFile = File(..., description="Resume PDF file (max 5MB)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Candidate application submission flow:
    - Validates idempotency key
    - Checks candidate duplicate application
    - Runs atomic gate on job role (deadline & max applications cap)
    - Upserts candidate by email
    - Uploads resume & records metadata
    - Returns unique monotonic reference number (APP-YYYYMMDD-NNNN)
    """
    if resume.size and resume.size > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file exceeds the 5MB maximum size limit.",
        )

    return await ApplicationService.submit_application(
        db=db,
        idempotency_key=idempotency_key,
        job_role_id=job_role_id,
        name=name,
        email=email,
        phone=phone,
        resume=resume,
        source="portal",
    )


@router.post(
    "/upload",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload candidate CV manually (HR only)",
)
async def upload_cv_by_hr(
    job_role_id: uuid.UUID = Form(..., description="Target job role UUID"),
    name: str = Form(..., min_length=1, description="Candidate full name"),
    email: str = Form(..., min_length=3, description="Candidate email address"),
    phone: Optional[str] = Form(None, description="Candidate phone number"),
    resume: UploadFile = File(..., description="Resume PDF file"),
    idempotency_key: Optional[uuid.UUID] = Form(None, description="Optional idempotency key"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    HR manual upload flow for candidates who emailed their CVs:
    - Runs gate check
    - Upserts candidate
    - Tags source as 'email_upload' and uploaded_by_hr
    """
    if resume.size and resume.size > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file exceeds the 5MB maximum size limit.",
        )

    return await ApplicationService.upload_cv_by_hr(
        db=db,
        job_role_id=job_role_id,
        name=name,
        email=email,
        phone=phone,
        resume=resume,
        hr_user_id=current_user.id,
        idempotency_key=idempotency_key,
    )


@router.get(
    "/track",
    response_model=ApplicationTrackResponse,
    summary="Track application status by email & reference number (Public)",
)
async def track_application(
    email: str = Query(..., description="Candidate email address used when applying"),
    reference_number: str = Query(..., description="Application reference number (e.g. APP-20261105-0042)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public tracking endpoint for candidates:
    Returns abstracted plain-language stage label and stage index (1-4).
    Internal state machine details are hidden.
    """
    return await ApplicationService.track_by_reference(
        db=db,
        email=email,
        reference_number=reference_number,
    )


@router.post(
    "/bulk-shortlist",
    response_model=BulkActionResponse,
    summary="Bulk shortlist applications (HR only)",
)
async def bulk_shortlist(
    payload: BulkShortlistRequest = Body(...),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk shortlists eligible applications.
    Skips applications in terminal states or invalid transition states.
    """
    return await ApplicationService.bulk_shortlist(
        db=db,
        application_ids=payload.application_ids,
        hr_user_id=current_user.id,
        remarks=payload.remarks,
    )


@router.post(
    "/bulk-reject",
    response_model=BulkActionResponse,
    summary="Bulk reject applications (HR only)",
)
async def bulk_reject(
    payload: BulkRejectRequest = Body(...),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk rejects applications with a mandatory reason.
    """
    return await ApplicationService.bulk_reject(
        db=db,
        application_ids=payload.application_ids,
        hr_user_id=current_user.id,
        reason=payload.reason,
        remarks=payload.remarks,
    )


@router.get(
    "",
    response_model=ApplicationListResponse,
    summary="List applications with filters & pagination (HR only)",
)
async def list_applications(
    job_role_id: Optional[uuid.UUID] = Query(None, description="Filter by job role"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. APPLIED, SCREENED, SHORTLISTED)"),
    source: Optional[str] = Query(None, description="Filter by source (portal, linkedin, email_upload)"),
    search: Optional[str] = Query(None, description="Search by candidate name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=500, description="Items per page"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated list of candidate applications for HR pipeline view.
    """
    return await ApplicationService.list_applications(
        db=db,
        job_role_id=job_role_id,
        status_filter=status,
        source=source,
        search=search,
        page=page,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=ApplicationDetailResponse,
    summary="Get full application details (HR only)",
)
async def get_application_details(
    id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full details for a single application including candidate profile,
    resume metadata, screening result, and status history audit trail.
    """
    return await ApplicationService.get_application(db=db, application_id=id)


@router.patch(
    "/{id}/screen",
    response_model=ApplicationDetailResponse,
    summary="Mark an application as SCREENED (HR only)",
)
async def screen_application(
    id: uuid.UUID,
    payload: Optional[ShortlistRequest] = Body(default=None),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application status from APPLIED to SCREENED.
    Enforces optimistic locking if status_version is provided.
    Logs transition in application_status_history.
    """
    remarks = payload.remarks if payload else None
    status_version = payload.status_version if payload else None
    return await ApplicationService.screen(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=remarks,
        status_version=status_version,
        changed_by_type="hr",
    )


@router.patch(
    "/{id}/shortlist",
    response_model=ApplicationDetailResponse,
    summary="Shortlist an application (HR only)",
)
async def shortlist_application(
    id: uuid.UUID,
    payload: ShortlistRequest = Body(...),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application status to SHORTLISTED.
    Enforces optimistic locking if status_version is provided.
    Logs transition in application_status_history.
    """
    return await ApplicationService.shortlist(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=payload.remarks,
        status_version=payload.status_version,
    )


@router.patch(
    "/{id}/reject",
    response_model=ApplicationDetailResponse,
    summary="Reject an application (HR only)",
)
async def reject_application(
    id: uuid.UUID,
    payload: RejectRequest = Body(...),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application status to REJECTED.
    Reason is mandatory.
    Enforces optimistic locking if status_version is provided.
    Logs transition in application_status_history.
    """
    return await ApplicationService.reject(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        reason=payload.reason,
        remarks=payload.remarks,
        custom_message=payload.custom_message,
        status_version=payload.status_version,
    )


@router.post(
    "/{id}/offer",
    response_model=ApplicationDetailResponse,
    summary="Extend offer to candidate (HR only)",
)
async def extend_offer(
    id: uuid.UUID,
    payload: Optional[OfferActionRequest] = Body(default=None),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application to OFFERED (from INTERVIEWED).
    Logs transition in application_status_history with changed_by_type='hr'.
    Dispatches candidate offer notification.
    """
    remarks = payload.remarks if payload else None
    status_version = payload.status_version if payload else None
    return await ApplicationService.make_offer(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=remarks,
        status_version=status_version,
    )


@router.post(
    "/{id}/accept-offer",
    response_model=ApplicationDetailResponse,
    summary="Record candidate offer acceptance (HR only)",
)
async def accept_offer(
    id: uuid.UUID,
    payload: Optional[OfferActionRequest] = Body(default=None),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application from OFFERED to OFFER_ACCEPTED.
    Requires no mandatory reason.
    Logs transition in application_status_history with changed_by_type='hr'.
    Dispatches internal HR notification only.
    """
    remarks = payload.remarks if payload else None
    status_version = payload.status_version if payload else None
    return await ApplicationService.accept_offer(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=remarks,
        status_version=status_version,
    )


@router.post(
    "/{id}/decline-offer",
    response_model=ApplicationDetailResponse,
    summary="Record candidate offer decline (HR only)",
)
async def decline_offer(
    id: uuid.UUID,
    payload: Optional[OfferActionRequest] = Body(default=None),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application from OFFERED to OFFER_DECLINED.
    Optional remarks.
    Logs transition in application_status_history with changed_by_type='hr'.
    No automated email sent.
    """
    remarks = payload.remarks if payload else None
    status_version = payload.status_version if payload else None
    return await ApplicationService.decline_offer(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=remarks,
        status_version=status_version,
    )


@router.post(
    "/{id}/lapse-offer",
    response_model=ApplicationDetailResponse,
    summary="Mark candidate offer as lapsed (HR only)",
)
async def lapse_offer(
    id: uuid.UUID,
    payload: Optional[OfferActionRequest] = Body(default=None),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions application from OFFERED to OFFER_LAPSED.
    Optional remarks.
    Logs transition in application_status_history with changed_by_type='hr'.
    No automated email sent.
    """
    remarks = payload.remarks if payload else None
    status_version = payload.status_version if payload else None
    return await ApplicationService.lapse_offer(
        db=db,
        application_id=id,
        hr_user_id=current_user.id,
        remarks=remarks,
        status_version=status_version,
    )


@router.get(
    "/{id}/interviews",
    summary="Get all interviews for an application (HR only)",
)
async def get_application_interviews_via_app_router(
    id: uuid.UUID,
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all interviews and feedback rounds for a specific candidate application.
    """
    from app.services.interviews.service import InterviewService
    return await InterviewService.get_application_interviews(db, application_id=id)
