import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.job_role import JobRole
from app.schemas.jobs import JobCreateRequest, JobUpdateRequest


class JobsService:
    @staticmethod
    def calculate_still_open(role: JobRole) -> bool:
        """Calculate whether a job role is open for applications (server-side check)."""
        if role.status != "published":
            return False

        now = datetime.now(timezone.utc)
        if role.application_deadline is not None:
            deadline = role.application_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if deadline <= now:
                return False

        if role.max_applications is not None:
            if role.applications_count >= role.max_applications:
                return False

        return True

    @staticmethod
    def generate_jd_text(role: JobRole) -> str:
        """
        Generate formatted JD text from filled fields.
        Rule: Omit any section whose data field is null/empty.
        Never print "N/A" or placeholder text.
        """
        sections: List[str] = []

        # Role Header
        sections.append(f"# {role.title}\n**Department:** {role.department}")

        # Basic metadata overview
        meta_items: List[str] = []
        if role.location and role.location.strip():
            meta_items.append(f"**Location:** {role.location.strip()}")
        if role.work_mode and role.work_mode.strip():
            meta_items.append(f"**Work Mode:** {role.work_mode.strip().capitalize()}")
        if role.employment_type and role.employment_type.strip():
            emp_type = role.employment_type.strip().replace("_", " ").title()
            meta_items.append(f"**Employment Type:** {emp_type}")
        if role.salary_band and role.salary_band.strip():
            meta_items.append(f"**Salary Band:** {role.salary_band.strip()}")

        if meta_items:
            sections.append("\n".join(meta_items))

        # Responsibilities
        if role.responsibilities_text and role.responsibilities_text.strip():
            sections.append(f"### Responsibilities\n{role.responsibilities_text.strip()}")

        # Required Skills
        if role.required_skills:
            clean_skills = [s.strip() for s in role.required_skills if s and s.strip()]
            if clean_skills:
                bullets = "\n".join([f"- {s}" for s in clean_skills])
                sections.append(f"### Required Skills\n{bullets}")

        # Qualifications & Experience
        qual_items: List[str] = []
        if role.min_experience_years is not None and role.min_experience_years > 0:
            qual_items.append(f"- Minimum {role.min_experience_years} year(s) of relevant experience")
        if role.education_qualification and role.education_qualification.strip():
            qual_items.append(f"- Education: {role.education_qualification.strip()}")

        if qual_items:
            sections.append("### Qualifications & Experience\n" + "\n".join(qual_items))

        return "\n\n".join(sections)

    @staticmethod
    def generate_linkedin_copy(role: JobRole) -> str:
        """
        Generate LinkedIn post copy text for manual HR copying:
        - Headline
        - 2-3 sentence plain-text summary (no emojis, no hashtags)
        - "Apply here: {CANDIDATE_PORTAL_URL}/jobs/{id}" link
        """
        portal_url = settings.CANDIDATE_PORTAL_URL.rstrip("/")
        apply_link = f"{portal_url}/jobs/{role.id}"

        headline = f"Hiring: {role.title} in {role.department} at Road Express."

        location_desc = f" based in {role.location.strip()}" if role.location and role.location.strip() else ""
        mode_desc = f" ({role.work_mode.strip().lower()})" if role.work_mode and role.work_mode.strip() else ""

        summary = (
            f"Road Express is looking for a qualified {role.title} to join our {role.department} team{location_desc}{mode_desc}. "
            f"In this role, you will play an important part in our logistics operations and supply chain commitments. "
            f"Qualified candidates are invited to review the full job requirements and apply online."
        )

        return f"{headline}\n\n{summary}\n\nApply here: {apply_link}"

    async def create_job(
        self, db: AsyncSession, data: JobCreateRequest, hr_user_id: Optional[uuid.UUID] = None
    ) -> JobRole:
        """Create a new job role in draft status."""
        new_role = JobRole(
            title=data.title.strip(),
            department=data.department.strip(),
            employment_type=data.employment_type.strip() if data.employment_type else None,
            location=data.location.strip() if data.location else None,
            work_mode=data.work_mode.strip().lower() if data.work_mode else None,
            education_qualification=data.education_qualification.strip() if data.education_qualification else None,
            min_experience_years=data.min_experience_years,
            required_skills=data.required_skills if data.required_skills else None,
            responsibilities_text=data.responsibilities_text.strip() if data.responsibilities_text else None,
            salary_band=data.salary_band.strip() if data.salary_band else None,
            application_deadline=data.application_deadline,
            max_applications=data.max_applications,
            status="draft",
            applications_count=0,
            linkedin_posted=False,
            created_by=hr_user_id,
        )
        db.add(new_role)
        await db.commit()
        await db.refresh(new_role)
        return new_role

    async def get_job(self, db: AsyncSession, role_id: uuid.UUID) -> Optional[JobRole]:
        """Fetch a job role by primary key."""
        stmt = select(JobRole).where(JobRole.id == role_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def list_published_jobs(
        self,
        db: AsyncSession,
        department: Optional[str] = None,
        work_mode: Optional[str] = None,
    ) -> List[JobRole]:
        """List all published job roles for candidate portal."""
        stmt = select(JobRole).where(JobRole.status == "published")
        if department:
            stmt = stmt.where(JobRole.department.ilike(f"%{department.strip()}%"))
        if work_mode:
            stmt = stmt.where(JobRole.work_mode == work_mode.strip().lower())

        stmt = stmt.order_by(JobRole.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_all_jobs(
        self,
        db: AsyncSession,
        status_filter: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[JobRole]:
        """List all job roles (draft, published, closed) for HR admin portal."""
        stmt = select(JobRole)
        if status_filter:
            stmt = stmt.where(JobRole.status == status_filter.strip().lower())
        if department:
            stmt = stmt.where(JobRole.department.ilike(f"%{department.strip()}%"))

        stmt = stmt.order_by(JobRole.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_draft_job(
        self, db: AsyncSession, role_id: uuid.UUID, data: JobUpdateRequest
    ) -> JobRole:
        """
        Update an existing draft job role.
        Rule: Published or closed roles cannot be edited back to draft.
        """
        role = await self.get_job(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found", "details": {}},
            )

        if role.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "cannot_edit_published_role",
                    "message": f"Cannot edit job in '{role.status}' status. Only draft roles can be edited.",
                    "details": {},
                },
            )

        update_dict = data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(role, field, value)

        role.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(role)
        return role

    async def publish_job(self, db: AsyncSession, role_id: uuid.UUID) -> JobRole:
        """
        Publish a job role:
        - Auto-generates formatted JD text
        - Auto-generates LinkedIn post copy
        - Sets status = 'published'
        Rule: Already published or closed roles cannot be published.
        """
        role = await self.get_job(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found", "details": {}},
            )

        if role.status == "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "role_already_published",
                    "message": "This job role is already published.",
                    "details": {},
                },
            )

        if role.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "cannot_publish_closed_role",
                    "message": "A closed job role cannot be published.",
                    "details": {},
                },
            )

        role.status = "published"
        role.jd_text = self.generate_jd_text(role)
        role.linkedin_post_copy = self.generate_linkedin_copy(role)
        role.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(role)
        return role

    async def close_job(self, db: AsyncSession, role_id: uuid.UUID) -> JobRole:
        """
        Close a job role manually.
        Rule: Closed roles accept no new applications and disappear from public listings.
        """
        role = await self.get_job(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found", "details": {}},
            )

        if role.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "role_already_closed",
                    "message": "This job role is already closed.",
                    "details": {},
                },
            )

        role.status = "closed"
        role.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(role)
        return role

    async def mark_linkedin_posted(self, db: AsyncSession, role_id: uuid.UUID) -> JobRole:
        """Mark LinkedIn copy as manually posted by HR."""
        role = await self.get_job(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "job_not_found", "message": "Job role not found", "details": {}},
            )

        role.linkedin_posted = True
        role.linkedin_posted_at = datetime.now(timezone.utc)
        role.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(role)
        return role


jobs_service = JobsService()
