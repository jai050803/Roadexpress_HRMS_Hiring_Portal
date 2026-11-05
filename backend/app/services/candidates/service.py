import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate


class CandidateService:
    @staticmethod
    async def upsert_candidate(
        db: AsyncSession,
        email: str,
        name: str,
        phone: Optional[str] = None,
    ) -> Candidate:
        """
        Find candidate by email or create a new candidate.
        If exists, update name and phone (if provided).
        Email is the unique identifier across the system.
        """
        normalized_email = email.strip().lower()
        stmt = select(Candidate).where(Candidate.email == normalized_email)
        res = await db.execute(stmt)
        candidate = res.scalar_one_or_none()

        if candidate:
            candidate.name = name.strip()
            if phone:
                candidate.phone = phone.strip()
            candidate.updated_at = datetime.now(timezone.utc)
        else:
            candidate = Candidate(
                name=name.strip(),
                email=normalized_email,
                phone=phone.strip() if phone else None,
            )
            db.add(candidate)

        await db.flush()
        return candidate

    @staticmethod
    async def get_candidate_by_id(
        db: AsyncSession, candidate_id: uuid.UUID
    ) -> Optional[Candidate]:
        stmt = select(Candidate).where(Candidate.id == candidate_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_candidate_by_email(
        db: AsyncSession, email: str
    ) -> Optional[Candidate]:
        normalized_email = email.strip().lower()
        stmt = select(Candidate).where(Candidate.email == normalized_email)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()
