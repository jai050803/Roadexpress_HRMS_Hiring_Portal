from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.hr_user import HRUser
from app.services.auth import auth_service


def extract_bearer_token(authorization: str | None = Header(None)) -> str:
    """Extract bearer token from Authorization header or raise 401."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "missing_token",
                "message": "Authorization header is required",
                "details": {},
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "invalid_token_format",
                "message": "Authorization header must be in format 'Bearer <token>'",
                "details": {},
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return parts[1]


async def require_hr_user(
    token: str = Depends(extract_bearer_token),
    db: AsyncSession = Depends(get_db),
) -> HRUser:
    """FastAPI dependency to protect HR routes. Validates JWT and returns current HR user."""
    return await auth_service.get_current_user(token=token, db=db)
