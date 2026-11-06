import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class EmailClient:
    """
    Direct SMTP email client using configured backend environment credentials.
    All external third-party API dependencies (e.g. SendGrid) are removed.
    """

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> bool:
        """
        Sends an email via SMTP with STARTTLS.
        Raises an exception if delivery fails (caught by NotificationService).
        """
        smtp_user = settings.clean_smtp_user
        sender_email = smtp_user or from_email or settings.EMAIL_FROM_ADDRESS
        sender_name = from_name or settings.EMAIL_FROM_NAME

        return cls._send_smtp(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_email=sender_email,
            from_name=sender_name,
        )

    @classmethod
    def _send_smtp(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str,
        from_name: str,
    ) -> bool:
        """
        Sends email via SMTP server with TLS using configured SMTP details.
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        host = settings.clean_smtp_host
        port = settings.SMTP_PORT or 587
        user = settings.clean_smtp_user
        password = settings.clean_smtp_password

        logger.info(f"Connecting to SMTP server at {host}:{port} for {to_email}")

        # Connect with 10-second timeout
        server = smtplib.SMTP(host=host, port=port, timeout=10)
        try:
            server.ehlo()
            # Attempt STARTTLS if supported
            if server.has_extn("STARTTLS"):
                server.starttls()
                server.ehlo()

            # Attempt login if credentials are provided
            if user and password and password != "your-smtp-password":
                server.login(user, password)

            server.sendmail(from_email, [to_email], msg.as_string())
            logger.info(f"Email successfully sent to {to_email} via SMTP")
            return True
        finally:
            try:
                server.quit()
            except Exception:
                pass
