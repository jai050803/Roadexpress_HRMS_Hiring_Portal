import asyncio
from datetime import datetime, timedelta, timezone
import io
import os
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Test Environment Variables
os.environ["APP_ENV"] = "test"
is_in_docker = os.path.exists("/.dockerenv")
db_host = "postgres" if is_in_docker else "localhost"
db_user = "hrms_user" if is_in_docker else "postgres"
db_pass = "hrms_pass" if is_in_docker else "2301420045"
default_test_db = f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}:5432/hrms_test_db"

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", default_test_db)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["STORAGE_PROVIDER"] = "local"
os.environ["EMAIL_PROVIDER"] = "smtp"
os.environ["ENABLE_PGVECTOR"] = "false"

from app.config import settings
from app.database import get_db
import app.database as app_database
from app.main import app as fastapi_app
from app.models.base import Base
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.hr_user import HRUser
from app.models.job_role import JobRole
from app.models.notification import Notification
from app.models.resume import Resume
from app.models.screening_result import ScreeningResult
from app.models.status_history import ApplicationStatusHistory
from app.models.interview import Interview
from app.models.interview_feedback import InterviewFeedback
from app.services.auth import auth_service

# Use NullPool to avoid cross-loop connection sharing issues in async tests
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
    future=True,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

# Point global app database to test database
app_database.engine = test_engine
app_database.AsyncSessionLocal = TestSessionLocal


@pytest.fixture(scope="session")
def event_loop():
    """Create a single session-scoped event loop for all async fixtures and tests."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db(event_loop):
    """Create all tables in hrms_test_db once before any tests run."""
    async with test_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("CREATE SEQUENCE IF NOT EXISTS applications_global_seq START 1;"))
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("DROP SEQUENCE IF EXISTS applications_global_seq;"))
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_tables():
    """Clean all table data before each test for deterministic isolation."""
    async with test_engine.begin() as conn:
        for tbl in [
            "interview_feedback",
            "interviews",
            "notifications",
            "application_status_history",
            "screening_results",
            "resumes",
            "applications",
            "candidates",
            "job_roles",
            "hr_users",
        ]:
            await conn.execute(text(f"DELETE FROM {tbl};"))
        await conn.execute(text("ALTER SEQUENCE IF EXISTS applications_global_seq RESTART WITH 1;"))
    yield


@pytest_asyncio.fixture
async def db():
    """Provides a dedicated async session for test assertions and direct model inserts."""
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture
async def client():
    """HTTP client configured to hit the FastAPI app with test db overridden."""
    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    fastapi_app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def hr_user(db: AsyncSession) -> HRUser:
    """Creates a seeded HR admin user."""
    user = HRUser(
        name="Test HR Admin",
        email=f"admin_{uuid.uuid4().hex[:6]}@roadexpress.com",
        password_hash=auth_service.hash_password("AdminPass123!"),
        role="admin",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def hr_auth_headers(hr_user: HRUser) -> dict:
    """Generates a valid JWT Authorization header for the test HR user."""
    token, _ = auth_service.create_access_token(user_id=hr_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_role(db: AsyncSession, hr_user: HRUser) -> JobRole:
    """Creates an open, published role with no caps or deadlines."""
    role = JobRole(
        title="Lead Logistics Systems Engineer",
        department="Engineering",
        employment_type="full_time",
        location="Bangalore, Karnataka",
        work_mode="hybrid",
        education_qualification="B.Tech in CS or related field",
        min_experience_years=5,
        required_skills=["Python", "FastAPI", "PostgreSQL", "Redis"],
        responsibilities_text="Design and optimize backend logistics routing systems.",
        salary_band="₹25,00,000 - ₹32,00,000 PA",
        jd_text="# Lead Logistics Systems Engineer\nDesign and optimize backend logistics routing systems.",
        status="published",
        applications_count=0,
        max_applications=None,
        application_deadline=None,
        created_by=hr_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest_asyncio.fixture
async def test_role_cap_1(db: AsyncSession, hr_user: HRUser) -> JobRole:
    """Creates a published role with max_applications = 1."""
    role = JobRole(
        title="Supply Chain Analytics Specialist",
        department="Supply Chain",
        employment_type="full_time",
        location="Bangalore, Karnataka",
        work_mode="hybrid",
        status="published",
        applications_count=0,
        max_applications=1,
        application_deadline=None,
        created_by=hr_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest_asyncio.fixture
async def test_role_at_capacity(db: AsyncSession, hr_user: HRUser) -> JobRole:
    """Creates a role whose capacity has already been reached."""
    role = JobRole(
        title="Accounts Team Lead",
        department="Accounts & Finance",
        employment_type="full_time",
        location="Mumbai, Maharashtra",
        work_mode="onsite",
        status="published",
        applications_count=2,
        max_applications=2,
        application_deadline=None,
        created_by=hr_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest_asyncio.fixture
async def test_role_past_deadline(db: AsyncSession, hr_user: HRUser) -> JobRole:
    """Creates a role whose deadline has expired."""
    role = JobRole(
        title="Senior Talent Acquisition Lead",
        department="Human Resources",
        employment_type="full_time",
        location="Bangalore, Karnataka",
        work_mode="hybrid",
        status="published",
        applications_count=0,
        max_applications=50,
        application_deadline=datetime.now(timezone.utc) - timedelta(days=2),
        created_by=hr_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest_asyncio.fixture
def dummy_pdf_content() -> bytes:
    """Returns valid minimal PDF byte stream."""
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n160\n%%EOF"
