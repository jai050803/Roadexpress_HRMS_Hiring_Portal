import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-32-char-min"
    APP_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hrms_user:hrms_pass@localhost:5432/hrms_db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Object Storage
    STORAGE_PROVIDER: str = "minio"  # s3 | minio
    AWS_ACCESS_KEY_ID: str = "minioadmin"
    AWS_SECRET_ACCESS_KEY: str = "minioadmin"
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "road-express-resumes"
    MINIO_ENDPOINT_URL: Optional[str] = "http://localhost:9000"
    MINIO_PUBLIC_URL: Optional[str] = "http://localhost:9000"

    # Email
    EMAIL_PROVIDER: str = "smtp"  # smtp | sendgrid
    SENDGRID_API_KEY: Optional[str] = None
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = "hr@roadexpress.com"
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "hr@roadexpress.com"
    EMAIL_FROM_NAME: str = "Road Express HR Team"

    # AI Screening
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Google Calendar
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    GOOGLE_CALENDAR_ID: str = "primary"

    # Candidate Portal URL
    CANDIDATE_PORTAL_URL: str = "http://localhost:3000"

    # Resume Upload
    MAX_RESUME_SIZE_MB: int = 5
    ALLOWED_RESUME_TYPES: str = "application/pdf"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.APP_CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.APP_CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_resume_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_RESUME_TYPES.split(",") if t.strip()]


settings = Settings()
