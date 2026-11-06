import asyncio
import logging
import uuid
from typing import Optional
from sqlalchemy import select, update

import app.database
from app.models.resume import Resume
from app.services.notifications.service import NotificationService
from app.services.parsing.service import ParsingService
from app.services.screening.service import ScreeningService
from app.workers.celery_app import celery

logger = logging.getLogger(__name__)


async def _get_application_id_for_resume(resume_id: uuid.UUID) -> Optional[uuid.UUID]:
    """Helper to fetch application_id associated with a resume."""
    async with app.database.AsyncSessionLocal() as db:
        stmt = select(Resume.application_id, Resume.parse_status).where(Resume.id == resume_id)
        res = await db.execute(stmt)
        row = res.fetchone()
        return row[0] if row else None


async def _set_resume_failed(resume_id: uuid.UUID, error_message: str):
    """Helper to ensure resume status is set to failed."""
    async with app.database.AsyncSessionLocal() as db:
        stmt = (
            update(Resume)
            .where(Resume.id == resume_id)
            .values(parse_status="failed", parse_error=error_message)
        )
        await db.execute(stmt)
        await db.commit()


async def _execute_parse_flow(resume_uuid: uuid.UUID):
    app_id = await _get_application_id_for_resume(resume_uuid)
    try:
        parsed_result = await ParsingService.parse_resume(resume_uuid)
        return app_id, parsed_result, None
    except Exception as e:
        return app_id, None, e


@celery.task(
    name="parse_resume_task",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def parse_resume_task(self, resume_id: str):
    """
    Celery task that invokes ParsingService.parse_resume.
    - Fully idempotent: calling with same resume_id returns existing parsed_json.
    - On success: enqueues run_screening_task.
    - On failure after 3 retries (or unrecoverable corruption):
      - Marks parse_status = 'failed'
      - Dispatches 'parse_failed_hr_alert' to HR via send_notification_task
    - Never modifies applications table directly.
    """
    resume_uuid = uuid.UUID(resume_id)
    application_id, parsed_result, err = asyncio.run(_execute_parse_flow(resume_uuid))

    if err:
        exc = err
        is_unrecoverable = isinstance(exc, (ValueError, FileNotFoundError))
        retries_exhausted = self.request.retries >= self.max_retries

        if is_unrecoverable or retries_exhausted:
            logger.error(
                f"parse_resume_task failed definitively for resume {resume_id} "
                f"(retries: {self.request.retries}): {exc}"
            )
            # Ensure parse_status is marked failed
            asyncio.run(_set_resume_failed(resume_uuid, str(exc)))

            # Alert HR team
            if application_id:
                try:
                    send_notification_task.delay(
                        application_id=str(application_id),
                        notification_type="parse_failed_hr_alert",
                        custom_message=f"Resume parsing error: {str(exc)}",
                    )
                except Exception as notif_err:
                    logger.warning(f"Could not enqueue parse_failed_hr_alert: {notif_err}")

            return {"status": "failed", "resume_id": resume_id, "error": str(exc)}

        logger.warning(
            f"parse_resume_task retry {self.request.retries + 1}/{self.max_retries} "
            f"for resume {resume_id} due to: {exc}"
        )
        raise self.retry(exc=exc)

    # On success: enqueue Phase 2 AI screening task
    if application_id:
        try:
            run_screening_task.delay(str(application_id))
        except Exception as queue_err:
            logger.warning(f"Could not enqueue run_screening_task: {queue_err}")

    return {"status": "done", "resume_id": resume_id, "data": parsed_result}


# Backward-compatible alias for existing callers
@celery.task(name="parse_resume", bind=True)
def parse_resume(self, resume_id: str):
    return parse_resume_task(resume_id)


@celery.task(name="run_screening", bind=True)
def run_screening(self, application_id: str):
    return run_screening_task(application_id)


@celery.task(
    name="run_screening_task",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def run_screening_task(self, application_id: str):
    """
    Celery task that scores an application against its job role using Gemini.
    - Fully idempotent: if screening_results exists, returns existing result.
    - Deterministically enforces hard filter on minimum experience.
    - Transitions application status APPLIED -> SCREENED.
    - Advisory only: never shortlists or rejects.
    - If validation fails after 3 retries, writes fallback result (score=0, hard_filter_passed=False)
      and still transitions to SCREENED.
    """
    app_uuid = uuid.UUID(application_id)
    try:
        res = asyncio.run(ScreeningService.screen_application(app_uuid))
        return {
            "status": "done",
            "application_id": application_id,
            "score": res.score,
            "hard_filter_passed": res.hard_filter_passed,
        }
    except Exception as exc:
        retries_exhausted = self.request.retries >= self.max_retries
        if retries_exhausted:
            logger.error(
                f"run_screening_task failed definitively after {self.max_retries} retries "
                f"for application {application_id}: {exc}. Writing fallback result."
            )
            # Write required fallback result and transition to SCREENED
            fallback = asyncio.run(
                ScreeningService.record_failed_screening_fallback(app_uuid, str(exc))
            )
            return {
                "status": "fallback",
                "application_id": application_id,
                "score": fallback.score,
                "hard_filter_passed": fallback.hard_filter_passed,
            }

        logger.warning(
            f"run_screening_task retry {self.request.retries + 1}/{self.max_retries} "
            f"for application {application_id} due to: {exc}"
        )
        raise self.retry(exc=exc)


@celery.task(name="send_notification_task", bind=True)
def send_notification_task(
    self,
    application_id: str,
    notification_type: str,
    custom_message: Optional[str] = None,
):
    """
    Celery task that invokes NotificationService.send_notification.
    Enforces idempotency using notifications table's UNIQUE (application_id, type) constraint.
    """
    app_uuid = uuid.UUID(application_id)
    return asyncio.run(
        NotificationService.send_notification(
            application_id=app_uuid,
            notification_type=notification_type,
            custom_message=custom_message,
        )
    )
