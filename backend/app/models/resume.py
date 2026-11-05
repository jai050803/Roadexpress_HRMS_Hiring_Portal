import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id"),
        unique=True,
        nullable=False,
    )
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)  # S3/MinIO object URL (private)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA-256 for dedup detection
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Parsing
    parse_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        server_default="pending",
        nullable=False,
    )  # pending | done | failed
    parsed_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    parse_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="resume")

    __table_args__ = (
        Index("idx_resumes_parse_status", "parse_status"),
        Index("idx_resumes_skills", func.jsonb_extract_path(parsed_json, "skills"), postgresql_using="gin"),
    )
