import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

import app.database
from app.models.application import Application
from app.models.screening_result import ScreeningResult
from app.services.screening.prompts import call_gemini_screening

logger = logging.getLogger(__name__)


class ScreeningService:
    @classmethod
    async def screen_application(
        cls,
        application_id: uuid.UUID,
        session: Optional[AsyncSession] = None,
    ) -> ScreeningResult:
        """
        Scores an application against its job role:
        1. Checks idempotency: if screening_results row exists, skips and returns it.
        2. Loads Application with JobRole and Resume.
        3. Calls Gemini screening evaluation.
        4. Deterministically enforces hard filter on minimum experience.
        5. Validates score (0-100 integer).
        6. Writes to screening_results table.
        7. Transitions application APPLIED -> SCREENED.
        * Advisory only — never calls shortlist or reject.
        """
        if session is not None:
            return await cls._execute_screen(application_id, session)

        async with app.database.AsyncSessionLocal() as db:
            return await cls._execute_screen(application_id, db)

    @classmethod
    async def _execute_screen(cls, application_id: uuid.UUID, db: AsyncSession) -> ScreeningResult:
        # 1. Idempotency Check: if already screened, return existing row
        existing_stmt = select(ScreeningResult).where(ScreeningResult.application_id == application_id)
        existing_res = await db.execute(existing_stmt)
        existing_result = existing_res.scalar_one_or_none()

        if existing_result:
            logger.info(f"ScreeningResult already exists for application {application_id} (idempotent no-op).")
            return existing_result

        # 2. Fetch Application with job_role and resume
        app_stmt = (
            select(Application)
            .options(
                joinedload(Application.job_role),
                joinedload(Application.resume),
            )
            .where(Application.id == application_id)
        )
        app_res = await db.execute(app_stmt)
        application = app_res.scalar_one_or_none()

        if not application:
            raise ValueError(f"Application {application_id} not found.")

        if not application.job_role:
            raise ValueError(f"JobRole relation missing for application {application_id}.")

        job_role = application.job_role
        resume = application.resume

        # Ensure parsed resume data is available
        parsed_resume = resume.parsed_json if resume and resume.parsed_json else {}

        # 3. Call Gemini screening prompt
        screening_data = call_gemini_screening(
            job_title=job_role.title,
            department=job_role.department,
            required_skills=job_role.required_skills or [],
            min_experience_years=job_role.min_experience_years,
            jd_text=job_role.jd_text,
            responsibilities_text=job_role.responsibilities_text,
            parsed_resume=parsed_resume,
        )

        # 4. Enforce Deterministic Hard Filter (Minimum Experience Check)
        min_exp = job_role.min_experience_years
        cand_exp = parsed_resume.get("total_experience_years")

        if screening_data.get("llm_rationale") == "Screening failed — manual review required":
            hard_filter_passed = False
        else:
            hard_filter_passed = True
            if min_exp is not None and min_exp > 0:
                if cand_exp is None or float(cand_exp) < float(min_exp):
                    hard_filter_passed = False
                else:
                    hard_filter_passed = True

        screening_data["hard_filter_passed"] = hard_filter_passed

        # 5. Validate score (strictly 0–100 integer)
        raw_score = screening_data.get("score", 0)
        try:
            score = max(0, min(100, int(raw_score)))
        except (ValueError, TypeError):
            score = 0

        # Normalize skills
        matched_skills = [
            s.lower().strip()
            for s in screening_data.get("matched_skills", [])
            if isinstance(s, str) and s.strip()
        ]
        missing_skills = [
            s.lower().strip()
            for s in screening_data.get("missing_skills", [])
            if isinstance(s, str) and s.strip()
        ]

        llm_rationale = str(screening_data.get("llm_rationale") or "Screening evaluation completed.")

        # 6. Insert into screening_results table
        result = ScreeningResult(
            application_id=application_id,
            score=score,
            matched_skills=list(dict.fromkeys(matched_skills)),
            missing_skills=list(dict.fromkeys(missing_skills)),
            llm_rationale=llm_rationale,
            hard_filter_passed=hard_filter_passed,
            decided_at=datetime.now(timezone.utc),
        )
        db.add(result)
        await db.flush()

        # 7. Transition Application status APPLIED -> SCREENED
        if application.current_status == "APPLIED":
            from app.services.applications.service import ApplicationService

            await ApplicationService.screen(
                db=db,
                application_id=application_id,
                remarks="Automated AI screening completed",
            )
        else:
            await db.commit()

        logger.info(
            f"Screening completed for application {application_id}: score={score}, "
            f"hard_filter={hard_filter_passed}"
        )
        return result

    @classmethod
    async def record_failed_screening_fallback(
        cls,
        application_id: uuid.UUID,
        error_message: str,
        session: Optional[AsyncSession] = None,
    ) -> ScreeningResult:
        """
        Writes required fallback screening result when Gemini validation fails after 3 retries:
        score = 0, hard_filter_passed = false, llm_rationale = 'Screening failed — manual review required'
        and still transitions the application to SCREENED.
        """
        if session is not None:
            return await cls._execute_fallback(application_id, error_message, session)

        async with app.database.AsyncSessionLocal() as db:
            return await cls._execute_fallback(application_id, error_message, db)

    @classmethod
    async def _execute_fallback(
        cls,
        application_id: uuid.UUID,
        error_message: str,
        db: AsyncSession,
    ) -> ScreeningResult:
        existing_stmt = select(ScreeningResult).where(ScreeningResult.application_id == application_id)
        existing_res = await db.execute(existing_stmt)
        existing = existing_res.scalar_one_or_none()
        if existing:
            return existing

        app_stmt = (
            select(Application)
            .options(joinedload(Application.job_role))
            .where(Application.id == application_id)
        )
        app_res = await db.execute(app_stmt)
        application = app_res.scalar_one_or_none()

        req_skills = []
        if application and application.job_role and application.job_role.required_skills:
            req_skills = [s.lower().strip() for s in application.job_role.required_skills]

        fallback_result = ScreeningResult(
            application_id=application_id,
            score=0,
            matched_skills=[],
            missing_skills=req_skills,
            llm_rationale="Screening failed — manual review required",
            hard_filter_passed=False,
            decided_at=datetime.now(timezone.utc),
        )
        db.add(fallback_result)
        await db.flush()

        if application and application.current_status == "APPLIED":
            from app.services.applications.service import ApplicationService

            await ApplicationService.screen(
                db=db,
                application_id=application_id,
                remarks=f"Screening fallback recorded: {error_message}",
            )
        else:
            await db.commit()

        logger.warning(f"Recorded fallback screening result for application {application_id}")
        return fallback_result
