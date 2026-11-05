from app.workers.celery_app import celery
from app.workers.tasks import parse_resume, send_notification_task

__all__ = ["celery", "parse_resume", "send_notification_task"]
