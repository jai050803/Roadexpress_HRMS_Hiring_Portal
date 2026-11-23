import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

import os

try:
    if os.environ.get("ENABLE_PGVECTOR", "false").lower() == "true":
        from pgvector.sqlalchemy import Vector
    else:
        Vector = None
except ImportError:
    Vector = None

if TYPE_CHECKING:
    from app.models.hr_user import HRUser
    from app.models.application import Application
    from app.models.interview import Interview


class JobRole(Base):
    __tablename__ = "job_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    # Core fields (required)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # full_time | part_time | contract | internship
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    work_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # remote | onsite | hybrid

    # JD fields (optional  -  renderer omits missing sections, never prints "N/A")
    education_qualification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    required_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    responsibilities_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    salary_band: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Generated
    jd_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jd_embedding = mapped_column(Vector(1536) if Vector is not None else ARRAY(Float), nullable=True)

    # Limits
    application_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_applications: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    applications_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft", server_default="draft", nullable=False)  # draft | published | closed

    # LinkedIn copy (not API  -  HR copies manually)
    linkedin_post_copy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_posted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    linkedin_posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("hr_users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    created_by_user: Mapped[Optional["HRUser"]] = relationship("HRUser", back_populates="job_roles")
    applications: Mapped[List["Application"]] = relationship("Application", back_populates="job_role")
    interviews: Mapped[List["Interview"]] = relationship("Interview", back_populates="job_role")

    __table_args__ = (
        Index("idx_job_roles_status", "status"),
        Index("idx_job_roles_department", "department"),
    )
