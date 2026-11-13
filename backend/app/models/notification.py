import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application


class Notification(Base):
    __tablename__ = "notifications"

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

    type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # applied_ack | shortlisted | rejected | interview_scheduled | interview_reminder_24h | interview_reminder_1h | offered
    channel: Mapped[str] = mapped_column(
        String(50),
        default="email",
        server_default="email",
        nullable=False,
    )  # email | sms

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        server_default="pending",
        nullable=False,
    )  # pending | sent | delivered | failed
    provider_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        server_default="pending",
        nullable=False,
    )  # pending | delivered | failed
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="notifications")

    __table_args__ = (
        UniqueConstraint("application_id", "type", name="uq_notifications_application_type"),
        Index("idx_notifications_status", "status"),
        Index("idx_notifications_provider_status", "provider_status"),
        Index("idx_notifications_application", "application_id"),
    )
