import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import settings
import app.database
from app.models.application import Application
from app.models.notification import Notification
from app.services.notifications.email_client import EmailClient

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)

SUBJECT_MAPPING = {
    "applied_ack": "Application Received: {job_title} | Road Express ({reference_number})",
    "shortlisted": "Update: You have been shortlisted for {job_title} | Road Express",
    "rejected": "Road Express Application Update: {job_title}",
    "parse_failed_hr_alert": "HR Alert: Resume Parsing Failed for {job_title} | {candidate_name}",
    "offer_accepted_hr_alert": "HR Alert: Offer Accepted for {job_title} | {candidate_name}",
    "interview_invite": "Interview Scheduled — {job_title} at Road Express Freight",
    "interview_rescheduled": "Interview Rescheduled — {job_title} at Road Express Freight",
    "interview_cancelled": "Interview Update — {job_title} at Road Express Freight",
}


class NotificationService:
    @classmethod
    async def send_notification(
        cls,
        application_id: uuid.UUID,
        notification_type: str,
        custom_message: Optional[str] = None,
    ) -> bool:
        """
        Idempotent notification dispatch:
        1. Executes: INSERT INTO notifications ... ON CONFLICT (application_id, type) DO NOTHING RETURNING id
        2. If 0 rows returned -> already processed, skips sending (idempotent no-op).
        3. If row returned -> renders HTML template and sends email.
        4. Updates status to 'sent' or 'failed'.
        5. Never raises an exception to the caller.
        """
        async with app.database.AsyncSessionLocal() as db:
            notification_id = None
            try:
                # 1. Idempotent Insert using DB constraint
                insert_stmt = text(
                    """
                    INSERT INTO notifications (id, application_id, type, channel, status, provider_status, created_at)
                    VALUES (gen_random_uuid(), :application_id, :type, 'email', 'pending', 'pending', now())
                    ON CONFLICT (application_id, type) DO NOTHING
                    RETURNING id;
                    """
                )
                res = await db.execute(
                    insert_stmt,
                    {"application_id": application_id, "type": notification_type},
                )
                row = res.fetchone()

                if not row:
                    logger.info(
                        f"Notification '{notification_type}' for application {application_id} "
                        "already exists (idempotency triggered, skipping send)."
                    )
                    return False

                notification_id = row[0]
                await db.commit()

                # 2. Fetch Application details for email rendering
                app_stmt = (
                    select(Application)
                    .options(
                        joinedload(Application.candidate),
                        joinedload(Application.job_role),
                    )
                    .where(Application.id == application_id)
                )
                app_res = await db.execute(app_stmt)
                application = app_res.scalar_one_or_none()

                if not application or not application.candidate or not application.job_role:
                    err_msg = f"Cannot send notification: Application or relations missing for {application_id}"
                    logger.error(err_msg)
                    await cls._update_status(db, notification_id, "failed", provider_status="failed", error_message=err_msg)
                    return False

                candidate_email = application.candidate.email
                candidate_name = application.candidate.name
                job_title = application.job_role.title
                department = application.job_role.department
                ref_number = application.reference_number
                portal_url = settings.CANDIDATE_PORTAL_URL or "http://localhost:3000"
                tracking_url = f"{portal_url}/track?email={candidate_email}&reference_number={ref_number}"

                # 3. Render Template
                template_file = f"{notification_type}.html"
                try:
                    template = jinja_env.get_template(template_file)
                except Exception as t_err:
                    err_msg = f"Template not found for type '{notification_type}': {str(t_err)}"
                    logger.error(err_msg)
                    await cls._update_status(db, notification_id, "failed", provider_status="failed", error_message=err_msg)
                    return False

                template_vars = {
                    "candidate_name": candidate_name,
                    "candidate_email": candidate_email,
                    "candidate_id": str(application.candidate.id),
                    "job_title": job_title,
                    "department": department,
                    "reference_number": ref_number,
                    "tracking_url": tracking_url,
                    "portal_url": portal_url,
                    "hr_portal_url": "http://localhost:3001",
                    "custom_message": custom_message,
                }
                html_body = template.render(**template_vars)

                subject_pattern = SUBJECT_MAPPING.get(
                    notification_type,
                    "Road Express Application Update: {job_title}",
                )
                subject = subject_pattern.format(
                    job_title=job_title,
                    reference_number=ref_number,
                    candidate_name=candidate_name,
                )

                # 4. Determine recipient: HR for internal alerts, candidate for normal pipeline
                if notification_type in ("parse_failed_hr_alert", "offer_accepted_hr_alert"):
                    recipient_email = settings.EMAIL_FROM_ADDRESS or settings.SMTP_USER or "hr@roadexpress.com"
                else:
                    recipient_email = candidate_email

                # Send Email via Client
                EmailClient.send_email(
                    to_email=recipient_email,
                    subject=subject,
                    html_content=html_body,
                )

                # 5. Update Status to 'delivered'
                await cls._update_status(db, notification_id, "sent", provider_status="delivered")
                logger.info(f"Notification '{notification_type}' sent to {recipient_email}")
                return True

            except Exception as e:
                err_str = str(e)
                logger.error(
                    f"Email dispatch failed for notification {notification_id or notification_type}: {err_str}"
                )
                if notification_id:
                    try:
                        await db.rollback()
                        await cls._update_status(
                            db,
                            notification_id,
                            "failed",
                            provider_status="failed",
                            error_message=err_str,
                        )
                    except Exception as db_err:
                        logger.error(f"Failed to record notification failure: {db_err}")
                return False

    @staticmethod
    async def _update_status(
        db: AsyncSession,
        notification_id: uuid.UUID,
        status_value: str,
        provider_status: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Helper to update notification status, provider_status, and timestamp."""
        prov_status = provider_status or ("delivered" if status_value in ("sent", "delivered") else "failed" if status_value == "failed" else status_value)
        values = {
            "status": status_value,
            "provider_status": prov_status,
            "error_message": error_message,
        }
        if status_value in ("sent", "delivered") or prov_status == "delivered":
            values["sent_at"] = datetime.now(timezone.utc)

        stmt = (
            update(Notification)
            .where(Notification.id == notification_id)
            .values(**values)
        )
        await db.execute(stmt)
        await db.commit()
