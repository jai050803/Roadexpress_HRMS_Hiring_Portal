from app.workers.celery_app import celery
import logging

logger = logging.getLogger(__name__)


@celery.task(name="app.workers.interview_tasks.send_reminders_24h")
def send_reminders_24h():
    """Stub task for Phase 3 interview 24h reminders."""
    logger.debug("Checking 24h interview reminders (stub)...")
    return {"status": "ok"}


@celery.task(name="app.workers.interview_tasks.send_reminders_1h")
def send_reminders_1h():
    """Stub task for Phase 3 interview 1h reminders."""
    logger.debug("Checking 1h interview reminders (stub)...")
    return {"status": "ok"}
