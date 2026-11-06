import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.hr_user import HRUser
from app.schemas.cv_bank import CVBankFilterParams, CVBankListResponse
from app.services.cv_bank.service import CVBankService

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
    filters = CVBankFilterParams(
        job_role_id=job_role_id,
        status=status,
        min_score=min_score,
        source=source,
        skill=skill,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )
    return await CVBankService.search(db=db, filters=filters, page=page, limit=limit)


@router.get(
    "/export",
    response_class=StreamingResponse,
    summary="Export filtered CV Bank candidate records as CSV (HR only)",
)
async def export_cv_bank_csv(
    job_role_id: Optional[uuid.UUID] = Query(None, description="Filter by job role"),
    status: Optional[str] = Query(None, description="Filter by application status"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum screening score"),
    source: Optional[str] = Query(None, description="Filter by source (portal, linkedin, email_upload)"),
    skill: Optional[str] = Query(None, description="Filter by detected skill keyword"),
    from_date: Optional[date] = Query(None, description="Applied from date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Applied to date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search candidate name or email"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams filtered CV Bank results as a CSV file.
    Uses Python's csv module streamed chunk-by-chunk without full in-memory buffering.
    """
    filters = CVBankFilterParams(
        job_role_id=job_role_id,
        status=status,
        min_score=min_score,
        source=source,
        skill=skill,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )
    return CVBankService.export_csv(filters=filters, db=db)
