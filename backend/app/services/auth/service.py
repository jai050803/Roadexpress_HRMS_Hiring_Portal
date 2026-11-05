import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from redis import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import settings
from app.models.hr_user import HRUser


def get_redis_client() -> Redis:
    """Return a synchronous Redis client for token blocklist operations."""
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


class AuthService:
    def __init__(self):
        self._redis: Optional[Redis] = None

    @property
    def redis(self) -> Redis:
        if self._redis is None:
            self._redis = get_redis_client()
        return self._redis

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password using bcrypt. Password is never logged."""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify plaintext password against bcrypt hash. Password is never logged."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    async def authenticate_user(
        self, db: AsyncSession, email: str, password: str
    ) -> Optional[HRUser]:
        """Verify user credentials against database. Returns HRUser if valid, None otherwise."""
        stmt = select(HRUser).where(
            HRUser.email == email.strip().lower(),
            HRUser.is_active == True,
        )
        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            return None

        if not self.verify_password(password, user.password_hash):
            return None

        return user

    def create_access_token(self, user_id: uuid.UUID | str) -> tuple[str, int]:
        """
        Create a JWT containing:
        - sub: user UUID
        - jti: unique token ID for Redis blocklist on logout
        - exp: expiration timestamp
        - iat: issued-at timestamp
        Returns (token, expires_in_seconds).
        """
        expires_seconds = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        now = datetime.now(timezone.utc)
        exp = now + timedelta(seconds=expires_seconds)
        jti = str(uuid.uuid4())

        payload = {
            "sub": str(user_id),
            "jti": jti,
            "exp": exp,
            "iat": now,
        }

        token = jwt.encode(
            payload,
            settings.APP_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return token, expires_seconds

    def block_token(self, token: str) -> None:
        """Add token's jti to Redis blocklist until token's original expiration."""
        try:
            payload = jwt.decode(
                token,
                settings.APP_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False},
            )
            jti = payload.get("jti")
            exp = payload.get("exp")

            if jti and exp:
                now = datetime.now(timezone.utc).timestamp()
                remaining = int(exp - now)
                if remaining > 0:
                    self.redis.set(f"bl:{jti}", "1", ex=remaining)
        except Exception:
            # If token cannot be decoded, ignore
            pass

    def is_token_blocked(self, jti: str) -> bool:
        """Check if jti is present in Redis blocklist."""
        try:
            return bool(self.redis.exists(f"bl:{jti}"))
        except Exception:
            # If Redis is temporarily unreachable, fallback safely
            return False

    async def get_current_user(self, token: str, db: AsyncSession) -> HRUser:
        """
        Decode and validate JWT token, check blocklist, and load user from DB.
        Raises 401 HTTPException with standard API error shape if invalid/expired/revoked.
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "unauthorized",
                "message": "Could not validate authentication credentials",
                "details": {},
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = jwt.decode(
                token,
                settings.APP_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "token_expired",
                    "message": "Token has expired",
                    "details": {},
                },
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise credentials_exception

        user_id_str: Optional[str] = payload.get("sub")
        jti: Optional[str] = payload.get("jti")

        if not user_id_str:
            raise credentials_exception

        # Check blocklist
        if jti and self.is_token_blocked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "token_revoked",
                    "message": "Token has been revoked",
                    "details": {},
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
            raise credentials_exception

        stmt = select(HRUser).where(HRUser.id == user_uuid, HRUser.is_active == True)
        result = await db.execute(stmt)
        user = result.scalars().first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "user_not_found",
                    "message": "User not found or account is deactivated",
                    "details": {},
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user


auth_service = AuthService()
