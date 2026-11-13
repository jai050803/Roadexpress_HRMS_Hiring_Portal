import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Public submission & tracking
class ApplicationSubmitResponse(BaseModel):
    reference_number: str
    job_title: str
    message: str


class ApplicationTrackResponse(BaseModel):
    reference_number: str
    job_title: str
    applied_at: datetime
    status_label: str
    status_stage: int


# Candidate info nested
class CandidateInfo(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Resume info nested
class ResumeInfo(BaseModel):
    id: uuid.UUID
    file_name: Optional[str] = None
    file_url: str
    download_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    parse_status: str
    parsed_json: Optional[Dict[str, Any]] = None
    parse_error: Optional[str] = None
    parsed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Screening result info nested
class ScreeningResultInfo(BaseModel):
    id: uuid.UUID
    score: Optional[int] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    hard_filter_passed: Optional[bool] = None
    experience_years_detected: Optional[int] = None
    recommendation: Optional[str] = None
    reasoning: Optional[str] = None
    llm_rationale: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    model_config = ConfigDict(from_attributes=True)


# Status history nested
class StatusHistoryItem(BaseModel):
    id: uuid.UUID
    from_status: Optional[str] = None
    to_status: str
    reason: Optional[str] = None
    remarks: Optional[str] = None
    changed_by_type: str = "hr"
    changed_by: Optional[uuid.UUID] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Full application detail for HR
class ApplicationDetailResponse(BaseModel):
    id: uuid.UUID
    reference_number: str
    candidate: CandidateInfo
    job_role_id: uuid.UUID
    job_title: str
    department: str
    applied_at: datetime
    source: str
    current_status: str
    status_version: int
    status_label: str
    status_stage: int
    uploaded_by_hr: Optional[uuid.UUID] = None
    resume: Optional[ResumeInfo] = None
    screening_result: Optional[ScreeningResultInfo] = None
    status_history: List[StatusHistoryItem] = []

    model_config = ConfigDict(from_attributes=True)


# List item for HR table view
class ApplicationListItemResponse(BaseModel):
    id: uuid.UUID
    reference_number: str
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    job_role_id: uuid.UUID
    job_title: str
    department: str
    applied_at: datetime
    source: str
    current_status: str
    status_version: int
    status_label: str
    status_stage: int
    screening_score: Optional[int] = None
    hard_filter_passed: Optional[bool] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    resume_file_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    items: List[ApplicationListItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# State transitions
class ShortlistRequest(BaseModel):
    remarks: Optional[str] = None
    status_version: Optional[int] = None


class OfferActionRequest(BaseModel):
    remarks: Optional[str] = None
    status_version: Optional[int] = None


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Mandatory rejection reason")
    remarks: Optional[str] = None
    custom_message: Optional[str] = None
    status_version: Optional[int] = None


class BulkShortlistRequest(BaseModel):
    application_ids: List[uuid.UUID] = Field(..., min_length=1)
    remarks: Optional[str] = None


class BulkRejectRequest(BaseModel):
    application_ids: List[uuid.UUID] = Field(..., min_length=1)
    reason: str = Field(..., min_length=1, description="Mandatory rejection reason")
    remarks: Optional[str] = None


class BulkActionResponse(BaseModel):
    processed_count: int
    skipped_count: int
    errors: List[str] = []
