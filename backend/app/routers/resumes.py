import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.hr_user import HRUser
from app.schemas.resumes import PresignedUrlResponse
from app.services.resumes.service import ResumeService

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.get(
    "/{id}/presigned-url",
    response_model=PresignedUrlResponse,
    summary="Get 15-minute pre-signed download URL for resume (HR only)",
)
async def get_resume_presigned_url(
    id: uuid.UUID,
    expires_in: int = Query(900, ge=60, le=3600, description="Expiration time in seconds (default 15 mins)"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a temporary, pre-signed S3/MinIO URL allowing HR to securely view/download
    the candidate's resume without making the bucket public.
    """
    resume = await ResumeService.get_resume(db, id)
    if not resume:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Resume record not found."},
        )

    download_url = await ResumeService.get_presigned_url(db, id, expires_in=expires_in)

    return PresignedUrlResponse(
        resume_id=resume.id,
        file_name=resume.file_name,
        download_url=download_url,
        expires_in_seconds=expires_in,
    )


@router.get(
    "/{id}/download",
    summary="Direct download or redirect to pre-signed resume URL (HR only)",
)
async def download_resume(
    id: uuid.UUID,
    redirect: bool = Query(True, description="Whether to HTTP 307 redirect directly to pre-signed URL"),
    current_user: HRUser = Depends(require_hr_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Redirects browser directly to the 15-minute pre-signed URL or returns JSON with download_url.
    """
    resume = await ResumeService.get_resume(db, id)
    if not resume:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Resume record not found."},
        )

    url = await ResumeService.get_presigned_url(db, id, expires_in=900)
    if redirect:
        return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    return PresignedUrlResponse(
        resume_id=resume.id,
        file_name=resume.file_name,
        download_url=url,
        expires_in_seconds=900,
    )
