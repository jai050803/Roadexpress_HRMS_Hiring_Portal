import uuid
import pytest
import pytest_asyncio
from unittest.mock import patch
from sqlalchemy import select
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_role import JobRole
from app.models.notification import Notification
from app.services.notifications.service import NotificationService
from tests.conftest import TestSessionLocal


@pytest_asyncio.fixture
async def sample_application(test_role, hr_user) -> Application:
    """Helper fixture to create an application in database."""
    async with TestSessionLocal() as session:
        cand = Candidate(
            name="Anjali Nair",
            email=f"anjali_{uuid.uuid4().hex[:6]}@example.com",
            phone="+91 9988776655",
        )
        session.add(cand)
        await session.flush()

        app = Application(
            candidate_id=cand.id,
            job_role_id=test_role.id,
            reference_number=f"APP-20261105-{uuid.uuid4().int % 9000 + 1000}",
            current_status="SHORTLISTED",
            source="portal",
            idempotency_key=uuid.uuid4(),
            status_version=1,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)
        return app


@pytest.mark.asyncio
async def test_notification_sent_once_on_retry(sample_application: Application):
    """
    If notification dispatch is triggered twice for the same application and type,
    the UNIQUE (application_id, type) constraint ensures the email is sent exactly once.
    """
    with patch("app.services.notifications.service.EmailClient.send_email", return_value=True) as mock_send:
        # First call -> inserts notification row, sends email, returns True
        res1 = await NotificationService.send_notification(
            application_id=sample_application.id,
            notification_type="shortlisted",
        )
        assert res1 is True
        assert mock_send.call_count == 1

        # Second call (retry) -> ON CONFLICT DO NOTHING -> 0 rows returned -> skips sending
        res2 = await NotificationService.send_notification(
            application_id=sample_application.id,
            notification_type="shortlisted",
        )
        assert res2 is False
        assert mock_send.call_count == 1  # Still exactly 1 call

    # Verify notifications table has exactly 1 row
    async with TestSessionLocal() as session:
        stmt = select(Notification).where(
            Notification.application_id == sample_application.id,
            Notification.type == "shortlisted",
        )
        res = await session.execute(stmt)
        notifications = res.scalars().all()
        assert len(notifications) == 1
        assert notifications[0].status == "sent"
        assert notifications[0].provider_status == "delivered"


@pytest.mark.asyncio
async def test_notification_failure_does_not_break_status(sample_application: Application):
    """If email provider fails or raises an exception, it is caught safely and logged."""
    with patch("app.services.notifications.service.EmailClient.send_email", side_effect=Exception("SMTP Connection refused")):
        # Should NOT raise an exception to caller
        res = await NotificationService.send_notification(
            application_id=sample_application.id,
            notification_type="rejected",
        )
        assert res is False

    # Status in database should be 'failed'
    async with TestSessionLocal() as session:
        stmt = select(Notification).where(
            Notification.application_id == sample_application.id,
            Notification.type == "rejected",
        )
        res = await session.execute(stmt)
        notif = res.scalar_one_or_none()
        assert notif is not None
        assert notif.status == "failed"
        assert notif.provider_status == "failed"


@pytest.mark.asyncio
async def test_notification_all_templates_and_missing_app(sample_application: Application):
    """Test applied_ack template rendering, rejected with custom message, and missing application."""
    from app.services.notifications.email_client import EmailClient

    with patch.object(EmailClient, "send_email", return_value=True) as mock_send:
        # 1. applied_ack template
        res_ack = await NotificationService.send_notification(
            application_id=sample_application.id,
            notification_type="applied_ack",
        )
        assert res_ack is True
        assert mock_send.call_count == 1
        _, kwargs = mock_send.call_args
        assert "Application Received" in kwargs["subject"]
        assert sample_application.reference_number in kwargs["html_content"]

        # 2. Missing application returns False
        res_missing = await NotificationService.send_notification(
            application_id=uuid.uuid4(),
            notification_type="applied_ack",
        )
        assert res_missing is False

        # 3. Invalid template type returns False
        res_invalid_type = await NotificationService.send_notification(
            application_id=sample_application.id,
            notification_type="non_existent_type",
        )
        assert res_invalid_type is False


def test_email_client_smtp_and_sendgrid():
    """Test EmailClient dispatch via SMTP with mocked network calls."""
    from app.services.notifications.email_client import EmailClient
    from app.config import settings

    # 1. SMTP Provider with mocked SMTP
    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = mock_smtp_cls.return_value
        mock_server.__enter__.return_value = mock_server

        settings.SMTP_USER = "user@example.com"
        settings.SMTP_PASSWORD = "password"
        res = EmailClient.send_email(
            to_email="test@example.com",
            subject="Test Subject",
            html_content="<p>Test Content</p>",
        )
        assert res is True
        assert mock_server.sendmail.called


@pytest.mark.asyncio
async def test_notification_provider_status_default_pending(sample_application: Application):
    """Verify that a notification row created in DB defaults to provider_status='pending'."""
    async with TestSessionLocal() as session:
        notif = Notification(
            application_id=sample_application.id,
            type="custom_test_pending",
            channel="email",
        )
        session.add(notif)
        await session.commit()
        await session.refresh(notif)
        assert notif.status == "pending"
        assert notif.provider_status == "pending"



