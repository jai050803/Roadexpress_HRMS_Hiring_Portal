import asyncio
import uuid
from typing import Optional
from app.workers.celery_app import celery
from app.services.notifications.service import NotificationService


@celery.task(name="parse_resume", bind=True)
def parse_resume(self, resume_id: str):
    """
    Background worker task stub for Phase 2 resume parsing.
    Extracts text using pypdfium2 / PaddleOCR and generates structured JSON.
    """
    return {"status": "enqueued", "resume_id": resume_id}


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
