import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application


class ScreeningResult(Base):
    __tablename__ = "screening_results"

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

    score: Mapped[int] = mapped_column(Integer, nullable=False)
    matched_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    missing_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    llm_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI explanation of score
    hard_filter_passed: Mapped[bool] = mapped_column(Boolean, nullable=False)  # failed = disqualified on hard criteria

    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="screening_result")

    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="chk_screening_score_range"),
        Index("idx_screening_score", score.desc()),
        Index("idx_screening_hard_filter", "hard_filter_passed"),
    )
