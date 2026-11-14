import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.hr_user import HRUser
    from app.models.job_role import JobRole
    from app.models.interview_feedback import InterviewFeedback


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_roles.id"),
        nullable=False,
    )

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, server_default="60", nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)  # phone | video | in_person
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # physical address / room for in_person
    meeting_link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Meet/Zoom URL for video
    interviewer_ids: Mapped[Optional[List[uuid.UUID]]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        default="scheduled",
        server_default="scheduled",
        nullable=False,
    )  # scheduled | completed | cancelled | no_show
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hr_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hr_users.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="interviews")
    job_role: Mapped["JobRole"] = relationship("JobRole", back_populates="interviews")
    created_by_user: Mapped[Optional["HRUser"]] = relationship("HRUser", back_populates="created_interviews")
    feedback: Mapped[List["InterviewFeedback"]] = relationship(
        "InterviewFeedback",
        back_populates="interview",
        cascade="all, delete-orphan",
    )

    @property
    def candidate_name(self) -> Optional[str]:
        if hasattr(self, "_candidate_name"):
            return self._candidate_name
        if self.application and self.application.candidate:
            return self.application.candidate.name
        return None

    @candidate_name.setter
    def candidate_name(self, value: Optional[str]) -> None:
        self._candidate_name = value

    @property
    def candidate_email(self) -> Optional[str]:
        if hasattr(self, "_candidate_email"):
            return self._candidate_email
        if self.application and self.application.candidate:
            return self.application.candidate.email
        return None

    @candidate_email.setter
    def candidate_email(self, value: Optional[str]) -> None:
        self._candidate_email = value

    @property
    def job_title(self) -> Optional[str]:
        if hasattr(self, "_job_title"):
            return self._job_title
        if self.job_role:
            return self.job_role.title
        return None

    @job_title.setter
    def job_title(self, value: Optional[str]) -> None:
        self._job_title = value

    __table_args__ = (
        CheckConstraint("mode IN ('phone', 'video', 'in_person')", name="chk_interviews_mode"),
        CheckConstraint("status IN ('scheduled', 'completed', 'cancelled', 'no_show')", name="chk_interviews_status"),
        Index("idx_interviews_application_id", "application_id"),
        Index("idx_interviews_job_role_id", "job_role_id"),
        Index("idx_interviews_scheduled_at", "scheduled_at"),
        Index("idx_interviews_status", "status"),
    )
