from celery import Celery
from app.config import settings

celery = Celery(
    "roadexpress_hrms",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)

# Placeholder beat schedule for future interview reminders
celery.conf.beat_schedule = {
    "interview-reminder-24h": {
        "task": "app.workers.interview_tasks.send_reminders_24h",
        "schedule": 1800.0,  # every 30 minutes
    },
    "interview-reminder-1h": {
        "task": "app.workers.interview_tasks.send_reminders_1h",
        "schedule": 900.0,  # every 15 minutes
    },
}
