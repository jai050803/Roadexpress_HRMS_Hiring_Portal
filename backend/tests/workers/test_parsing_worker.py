import asyncio
import io
import uuid
from unittest.mock import MagicMock, patch
import pytest
from sqlalchemy import select

from tests.conftest import TestSessionLocal
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.resume import Resume
from app.workers.tasks import parse_resume_task


def _create_sample_pdf(text_content: str) -> bytes:
    """Helper to generate a real, valid PDF with text."""
    escaped_text = text_content.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream_content = f"BT /F1 12 Tf 50 700 Td ({escaped_text}) Tj ET"
    stream_len = len(stream_content.encode("latin-1"))

    pdf_bytes = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length {stream_len} >>
stream
{stream_content}
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
424
%%EOF""".encode("latin-1")
    return pdf_bytes


async def _seed_application_with_resume(role_id: uuid.UUID, file_name: str, file_url: str):
    async with TestSessionLocal() as session:
        cand = Candidate(
            name="Worker Test Candidate",
            email=f"candidate_{uuid.uuid4().hex[:6]}@example.com",
            phone="+91-9876543210",
        )
        session.add(cand)
        await session.commit()
        await session.refresh(cand)

        app = Application(
            candidate_id=cand.id,
            job_role_id=role_id,
            reference_number=f"APP-WORKER-{uuid.uuid4().hex[:4].upper()}",
            current_status="APPLIED",
            source="portal",
            idempotency_key=uuid.uuid4(),
            status_version=1,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)

        resume = Resume(
            application_id=app.id,
            file_url=file_url,
            file_name=file_name,
            file_size_bytes=1024,
            parse_status="pending",
        )
        session.add(resume)
        await session.commit()
        await session.refresh(resume)

        return app.id, resume.id


def test_parsing_worker_text_pdf(test_role: JobRole):
    """
    Test Celery parse_resume_task worker with standard text-layer PDF.
    Verifies:
    1. Downloads file from S3/MinIO
    2. Extracts text using pypdfium2
    3. Gemini structures into parsed_json (skills lowercased)
    4. Updates parse_status = 'done'
    5. Enqueues run_screening_task
    """
    app_id, resume_id = asyncio.run(
        _seed_application_with_resume(
            test_role.id,
            "test_resume.pdf",
            "s3://road-express-resumes/resumes/worker_test.pdf",
        )
    )

    sample_pdf_bytes = _create_sample_pdf("Vikram Rao. Skills: Python, FastAPI, Docker, PostgreSQL.")

    mock_gemini_json = {
        "name": "Vikram Rao",
        "email": "vikram.rao@example.com",
        "phone": "+91-9876543210",
        "total_experience_years": 4,
        "skills": ["python", "fastapi", "docker", "postgresql"],
        "education": [{"degree": "B.Tech", "institution": "IIT", "year": 2020}],
        "experience": [{"title": "Software Engineer", "duration_months": 48}],
    }

    with patch("app.services.parsing.service.download_resume_file", return_value=sample_pdf_bytes), \
         patch("app.services.parsing.service.parse_resume_text_with_gemini", return_value=mock_gemini_json), \
         patch("app.workers.tasks.run_screening_task.delay") as mock_screening_delay:

        # Execute Celery task directly
        result = parse_resume_task(str(resume_id))

        assert result["status"] == "done"
        assert result["resume_id"] == str(resume_id)
        assert result["data"]["skills"] == ["python", "fastapi", "docker", "postgresql"]

        # Verify run_screening_task was enqueued with application_id
        mock_screening_delay.assert_called_once_with(str(app_id))

    # Verify DB state
    async def _verify_db():
        async with TestSessionLocal() as session:
            res = await session.execute(select(Resume).where(Resume.id == resume_id))
            r = res.scalar_one()
            assert r.parse_status == "done"
            assert r.parsed_json["name"] == "Vikram Rao"
            assert "python" in r.parsed_json["skills"]
            assert r.parsed_at is not None

    asyncio.run(_verify_db())


def test_parsing_worker_scanned_pdf(test_role: JobRole):
    """
    Test Celery parse_resume_task worker with scanned image PDF (no text layer).
    Falls back to PaddleOCR extraction, then calls Gemini.
    """
    app_id, resume_id = asyncio.run(
        _seed_application_with_resume(
            test_role.id,
            "scanned_resume.pdf",
            "s3://road-express-resumes/resumes/scanned_worker.pdf",
        )
    )

    # Empty text-layer PDF (< 50 chars)
    scanned_pdf_bytes = _create_sample_pdf("Hi")

    mock_gemini_json = {
        "name": "Scanned Candidate",
        "email": "scanned@example.com",
        "phone": None,
        "total_experience_years": 3,
        "skills": ["ocr", "python"],
        "education": [],
        "experience": [],
    }

    with patch("app.services.parsing.service.download_resume_file", return_value=scanned_pdf_bytes), \
         patch("app.utils.pdf_extractor._run_ocr", return_value="Scanned Candidate OCR Content with python and ocr skills"), \
         patch("app.services.parsing.service.parse_resume_text_with_gemini", return_value=mock_gemini_json), \
         patch("app.workers.tasks.run_screening_task.delay") as mock_screening_delay:

        result = parse_resume_task(str(resume_id))
        assert result["status"] == "done"
        assert result["data"]["name"] == "Scanned Candidate"
        mock_screening_delay.assert_called_once_with(str(app_id))

    async def _verify_db():
        async with TestSessionLocal() as session:
            res = await session.execute(select(Resume).where(Resume.id == resume_id))
            r = res.scalar_one()
            assert r.parse_status == "done"
            assert r.parsed_json["skills"] == ["ocr", "python"]

    asyncio.run(_verify_db())


def test_parsing_worker_corrupted_pdf_failure_and_alert(test_role: JobRole):
    """
    Test Celery parse_resume_task worker with a corrupted PDF:
    1. Retries exhaust / unrecoverable error
    2. Marks parse_status = 'failed'
    3. Enqueues send_notification_task with 'parse_failed_hr_alert'
    """
    app_id, resume_id = asyncio.run(
        _seed_application_with_resume(
            test_role.id,
            "corrupted.pdf",
            "s3://road-express-resumes/resumes/corrupted.pdf",
        )
    )

    corrupted_bytes = b"NOT_A_VALID_PDF_HEADER_1234567890"

    with patch("app.services.parsing.service.download_resume_file", return_value=corrupted_bytes), \
         patch("app.workers.tasks.send_notification_task.delay") as mock_alert_delay:

        result = parse_resume_task(str(resume_id))
        assert result["status"] == "failed"
        assert "error" in result

        # Verify HR alert was enqueued
        mock_alert_delay.assert_called_once()
        call_kwargs = mock_alert_delay.call_args.kwargs
        assert call_kwargs["application_id"] == str(app_id)
        assert call_kwargs["notification_type"] == "parse_failed_hr_alert"

    async def _verify_db():
        async with TestSessionLocal() as session:
            res = await session.execute(select(Resume).where(Resume.id == resume_id))
            r = res.scalar_one()
            assert r.parse_status == "failed"
            assert r.parse_error is not None

    asyncio.run(_verify_db())


def test_parsing_worker_idempotency(test_role: JobRole):
    """
    Calling parse_resume_task twice on the same resume:
    Second call returns existing parsed_json without re-running extraction.
    No duplicate DB records created.
    """
    app_id, resume_id = asyncio.run(
        _seed_application_with_resume(
            test_role.id,
            "idempotent.pdf",
            "s3://road-express-resumes/resumes/idempotent.pdf",
        )
    )

    sample_pdf_bytes = _create_sample_pdf("Anand Verma. Skills: Python, Redis, Postgres.")
    mock_gemini_json = {
        "name": "Anand Verma",
        "email": "anand.verma@example.com",
        "skills": ["python", "redis", "postgres"],
        "total_experience_years": 5,
    }

    with patch("app.services.parsing.service.download_resume_file", return_value=sample_pdf_bytes), \
         patch("app.services.parsing.service.parse_resume_text_with_gemini") as mock_gemini, \
         patch("app.workers.tasks.run_screening_task.delay"):

        mock_gemini.return_value = mock_gemini_json

        # First call
        r1 = parse_resume_task(str(resume_id))
        assert r1["status"] == "done"
        assert mock_gemini.call_count == 1

        # Second call
        r2 = parse_resume_task(str(resume_id))
        assert r2["status"] == "done"
        assert mock_gemini.call_count == 1  # Should not be called again!

    # Verify only 1 resume record exists
    async def _verify_db():
        async with TestSessionLocal() as session:
            res = await session.execute(select(Resume).where(Resume.id == resume_id))
            rows = res.scalars().all()
            assert len(rows) == 1

    asyncio.run(_verify_db())
