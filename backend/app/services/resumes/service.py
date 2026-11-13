import uuid
from typing import Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.resume import Resume
from app.utils.storage import generate_presigned_download_url, save_resume_file
from app.workers.tasks import parse_resume_task

MAX_RESUME_SIZE_BYTES = 5_242_880  # 5 * 1024 * 1024 bytes (5MB)


class ResumeService:
    @staticmethod
    async def upload_resume(
        db: AsyncSession,
        file: UploadFile,
        application_id: uuid.UUID,
        job_role_id: uuid.UUID,
    ) -> Resume:
        """
        Validates file (PDF, max 5MB), uploads to S3/MinIO under key pattern:
        resumes/{job_role_id}/{application_id}/{filename}
        Creates resume record with parse_status = 'pending', and enqueues Celery parsing task.
        """
        # Validate size early if size is provided on UploadFile
        if file.size and file.size > MAX_RESUME_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Resume file exceeds the 5MB maximum size limit.",
            )

        # Save file to object storage
        stored_url, safe_filename, file_size, file_hash = await save_resume_file(
            file=file,
            application_id=application_id,
            job_role_id=job_role_id,
        )

        # Create resume DB record
        resume = Resume(
            application_id=application_id,
            file_url=stored_url,
            file_name=safe_filename,
            file_hash=file_hash,
            file_size_bytes=file_size,
            parse_status="pending",
        )
        db.add(resume)
        await db.flush()

        # Update application resume_id
        app_stmt = select(Application).where(Application.id == application_id)
        app_res = await db.execute(app_stmt)
        application = app_res.scalar_one_or_none()
        if application:
            application.resume_id = resume.id
            await db.flush()

        # Enqueue Celery task for Phase 2 parsing
        try:
            parse_resume_task.delay(str(resume.id))
        except Exception:
            # Non-blocking if Celery worker/broker is disconnected in dev/test
            pass

        return resume

    @staticmethod
    async def get_resume(
        db: AsyncSession,
        resume_id: uuid.UUID,
    ) -> Optional[Resume]:
        """Fetch resume by ID."""
        stmt = select(Resume).where(Resume.id == resume_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_presigned_url(
        db: AsyncSession,
        resume_id: uuid.UUID,
        expires_in: int = 900,
    ) -> str:
        """
        Generates a 15-minute (900 seconds) pre-signed download URL for a resume.
        Raises 404 if resume not found.
        """
        resume = await ResumeService.get_resume(db, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Resume record not found."},
            )

        return generate_presigned_download_url(resume.file_url, expires_in=expires_in)
