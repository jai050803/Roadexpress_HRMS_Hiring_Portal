import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_hr_user
from app.models.hr_user import HRUser
from app.schemas.jobs import (
    HRJobResponse,
    JobCreateRequest,
    JobUpdateRequest,
    PublicJobDetail,
    PublicJobSummary,
)
from app.services.jobs import jobs_service

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ─── Public Endpoints (Candidate Portal) ──────────────────────────────────────

@router.get(
    "",
    response_model=List[PublicJobSummary],
    status_code=status.HTTP_200_OK,
    summary="List published job roles (Public)",
)
async def list_published_jobs(
    department: Optional[str] = Query(None, description="Filter by department name"),
    work_mode: Optional[str] = Query(None, description="Filter by work mode (remote, onsite, hybrid)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: Returns all currently published job roles.
    Never exposes internal applications_count.
    """
    roles = await jobs_service.list_published_jobs(
        db=db,
        department=department,
        work_mode=work_mode,
    )
    return [
        PublicJobSummary(
            id=role.id,
            title=role.title,
            department=role.department,
            location=role.location,
            work_mode=role.work_mode,
            employment_type=role.employment_type,
            application_deadline=role.application_deadline,
            applications_still_open=jobs_service.calculate_still_open(role),
            created_at=role.created_at,
        )
        for role in roles
    ]


# ─── HR Endpoints (Must be registered before /jobs/{id}) ─────────────────────

@router.get(
    "/all",
    response_model=List[HRJobResponse],
    status_code=status.HTTP_200_OK,
    summary="List all job roles (HR only)",
)
async def list_all_jobs(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, published, closed)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """HR endpoint: Returns all job roles across all statuses (draft, published, closed)."""
    roles = await jobs_service.list_all_jobs(
        db=db,
        status_filter=status_filter,
        department=department,
    )
    return [
        HRJobResponse(
            id=role.id,
            title=role.title,
            department=role.department,
            employment_type=role.employment_type,
            location=role.location,
            work_mode=role.work_mode,
            education_qualification=role.education_qualification,
            min_experience_years=role.min_experience_years,
            required_skills=role.required_skills,
            responsibilities_text=role.responsibilities_text,
            salary_band=role.salary_band,
            jd_text=role.jd_text,
            application_deadline=role.application_deadline,
            max_applications=role.max_applications,
            applications_count=role.applications_count,
            status=role.status,
            linkedin_post_copy=role.linkedin_post_copy,
            linkedin_posted=role.linkedin_posted,
            linkedin_posted_at=role.linkedin_posted_at,
            created_by=role.created_by,
            created_at=role.created_at,
            updated_at=role.updated_at,
            applications_still_open=jobs_service.calculate_still_open(role),
        )
        for role in roles
    ]


@router.post(
    "",
    response_model=HRJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job role (HR only)",
)
async def create_job(
    data: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """HR endpoint: Create a new job role in draft status."""
    role = await jobs_service.create_job(db=db, data=data, hr_user_id=current_user.id)
    return HRJobResponse(
        id=role.id,
        title=role.title,
        department=role.department,
        employment_type=role.employment_type,
        location=role.location,
        work_mode=role.work_mode,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        max_applications=role.max_applications,
        applications_count=role.applications_count,
        status=role.status,
        linkedin_post_copy=role.linkedin_post_copy,
        linkedin_posted=role.linkedin_posted,
        linkedin_posted_at=role.linkedin_posted_at,
        created_by=role.created_by,
        created_at=role.created_at,
        updated_at=role.updated_at,
        applications_still_open=jobs_service.calculate_still_open(role),
    )


# ─── Single Job Public Endpoint ──────────────────────────────────────────────

@router.get(
    "/{id}",
    response_model=PublicJobDetail,
    status_code=status.HTTP_200_OK,
    summary="Get single published job role (Public)",
)
async def get_published_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: Get a single published job role.
    If the role is draft or closed, returns 404.
    Never exposes internal applications_count.
    """
    role = await jobs_service.get_job(db=db, role_id=id)
    if not role or role.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "job_not_found",
                "message": "Job role not found or not currently published",
                "details": {},
            },
        )

    return PublicJobDetail(
        id=role.id,
        title=role.title,
        department=role.department,
        location=role.location,
        work_mode=role.work_mode,
        employment_type=role.employment_type,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        applications_still_open=jobs_service.calculate_still_open(role),
        created_at=role.created_at,
    )


# ─── HR Action Endpoints on Specific Job ─────────────────────────────────────

@router.patch(
    "/{id}",
    response_model=HRJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a draft job role (HR only)",
)
async def update_draft_job(
    id: uuid.UUID,
    data: JobUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """HR endpoint: Update a draft role. Published or closed roles cannot be edited."""
    role = await jobs_service.update_draft_job(db=db, role_id=id, data=data)
    return HRJobResponse(
        id=role.id,
        title=role.title,
        department=role.department,
        employment_type=role.employment_type,
        location=role.location,
        work_mode=role.work_mode,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        max_applications=role.max_applications,
        applications_count=role.applications_count,
        status=role.status,
        linkedin_post_copy=role.linkedin_post_copy,
        linkedin_posted=role.linkedin_posted,
        linkedin_posted_at=role.linkedin_posted_at,
        created_by=role.created_by,
        created_at=role.created_at,
        updated_at=role.updated_at,
        applications_still_open=jobs_service.calculate_still_open(role),
    )


@router.post(
    "/{id}/publish",
    response_model=HRJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish a job role (HR only)",
)
async def publish_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """
    HR endpoint: Publish a job role.
    Auto-generates formatted JD text and LinkedIn copy text.
    """
    role = await jobs_service.publish_job(db=db, role_id=id)
    return HRJobResponse(
        id=role.id,
        title=role.title,
        department=role.department,
        employment_type=role.employment_type,
        location=role.location,
        work_mode=role.work_mode,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        max_applications=role.max_applications,
        applications_count=role.applications_count,
        status=role.status,
        linkedin_post_copy=role.linkedin_post_copy,
        linkedin_posted=role.linkedin_posted,
        linkedin_posted_at=role.linkedin_posted_at,
        created_by=role.created_by,
        created_at=role.created_at,
        updated_at=role.updated_at,
        applications_still_open=jobs_service.calculate_still_open(role),
    )


@router.post(
    "/{id}/close",
    response_model=HRJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Close a job role (HR only)",
)
async def close_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """
    HR endpoint: Close a job role manually.
    Closed roles accept no new applications and are removed from public listings.
    """
    role = await jobs_service.close_job(db=db, role_id=id)
    return HRJobResponse(
        id=role.id,
        title=role.title,
        department=role.department,
        employment_type=role.employment_type,
        location=role.location,
        work_mode=role.work_mode,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        max_applications=role.max_applications,
        applications_count=role.applications_count,
        status=role.status,
        linkedin_post_copy=role.linkedin_post_copy,
        linkedin_posted=role.linkedin_posted,
        linkedin_posted_at=role.linkedin_posted_at,
        created_by=role.created_by,
        created_at=role.created_at,
        updated_at=role.updated_at,
        applications_still_open=jobs_service.calculate_still_open(role),
    )


@router.post(
    "/{id}/mark-linkedin-posted",
    response_model=HRJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark LinkedIn post as posted (HR only)",
)
async def mark_linkedin_posted(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_hr_user),
):
    """HR endpoint: Mark that the LinkedIn post copy has been manually posted by HR."""
    role = await jobs_service.mark_linkedin_posted(db=db, role_id=id)
    return HRJobResponse(
        id=role.id,
        title=role.title,
        department=role.department,
        employment_type=role.employment_type,
        location=role.location,
        work_mode=role.work_mode,
        education_qualification=role.education_qualification,
        min_experience_years=role.min_experience_years,
        required_skills=role.required_skills,
        responsibilities_text=role.responsibilities_text,
        salary_band=role.salary_band,
        jd_text=role.jd_text,
        application_deadline=role.application_deadline,
        max_applications=role.max_applications,
        applications_count=role.applications_count,
        status=role.status,
        linkedin_post_copy=role.linkedin_post_copy,
        linkedin_posted=role.linkedin_posted,
        linkedin_posted_at=role.linkedin_posted_at,
        created_by=role.created_by,
        created_at=role.created_at,
        updated_at=role.updated_at,
        applications_still_open=jobs_service.calculate_still_open(role),
    )
