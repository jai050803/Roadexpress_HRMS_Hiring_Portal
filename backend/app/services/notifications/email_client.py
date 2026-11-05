import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class EmailClient:
    """
    Email client abstraction that supports SMTP and SendGrid.
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
        Sends an email using configured provider (smtp or sendgrid).
        Raises an exception if delivery fails (caught by NotificationService).
        """
        sender_email = from_email or settings.EMAIL_FROM_ADDRESS
        sender_name = from_name or settings.EMAIL_FROM_NAME

        provider = settings.EMAIL_PROVIDER.lower().strip()

        if provider == "sendgrid":
            return cls._send_sendgrid(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                from_email=sender_email,
                from_name=sender_name,
            )
        else:
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
        Sends email via SMTP server with TLS.
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        host = settings.SMTP_HOST or "localhost"
        port = settings.SMTP_PORT or 587
        user = settings.SMTP_USER
        password = settings.SMTP_PASSWORD

        logger.info(f"Connecting to SMTP server at {host}:{port}")

        # Connect with 5-second timeout
        server = smtplib.SMTP(host=host, port=port, timeout=5)
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

    @classmethod
    def _send_sendgrid(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str,
        from_name: str,
    ) -> bool:
        """
        Sends email via SendGrid v3 Mail Send API.
        """
        api_key = settings.SENDGRID_API_KEY
        if not api_key:
            raise ValueError("SENDGRID_API_KEY is not configured")

        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email, "name": from_name},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}],
        }

        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 202):
                raise RuntimeError(f"SendGrid API failed with status {resp.status_code}: {resp.text}")

        logger.info(f"Email successfully sent to {to_email} via SendGrid")
        return True
