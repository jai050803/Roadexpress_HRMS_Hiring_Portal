from app.workers.celery_app import celery
from app.workers.tasks import parse_resume

__all__ = ["celery", "parse_resume"]
