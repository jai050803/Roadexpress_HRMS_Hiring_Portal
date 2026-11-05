import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.hr_user import HRUser


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

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

    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # null for initial APPLIED entry
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # required when to_status = REJECTED
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # optional HR notes (internal only)

    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hr_users.id"),
        nullable=True,
    )  # null for system-driven transitions
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="status_history")
    changed_by_user: Mapped[Optional["HRUser"]] = relationship("HRUser", back_populates="status_history_entries")

    __table_args__ = (
        Index("idx_status_history_application", "application_id"),
        Index("idx_status_history_changed_at", changed_at.desc()),
    )
