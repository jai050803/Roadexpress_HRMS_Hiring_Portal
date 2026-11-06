from celery import Celery
from celery.signals import worker_process_init
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.config import settings
import app.database

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


@worker_process_init.connect
def configure_worker_db(**kwargs):
    """
    Ensure each Celery worker process maintains an isolated database engine with NullPool.
    Prevents asyncpg event loop sharing and 'another operation is in progress' errors.
    """
    app.database.engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        echo=False,
        future=True,
    )
    app.database.AsyncSessionLocal = async_sessionmaker(
        bind=app.database.engine,
        class_=AsyncSession,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

# Register task modules
import app.workers.tasks  # noqa: F401
import app.workers.interview_tasks  # noqa: F401

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
