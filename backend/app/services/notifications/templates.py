"""Email templates and renderers for HRMS notifications."""

from datetime import datetime
from typing import Any, Dict, Optional
import zoneinfo


def _format_datetime_ist(dt: datetime) -> str:
    """
    Formats a datetime object to:
    e.g. 'Monday, 18 November 2026 at 2:30 PM IST'
    """
    try:
        ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        if dt.tzinfo is None:
            # Assume UTC if naive, then convert to IST
            dt = dt.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(ist_tz)
        else:
            dt = dt.astimezone(ist_tz)
    except Exception:
        pass

    day = dt.day
    day_name = dt.strftime("%A")
    month_year = dt.strftime("%B %Y")
    time_part = dt.strftime("%I:%M %p").lstrip("0")
    return f"{day_name}, {day} {month_year} at {time_part} IST"


def _format_mode_detail(mode: str, meeting_link: Optional[str] = None, location: Optional[str] = None) -> str:
    if mode == "video":
        return f"Video Call (Meeting Link: {meeting_link or 'Link will be shared prior to the interview'})"
    elif mode == "in_person":
        return f"In-Person (Location: {location or 'Road Express Freight HQ'})"
    elif mode == "phone":
        return "Phone Interview (We will call you at your registered number)"
    return mode.capitalize()


def get_interview_invite_email(
    candidate_name: str,
    job_title: str,
    scheduled_at: datetime,
    mode: str,
    meeting_link: Optional[str] = None,
    location: Optional[str] = None,
    duration_minutes: int = 60,
) -> Dict[str, str]:
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    formatted_dt = _format_datetime_ist(scheduled_at) if isinstance(scheduled_at, datetime) else str(scheduled_at)
    mode_detail = _format_mode_detail(mode, meeting_link, location)

    subject = f"Interview Scheduled  -  {job_title} at Road Express Freight"
    body = (
        f"Dear {first_name},\n\n"
        f"We are pleased to invite you for an interview for the {job_title} position at Road Express Freight.\n\n"
        f"Interview Details:\n"
        f"- Date & Time: {formatted_dt}\n"
        f"- Mode: {mode_detail}\n"
        f"- Duration: {duration_minutes} minutes\n\n"
        f"Please ensure you are prepared and available 5 minutes prior to the scheduled start time.\n\n"
        f"If you have any queries or need to request changes, please reach out to us at hr@roadexpress.in.\n\n"
        f"Best regards,\n"
        f"Talent Acquisition Team\n"
        f"Road Express Freight"
    )
    return {"subject": subject, "body": body}


def get_interview_rescheduled_email(
    candidate_name: str,
    job_title: str,
    new_scheduled_at: datetime,
    mode: str = "video",
    meeting_link: Optional[str] = None,
    location: Optional[str] = None,
    duration_minutes: int = 60,
) -> Dict[str, str]:
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    formatted_dt = _format_datetime_ist(new_scheduled_at) if isinstance(new_scheduled_at, datetime) else str(new_scheduled_at)
    mode_detail = _format_mode_detail(mode, meeting_link, location)

    subject = f"Interview Rescheduled  -  {job_title} at Road Express Freight"
    body = (
        f"Dear {first_name},\n\n"
        f"Your interview has been rescheduled to {formatted_dt}.\n\n"
        f"Updated Interview Details:\n"
        f"- Position: {job_title}\n"
        f"- Date & Time: {formatted_dt}\n"
        f"- Mode: {mode_detail}\n"
        f"- Duration: {duration_minutes} minutes\n\n"
        f"If you have any queries or need to request changes, please reach out to us at hr@roadexpress.in.\n\n"
        f"Best regards,\n"
        f"Talent Acquisition Team\n"
        f"Road Express Freight"
    )
    return {"subject": subject, "body": body}


def get_interview_cancelled_email(
    candidate_name: str,
    job_title: str,
) -> Dict[str, str]:
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"

    subject = f"Interview Update  -  {job_title} at Road Express Freight"
    body = (
        f"Dear {first_name},\n\n"
        f"We are writing to let you know that your scheduled interview for the {job_title} position at Road Express Freight has been cancelled.\n\n"
        f"Our HR team will reach out shortly to arrange an alternate time that works for you.\n\n"
        f"If you have any questions in the meantime, please reach out to us at hr@roadexpress.in.\n\n"
        f"Best regards,\n"
        f"Talent Acquisition Team\n"
        f"Road Express Freight"
    )
    return {"subject": subject, "body": body}


# Template registry mapping for easy reference
EMAIL_TEMPLATES = {
    "interview_invite": {
        "subject": "Interview Scheduled  -  {job_title} at Road Express Freight",
        "render": get_interview_invite_email,
    },
    "interview_rescheduled": {
        "subject": "Interview Rescheduled  -  {job_title} at Road Express Freight",
        "render": get_interview_rescheduled_email,
    },
    "interview_cancelled": {
        "subject": "Interview Update  -  {job_title} at Road Express Freight",
        "render": get_interview_cancelled_email,
    },
}
