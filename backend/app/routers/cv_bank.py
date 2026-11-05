import uuid
from datetime import date, datetime, time, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.hr_user import HRUser
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.schemas.cv_bank import CVBankItem, CVBankListResponse
from app.utils.storage import generate_presigned_download_url

router = APIRouter(prefix="/cv-bank", tags=["CV Bank"])


@router.get(
    "",
    response_model=CVBankListResponse,
    summary="Search and filter all candidate CVs across roles with pre-signed download links (HR only)",
)
async def list_cv_bank(
    job_role_id: Optional[uuid.UUID] = Query(None, description="Filter by job role"),
    status: Optional[str] = Query(None, description="Filter by application status (e.g. SCREENED, SHORTLISTED)"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum screening score"),
    source: Optional[str] = Query(None, description="Filter by source (portal, linkedin, email_upload)"),
    skill: Optional[str] = Query(None, description="Filter by detected skill keyword"),
    from_date: Optional[date] = Query(None, description="Applied from date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Applied to date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search candidate name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter CV Bank across all roles.
    Includes a 15-minute pre-signed S3/MinIO resume_download_url for each candidate row.
    """
    query = (
        select(Application)
        .join(Application.candidate)
        .join(Application.job_role)
        .outerjoin(Application.resume)
        .outerjoin(Application.screening_result)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job_role),
            joinedload(Application.resume),
            joinedload(Application.screening_result),
        )
    )

    count_query = (
        select(func.count(Application.id))
        .join(Application.candidate)
        .join(Application.job_role)
        .outerjoin(Application.resume)
        .outerjoin(Application.screening_result)
    )

    if job_role_id:
        query = query.where(Application.job_role_id == job_role_id)
        count_query = count_query.where(Application.job_role_id == job_role_id)

    if status:
        query = query.where(Application.current_status == status)
        count_query = count_query.where(Application.current_status == status)

    if min_score is not None:
        query = query.where(ScreeningResult.score >= min_score)
        count_query = count_query.where(ScreeningResult.score >= min_score)

    if source:
        query = query.where(Application.source == source)
        count_query = count_query.where(Application.source == source)

    if from_date:
        from_dt = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
        query = query.where(Application.applied_at >= from_dt)
        count_query = count_query.where(Application.applied_at >= from_dt)

    if to_date:
        to_dt = datetime.combine(to_date, time.max, tzinfo=timezone.utc)
        query = query.where(Application.applied_at <= to_dt)
        count_query = count_query.where(Application.applied_at <= to_dt)

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
        resume_url = None
        resume_name = None
        resume_id = None

        if app.resume:
            resume_id = app.resume.id
            resume_name = app.resume.file_name
            # Generate 15-minute pre-signed download URL
            resume_url = generate_presigned_download_url(app.resume.file_url, expires_in=900)

        items.append(
            CVBankItem(
                application_id=app.id,
                reference_number=app.reference_number,
                applied_at=app.applied_at,
                current_status=app.current_status,
                source=app.source,
                candidate_id=app.candidate.id,
                candidate_name=app.candidate.name,
                candidate_email=app.candidate.email,
                candidate_phone=app.candidate.phone,
                job_role_id=app.job_role_id,
                job_title=app.job_role.title,
                department=app.job_role.department,
                screening_score=app.screening_result.score if app.screening_result else None,
                matched_skills=app.screening_result.matched_skills if app.screening_result else None,
                hard_filter_passed=app.screening_result.hard_filter_passed if app.screening_result else None,
                resume_id=resume_id,
                resume_file_name=resume_name,
                resume_download_url=resume_url,
            )
        )

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return CVBankListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
