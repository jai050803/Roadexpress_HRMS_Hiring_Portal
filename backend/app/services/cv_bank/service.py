import csv
from datetime import datetime, time, timezone
import logging
import re
from typing import Optional
from fastapi.responses import StreamingResponse
from sqlalchemy import cast, func, or_, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager

import app.database as app_database
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.schemas.cv_bank import CVBankFilterParams, CVBankItem, CVBankListResponse
from app.utils.storage import generate_presigned_download_url

logger = logging.getLogger(__name__)


class Echo:
    """An object that implements just the write method of the file-like interface."""
    def write(self, value):
        return value


class CVBankService:
    @staticmethod
    def _build_base_query(filters: CVBankFilterParams):
        """
        Builds the base select and count queries for CV Bank.
        Adheres to DATA_MODEL.md §4 query pattern:
        - applications JOIN candidates JOIN job_roles
        - LEFT JOIN resumes LEFT JOIN screening_results
        - contains_eager loaded for single-pass efficient retrieval
        """
        query = (
            select(Application)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(JobRole, Application.job_role_id == JobRole.id)
            .outerjoin(Resume, Resume.application_id == Application.id)
            .outerjoin(ScreeningResult, ScreeningResult.application_id == Application.id)
            .options(
                contains_eager(Application.candidate),
                contains_eager(Application.job_role),
                contains_eager(Application.resume),
                contains_eager(Application.screening_result),
            )
        )

        count_query = (
            select(func.count(Application.id))
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(JobRole, Application.job_role_id == JobRole.id)
            .outerjoin(Resume, Resume.application_id == Application.id)
            .outerjoin(ScreeningResult, ScreeningResult.application_id == Application.id)
        )

        if filters.job_role_id:
            query = query.where(Application.job_role_id == filters.job_role_id)
            count_query = count_query.where(Application.job_role_id == filters.job_role_id)

        if filters.status:
            query = query.where(Application.current_status == filters.status)
            count_query = count_query.where(Application.current_status == filters.status)

        if filters.min_score is not None:
            query = query.where(ScreeningResult.score >= filters.min_score)
            count_query = count_query.where(ScreeningResult.score >= filters.min_score)

        if filters.source:
            query = query.where(Application.source == filters.source)
            count_query = count_query.where(Application.source == filters.source)

        if filters.skill:
            skill_clean = filters.skill.strip()
            variants = list({
                skill_clean,
                skill_clean.lower(),
                skill_clean.upper(),
                skill_clean.capitalize(),
                skill_clean.title(),
            })
            containment_clauses = [
                cast(Resume.parsed_json["skills"], JSONB).contains([v])
                for v in variants
            ]
            escaped_regex = re.escape(skill_clean).replace("\\", "\\\\").replace("'", "''")
            jsonpath_clause = text(
                f"jsonb_path_exists(resumes.parsed_json, '$.skills[*] ? (@ like_regex \"^{escaped_regex}$\" flag \"i\")')"
            )
            skill_cond = or_(*containment_clauses, jsonpath_clause)
            query = query.where(skill_cond)
            count_query = count_query.where(skill_cond)

        if filters.from_date:
            from_dt = datetime.combine(filters.from_date, time.min, tzinfo=timezone.utc)
            query = query.where(Application.applied_at >= from_dt)
            count_query = count_query.where(Application.applied_at >= from_dt)

        if filters.to_date:
            to_dt = datetime.combine(filters.to_date, time.max, tzinfo=timezone.utc)
            query = query.where(Application.applied_at <= to_dt)
            count_query = count_query.where(Application.applied_at <= to_dt)

        if filters.search:
            search_pattern = f"%{filters.search.strip()}%"
            search_cond = (Candidate.name.ilike(search_pattern)) | (Candidate.email.ilike(search_pattern))
            query = query.where(search_cond)
            count_query = count_query.where(search_cond)

        return query, count_query

    @classmethod
    async def search(
        cls,
        db: AsyncSession,
        filters: CVBankFilterParams,
        page: int = 1,
        limit: int = 25,
    ) -> CVBankListResponse:
        """
        Search and filter CV Bank across all roles.
        Includes a 15-minute pre-signed S3/MinIO resume_download_url for each candidate row.
        """
        query, count_query = cls._build_base_query(filters)

        # Count total matching rows
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        # Paginate results ordered by applied_at DESC
        offset = (page - 1) * limit
        paginated_query = query.order_by(Application.applied_at.desc()).offset(offset).limit(limit)

        result = await db.execute(paginated_query)
        apps = result.scalars().unique().all()

        items = []
        for app in apps:
            resume_url = None
            resume_name = None
            resume_id = None

            if app.resume:
                resume_id = app.resume.id
                resume_name = app.resume.file_name
                # Generate 15-minute pre-signed download URL
                resume_url = generate_presigned_download_url(app.resume.file_url, expires_in=900)

            items.append(
                CVBankItem(
                    application_id=app.id,
                    reference_number=app.reference_number,
                    applied_at=app.applied_at,
                    current_status=app.current_status,
                    source=app.source,
                    candidate_id=app.candidate.id,
                    candidate_name=app.candidate.name,
                    candidate_email=app.candidate.email,
                    candidate_phone=app.candidate.phone,
                    job_role_id=app.job_role_id,
                    job_title=app.job_role.title,
                    department=app.job_role.department,
                    screening_score=app.screening_result.score if app.screening_result else None,
                    matched_skills=app.screening_result.matched_skills if app.screening_result else None,
                    hard_filter_passed=app.screening_result.hard_filter_passed if app.screening_result else None,
                    resume_id=resume_id,
                    resume_file_name=resume_name,
                    resume_download_url=resume_url,
                )
            )

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return CVBankListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    @classmethod
    def export_csv(
        cls,
        filters: CVBankFilterParams,
        db: Optional[AsyncSession] = None,
    ) -> StreamingResponse:
        """
        Streams filtered CV Bank results as CSV with headers.
        Uses Python's csv module with StreamingResponse without buffering all results in memory.
        """
        query, _ = cls._build_base_query(filters)
        query = query.order_by(Application.applied_at.desc())

        async def csv_generator():
            pseudo_buffer = Echo()
            writer = csv.writer(pseudo_buffer)

            headers = [
                "Reference Number",
                "Applied Date",
                "Candidate Name",
                "Candidate Email",
                "Candidate Phone",
                "Job Title",
                "Department",
                "Source",
                "Current Status",
                "Screening Score",
                "Hard Filter Passed",
                "Matched Skills",
            ]
            yield writer.writerow(headers)

            def format_row(app: Application) -> str:
                score_str = (
                    str(app.screening_result.score)
                    if app.screening_result and app.screening_result.score is not None
                    else ""
                )
                hard_filter_str = ""
                if app.screening_result and app.screening_result.hard_filter_passed is not None:
                    hard_filter_str = "Passed" if app.screening_result.hard_filter_passed else "Failed"

                matched_skills_str = (
                    ", ".join(app.screening_result.matched_skills)
                    if app.screening_result and app.screening_result.matched_skills
                    else ""
                )

                row = [
                    app.reference_number,
                    app.applied_at.strftime("%Y-%m-%d %H:%M:%S") if app.applied_at else "",
                    app.candidate.name if app.candidate else "",
                    app.candidate.email if app.candidate else "",
                    app.candidate.phone or "" if app.candidate else "",
                    app.job_role.title if app.job_role else "",
                    app.job_role.department if app.job_role else "",
                    app.source,
                    app.current_status,
                    score_str,
                    hard_filter_str,
                    matched_skills_str,
                ]
                return writer.writerow(row)

            if db is not None:
                stream = await db.stream_scalars(query)
                async for app in stream.unique():
                    yield format_row(app)
            else:
                async with app_database.AsyncSessionLocal() as session:
                    stream = await session.stream_scalars(query)
                    async for app in stream.unique():
                        yield format_row(app)

        return StreamingResponse(
            csv_generator(),
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="cv_bank_export.csv"',
                "Content-Type": "text/csv; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        )
