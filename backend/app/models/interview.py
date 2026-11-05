import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.hr_user import HRUser


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id"),
        nullable=False,
    )

    round_number: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # online | offline
    status: Mapped[str] = mapped_column(
        String(50),
        default="scheduled",
        server_default="scheduled",
        nullable=False,
    )  # scheduled | completed | no_show | cancelled

    # Scheduling
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, server_default="60", nullable=False)
    interviewer_ids: Mapped[Optional[List[uuid.UUID]]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)

    # Online only
    meeting_link: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    calendar_event_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Google Calendar event ID

    # Offline only
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Conditions (included in candidate email + reminders)
    required_documents: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    conditions_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Outcome
    outcome_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    created_by_user: Mapped[Optional["HRUser"]] = relationship("HRUser", back_populates="created_interviews")

    __table_args__ = (
        Index("idx_interviews_application", "application_id"),
        Index("idx_interviews_scheduled_at", "scheduled_at"),
        Index("idx_interviews_status", "status"),
    )
