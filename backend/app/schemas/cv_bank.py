import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CVBankFilterParams(BaseModel):
    job_role_id: Optional[uuid.UUID] = Field(None, description="Filter by job role")
    status: Optional[str] = Field(None, description="Filter by application status")
    min_score: Optional[int] = Field(None, ge=0, le=100, description="Minimum screening score")
    source: Optional[str] = Field(None, description="Filter by source (portal, linkedin, email_upload)")
    skill: Optional[str] = Field(None, description="Filter by detected skill keyword in parsed resume")
    from_date: Optional[date] = Field(None, description="Applied from date (YYYY-MM-DD)")
    to_date: Optional[date] = Field(None, description="Applied to date (YYYY-MM-DD)")
    search: Optional[str] = Field(None, description="Search candidate name or email (ILIKE)")


class CVBankItem(BaseModel):
    application_id: uuid.UUID
    reference_number: str
    applied_at: datetime
    current_status: str
    source: str
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    job_role_id: uuid.UUID
    job_title: str
    department: str
    screening_score: Optional[int] = None
    matched_skills: Optional[List[str]] = None
    hard_filter_passed: Optional[bool] = None
    resume_id: Optional[uuid.UUID] = None
    resume_file_name: Optional[str] = None
    resume_download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CVBankListResponse(BaseModel):
    items: List[CVBankItem]
    total: int
    page: int
    limit: int
    total_pages: int
