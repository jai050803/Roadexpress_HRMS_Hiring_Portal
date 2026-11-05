from app.workers.celery_app import celery


@celery.task(name="parse_resume", bind=True)
def parse_resume(self, resume_id: str):
    """
    Background worker task stub for Phase 2 resume parsing.
    Extracts text using pypdfium2 / PaddleOCR and generates structured JSON.
    """
    return {"status": "enqueued", "resume_id": resume_id}
