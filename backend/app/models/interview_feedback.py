import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.interview import Interview
    from app.models.hr_user import HRUser


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hr_users.id"),
        nullable=False,
    )

    overall_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    technical_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    communication_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    culture_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    decision: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # proceed | hold | reject
    strengths: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concerns: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    interview: Mapped["Interview"] = relationship("Interview", back_populates="feedback")
    submitted_by_user: Mapped["HRUser"] = relationship("HRUser", back_populates="submitted_feedback")

    __table_args__ = (
        CheckConstraint("overall_rating BETWEEN 1 AND 5", name="chk_interview_feedback_overall_rating"),
        CheckConstraint("technical_rating BETWEEN 1 AND 5", name="chk_interview_feedback_technical_rating"),
        CheckConstraint("communication_rating BETWEEN 1 AND 5", name="chk_interview_feedback_communication_rating"),
        CheckConstraint("culture_rating BETWEEN 1 AND 5", name="chk_interview_feedback_culture_rating"),
        CheckConstraint("decision IN ('proceed', 'hold', 'reject')", name="chk_interview_feedback_decision"),
        UniqueConstraint("interview_id", "submitted_by", name="uq_interview_feedback_interview_submitted_by"),
        Index("idx_interview_feedback_interview_id", "interview_id"),
    )
