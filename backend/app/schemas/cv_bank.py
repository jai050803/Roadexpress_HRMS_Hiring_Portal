import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


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
