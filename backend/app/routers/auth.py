from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import extract_bearer_token, require_hr_user
from app.models.hr_user import HRUser
from app.schemas.auth import HRUserProfileResponse, LoginRequest, TokenResponse
from app.services.auth import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="HR user login",
)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate HR user with email and password, returning a JWT access token."""
    user = await auth_service.authenticate_user(
        db=db,
        email=credentials.email,
        password=credentials.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "invalid_credentials",
                "message": "Invalid email or password",
                "details": {},
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, expires_in = auth_service.create_access_token(user_id=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Invalidate current session",
)
async def logout(
    token: str = Depends(extract_bearer_token),
    current_user: HRUser = Depends(require_hr_user),
):
    """Invalidate current JWT access token by adding its jti to Redis blocklist."""
    auth_service.block_token(token)
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=HRUserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current HR user profile",
)
async def get_me(
    current_user: HRUser = Depends(require_hr_user),
):
    """Return the currently authenticated HR user profile."""
    return current_user
