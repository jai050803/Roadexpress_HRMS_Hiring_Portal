import io
import uuid
import pytest
from fastapi import HTTPException, UploadFile
from app.models.job_role import JobRole
from app.models.hr_user import HRUser
from app.models.application import Application
from app.services.candidates.service import CandidateService
from app.services.resumes.service import ResumeService
from app.services.auth.service import AuthService
from app.utils.storage import save_resume_file
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_candidate_service_crud():
    """CandidateService upsert, email lookup, and id lookup."""
    async with TestSessionLocal() as session:
        email = f"candidate_{uuid.uuid4().hex[:6]}@example.com"

        # 1. New candidate insertion
        c1 = await CandidateService.upsert_candidate(
            db=session,
            email=email,
            name="Original Name",
            phone="+91 9123456780",
        )
        assert c1.id is not None
        assert c1.name == "Original Name"
        assert c1.email == email

        # 2. Update existing candidate name & phone
        c2 = await CandidateService.upsert_candidate(
            db=session,
            email=email,
            name="Updated Name",
            phone="+91 9999999999",
        )
        assert c2.id == c1.id
        assert c2.name == "Updated Name"
        assert c2.phone == "+91 9999999999"

        # 3. Lookup by email
        found = await CandidateService.get_candidate_by_email(session, email)
        assert found is not None
        assert found.id == c1.id

        # 4. Lookup by email (not found)
        not_found = await CandidateService.get_candidate_by_email(session, "nobody@example.com")
        assert not_found is None

        # 5. Lookup by id
        found_by_id = await CandidateService.get_candidate_by_id(session, c1.id)
        assert found_by_id is not None
        assert found_by_id.email == email


@pytest.mark.asyncio
async def test_resume_service_and_storage_validation(test_role: JobRole, dummy_pdf_content: bytes):
    """ResumeService upload, get_resume, get_presigned_url, and file constraints."""
    async with TestSessionLocal() as session:
        # Create an application
        cand = await CandidateService.upsert_candidate(
            db=session,
            email=f"resume_test_{uuid.uuid4().hex[:6]}@example.com",
            name="Resume Candidate",
        )
        app = Application(
            candidate_id=cand.id,
            job_role_id=test_role.id,
            reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
            current_status="APPLIED",
            source="portal",
            idempotency_key=uuid.uuid4(),
            status_version=1,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)

        # 1. Valid resume upload
        upload_file = UploadFile(
            file=io.BytesIO(dummy_pdf_content),
            filename="my_resume.pdf",
            headers={"content-type": "application/pdf"},
        )
        resume = await ResumeService.upload_resume(
            db=session,
            file=upload_file,
            application_id=app.id,
            job_role_id=test_role.id,
        )
        assert resume.id is not None
        assert resume.file_name.endswith(".pdf")
        assert resume.parse_status == "pending"

        # 2. get_resume
        fetched = await ResumeService.get_resume(session, resume.id)
        assert fetched is not None
        assert fetched.id == resume.id

        # 3. get_presigned_url
        url = await ResumeService.get_presigned_url(session, resume.id)
        assert url is not None
        assert "http" in url

        # 4. get_presigned_url not found raises 404
        with pytest.raises(HTTPException) as exc404:
            await ResumeService.get_presigned_url(session, uuid.uuid4())
        assert exc404.value.status_code == 404

        # 5. Non-PDF file rejection (>400)
        txt_file = UploadFile(
            file=io.BytesIO(b"Just plain text file"),
            filename="notes.txt",
            headers={"content-type": "text/plain"},
        )
        with pytest.raises(HTTPException) as exc_mime:
            await save_resume_file(txt_file, app.id, test_role.id)
        assert exc_mime.value.status_code == 400
        assert "invalid_file_type" in str(exc_mime.value.detail)

        # 6. File size > 5MB rejection (HTTP 413)
        oversized_bytes = b"%PDF-1.4\n" + (b"0" * (6 * 1024 * 1024))
        big_file = UploadFile(
            file=io.BytesIO(oversized_bytes),
            filename="large.pdf",
            headers={"content-type": "application/pdf"},
        )
        with pytest.raises(HTTPException) as exc_size:
            await save_resume_file(big_file, app.id, test_role.id)
        assert exc_size.value.status_code == 413
        assert exc_size.value.detail == "Resume file exceeds the 5MB maximum size limit."


@pytest.mark.asyncio
async def test_auth_service_methods(hr_user: HRUser):
    """AuthService login validation, token issuance, and current user retrieval."""
    auth_svc = AuthService()

    async with TestSessionLocal() as session:
        # 1. Valid authentication
        user = await auth_svc.authenticate_user(session, hr_user.email, "AdminPass123!")
        assert user is not None
        assert user.email == hr_user.email

        # 2. Invalid password returns None
        bad_user = await auth_svc.authenticate_user(session, hr_user.email, "WrongPassword!")
        assert bad_user is None

        # 3. Non-existent user returns None
        missing_user = await auth_svc.authenticate_user(session, "missing@example.com", "Pass!")
        assert missing_user is None

        # 4. Inactive user returns None
        db_user = await session.get(HRUser, hr_user.id)
        db_user.is_active = False
        await session.commit()

        inactive_user = await auth_svc.authenticate_user(session, hr_user.email, "AdminPass123!")
        assert inactive_user is None

        # Reset active status
        db_user.is_active = True
        await session.commit()

        # 5. Token creation and get_current_user
        token, expires_in = auth_svc.create_access_token(hr_user.id)
        assert expires_in > 0
        current_u = await auth_svc.get_current_user(token, session)
        assert current_u.id == hr_user.id
