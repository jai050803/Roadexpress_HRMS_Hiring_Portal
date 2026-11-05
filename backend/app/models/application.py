import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.candidate import Candidate
    from app.models.job_role import JobRole
    from app.models.hr_user import HRUser
    from app.models.resume import Resume
    from app.models.screening_result import ScreeningResult
    from app.models.status_history import ApplicationStatusHistory
    from app.models.interview import Interview
    from app.models.notification import Notification


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id"),
        nullable=False,
    )
    job_role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_roles.id"),
        nullable=False,
    )
    resume_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # Submission metadata
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default="portal",
        server_default="portal",
        nullable=False,
    )  # portal | linkedin | email_upload
    idempotency_key: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
    )
    reference_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )  # e.g. APP-20261105-0042

    # State machine
    current_status: Mapped[str] = mapped_column(
        String(50),
        default="APPLIED",
        server_default="APPLIED",
        nullable=False,
    )
    status_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )  # optimistic locking

    # Uploaded by HR (for email_upload source)
    uploaded_by_hr: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hr_users.id"),
        nullable=True,
    )

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="applications")
    job_role: Mapped["JobRole"] = relationship("JobRole", back_populates="applications")
    uploaded_by_user: Mapped[Optional["HRUser"]] = relationship("HRUser", foreign_keys=[uploaded_by_hr])
    resume: Mapped[Optional["Resume"]] = relationship(
        "Resume",
        back_populates="application",
        uselist=False,
        cascade="all, delete-orphan",
    )
    screening_result: Mapped[Optional["ScreeningResult"]] = relationship(
        "ScreeningResult",
        back_populates="application",
        uselist=False,
        cascade="all, delete-orphan",
    )
    status_history: Mapped[List["ApplicationStatusHistory"]] = relationship(
        "ApplicationStatusHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="desc(ApplicationStatusHistory.changed_at)",
    )
    interviews: Mapped[List["Interview"]] = relationship(
        "Interview",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="Interview.round_number",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="application",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("candidate_id", "job_role_id", name="uq_applications_candidate_job_role"),
        UniqueConstraint("idempotency_key", name="uq_applications_idempotency_key"),
        UniqueConstraint("reference_number", name="uq_applications_reference_number"),
        Index("idx_applications_job_role", "job_role_id"),
        Index("idx_applications_candidate", "candidate_id"),
        Index("idx_applications_status", "current_status"),
        Index("idx_applications_source", "source"),
        Index("idx_applications_applied_at", applied_at.desc()),
    )
