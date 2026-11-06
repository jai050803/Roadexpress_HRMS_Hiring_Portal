import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import app.database
from app.models.resume import Resume
from app.services.parsing.prompts import parse_resume_text_with_gemini
from app.utils.pdf_extractor import extract_text
from app.utils.storage import download_resume_file

logger = logging.getLogger(__name__)


class ParsingService:
    @classmethod
    async def parse_resume(
        cls,
        resume_id: uuid.UUID,
        session: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Parses an uploaded resume:
        1. Checks idempotency: if parse_status == 'done' and parsed_json exists, returns immediately.
        2. Downloads file from S3/MinIO/local storage.
        3. Extracts text via pypdfium2 (falls back to PaddleOCR for scanned PDFs).
        4. Calls Gemini structured extraction (with retry and schema conformance).
        5. Normalizes skills to lowercase.
        6. Updates resumes table with parsed_json, parse_status = 'done', parsed_at = now().
        7. On failure: sets parse_status = 'failed', parse_error = error message, and re-raises.
        * Never modifies the applications table directly — only resumes.
        """
        if session is not None:
            return await cls._execute_parse(resume_id, session)

        async with app.database.AsyncSessionLocal() as db:
            return await cls._execute_parse(resume_id, db)

    @classmethod
    async def _execute_parse(cls, resume_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
        # 1. Fetch Resume record
        stmt = select(Resume).where(Resume.id == resume_id)
        res = await db.execute(stmt)
        resume = res.scalar_one_or_none()

        if not resume:
            raise ValueError(f"Resume with id {resume_id} not found.")

        # 2. Idempotency Check: if already parsed, return existing parsed_json without modification
        if resume.parse_status == "done" and resume.parsed_json:
            logger.info(f"Resume {resume_id} already parsed (idempotent no-op).")
            return resume.parsed_json

        try:
            logger.info(f"Downloading resume file for resume {resume_id}: {resume.file_url}")
            # 3. Download resume file bytes
            file_bytes = download_resume_file(resume.file_url)

            # 4. Extract text from PDF (pypdfium2 text layer -> PaddleOCR fallback)
            raw_text = extract_text(file_bytes)

            # 5. Call Gemini structured extraction with retry logic
            parsed_data = parse_resume_text_with_gemini(raw_text)

            # 6. Normalize skills array to lowercase and deduplicate
            raw_skills = parsed_data.get("skills", [])
            normalized_skills = list(
                dict.fromkeys(
                    [s.lower().strip() for s in raw_skills if isinstance(s, str) and s.strip()]
                )
            )
            parsed_data["skills"] = normalized_skills

            # Ensure all required schema fields are present
            for key in ["name", "email", "phone", "total_experience_years"]:
                if key not in parsed_data:
                    parsed_data[key] = None
            for key in ["education", "experience", "certifications"]:
                if key not in parsed_data or not isinstance(parsed_data[key], list):
                    parsed_data[key] = []

            # 7. Write to resumes table (NEVER touches applications table directly)
            update_stmt = (
                update(Resume)
                .where(Resume.id == resume_id)
                .values(
                    parsed_json=parsed_data,
                    parse_status="done",
                    parsed_at=datetime.now(timezone.utc),
                    parse_error=None,
                )
            )
            await db.execute(update_stmt)
            await db.commit()

            logger.info(f"Successfully parsed resume {resume_id} (skills: {len(normalized_skills)})")
            return parsed_data

        except Exception as e:
            err_msg = str(e)
            logger.error(f"Failed to parse resume {resume_id}: {err_msg}")

            # Update resume status to failed
            fail_stmt = (
                update(Resume)
                .where(Resume.id == resume_id)
                .values(
                    parse_status="failed",
                    parse_error=err_msg,
                )
            )
            await db.execute(fail_stmt)
            await db.commit()
            raise
