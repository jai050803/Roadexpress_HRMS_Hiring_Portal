import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class JobCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    department: str = Field(..., min_length=1, max_length=255)
    employment_type: Optional[str] = Field(None, max_length=50)  # full_time | part_time | contract | internship
    location: Optional[str] = Field(None, max_length=255)
    work_mode: Optional[str] = Field(None, max_length=50)  # remote | onsite | hybrid
    education_qualification: Optional[str] = None
    min_experience_years: Optional[int] = Field(None, ge=0)
    required_skills: Optional[List[str]] = None
    responsibilities_text: Optional[str] = None
    salary_band: Optional[str] = Field(None, max_length=100)
    application_deadline: Optional[datetime] = None
    max_applications: Optional[int] = Field(None, ge=1)


class JobUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, min_length=1, max_length=255)
    employment_type: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    work_mode: Optional[str] = Field(None, max_length=50)
    education_qualification: Optional[str] = None
    min_experience_years: Optional[int] = Field(None, ge=0)
    required_skills: Optional[List[str]] = None
    responsibilities_text: Optional[str] = None
    salary_band: Optional[str] = Field(None, max_length=100)
    application_deadline: Optional[datetime] = None
    max_applications: Optional[int] = Field(None, ge=1)


class PublicJobSummary(BaseModel):
    id: uuid.UUID
    title: str
    department: str
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    application_deadline: Optional[datetime] = None
    applications_still_open: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicJobDetail(BaseModel):
    id: uuid.UUID
    title: str
    department: str
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    education_qualification: Optional[str] = None
    min_experience_years: Optional[int] = None
    required_skills: Optional[List[str]] = None
    responsibilities_text: Optional[str] = None
    salary_band: Optional[str] = None
    jd_text: Optional[str] = None
    application_deadline: Optional[datetime] = None
    applications_still_open: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HRJobResponse(BaseModel):
    id: uuid.UUID
    title: str
    department: str
    employment_type: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    education_qualification: Optional[str] = None
    min_experience_years: Optional[int] = None
    required_skills: Optional[List[str]] = None
    responsibilities_text: Optional[str] = None
    salary_band: Optional[str] = None
    jd_text: Optional[str] = None
    application_deadline: Optional[datetime] = None
    max_applications: Optional[int] = None
    applications_count: int
    status: str
    linkedin_post_copy: Optional[str] = None
    linkedin_posted: bool
    linkedin_posted_at: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    applications_still_open: bool

    model_config = ConfigDict(from_attributes=True)
