import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class InterviewCreate(BaseModel):
    application_id: uuid.UUID
    scheduled_at: datetime  # must be future, validated in service
    duration_minutes: int = 60
    mode: Literal["phone", "video", "in_person"]
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_ids: List[uuid.UUID] = Field(default_factory=list)
    hr_notes: Optional[str] = None


class InterviewReschedule(BaseModel):
    scheduled_at: datetime
    meeting_link: Optional[str] = None


class InterviewCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=1, description="Reason for cancelling the interview")


class InterviewFeedbackCreate(BaseModel):
    overall_rating: int = Field(..., ge=1, le=5)
    technical_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    culture_rating: Optional[int] = Field(None, ge=1, le=5)
    decision: Literal["proceed", "hold", "reject"]
    strengths: Optional[str] = None
    concerns: Optional[str] = None
    additional_notes: Optional[str] = None


class InterviewFeedbackResponse(BaseModel):
    id: uuid.UUID
    interview_id: uuid.UUID
    submitted_by: uuid.UUID
    overall_rating: Optional[int] = None
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    culture_rating: Optional[int] = None
    decision: Optional[str] = None
    strengths: Optional[str] = None
    concerns: Optional[str] = None
    additional_notes: Optional[str] = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    job_role_id: uuid.UUID
    scheduled_at: datetime
    duration_minutes: int = 60
    mode: str
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_ids: Optional[List[uuid.UUID]] = None
    status: str
    cancellation_reason: Optional[str] = None
    hr_notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    feedback: Optional[List[InterviewFeedbackResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class InterviewFilterParams(BaseModel):
    job_role_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# Backward-compatible aliases
InterviewScheduleRequest = InterviewCreate
InterviewRescheduleRequest = InterviewReschedule
InterviewCancelRequest = InterviewCancel
InterviewFeedbackCreateRequest = InterviewFeedbackCreate
