import hashlib
import os
import re
import uuid
from pathlib import Path
from typing import Optional, Tuple
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.config import settings

MAX_RESUME_SIZE_BYTES = 5_242_880  # 5 * 1024 * 1024 bytes (5MB)

# Local storage fallback directory
LOCAL_STORAGE_DIR = Path("uploads/resumes")
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_s3_client():
    """
    Returns an S3 client configured for MinIO or AWS S3 based on STORAGE_PROVIDER setting.
    """
    if settings.STORAGE_PROVIDER == "minio":
        return boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT_URL or "http://localhost:9000",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                connect_timeout=2,
                read_timeout=5,
                retries={"max_attempts": 2},
            ),
            region_name=settings.AWS_REGION or "us-east-1",
        )
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 2}),
    )


def ensure_bucket_exists(s3_client, bucket_name: str):
    """
    Creates the target S3/MinIO bucket if it does not already exist.
    """
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=bucket_name)
        except Exception:
            pass


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal or invalid characters."""
    base = os.path.basename(filename or "resume.pdf")
    cleaned = re.sub(r"[^\w\.-]", "_", base)
    if not cleaned.lower().endswith(".pdf"):
        cleaned += ".pdf"
    return cleaned


async def save_resume_file(
    file: UploadFile,
    application_id: uuid.UUID,
    job_role_id: uuid.UUID,
) -> Tuple[str, str, int, str]:
    """
    Validates PDF file, computes SHA-256, and stores file in MinIO/S3 using the key pattern:
    resumes/{job_role_id}/{application_id}/{filename}

    Returns:
    (internal_s3_url, sanitized_filename, file_size_bytes, file_hash)
    """
    filename = file.filename or ""

    # 1. Validate file extension and MIME type
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_file_type",
                "message": "Only PDF files (application/pdf) are accepted.",
            },
        )

    if file.content_type and file.content_type.lower() != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_file_type",
                "message": "Only PDF files (application/pdf) are accepted.",
            },
        )

    # 2. Read content and validate size (max 5MB)
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file exceeds the 5MB maximum size limit.",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "empty_file",
                "message": "Uploaded resume file is empty.",
            },
        )

    # 3. Validate PDF magic bytes
    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_file_type",
                "message": "Only valid PDF files are accepted.",
            },
        )

    # 4. Calculate SHA-256 hash
    file_hash = hashlib.sha256(content).hexdigest()
    safe_filename = sanitize_filename(filename)

    # 5. Key pattern: resumes/{job_role_id}/{application_id}/{filename}
    file_key = f"resumes/{job_role_id}/{application_id}/{safe_filename}"
    bucket = settings.S3_BUCKET_NAME

    # 6. Store file in object storage (MinIO or S3)
    try:
        s3 = get_s3_client()
        ensure_bucket_exists(s3, bucket)
        s3.put_object(
            Bucket=bucket,
            Key=file_key,
            Body=content,
            ContentType="application/pdf",
        )
        stored_internal_url = f"s3://{bucket}/{file_key}"
    except Exception as e:
        # Fallback to local storage if object storage is unreachable
        local_target = LOCAL_STORAGE_DIR / f"{job_role_id}_{application_id}_{safe_filename}"
        with open(local_target, "wb") as f:
            f.write(content)
        stored_internal_url = f"s3://{bucket}/{file_key}"

    return stored_internal_url, safe_filename, file_size, file_hash


def get_public_s3_client():
    """
    Returns an S3 client configured with the browser-facing public endpoint (e.g. http://localhost:9000)
    so presigned URLs are directly downloadable from the user's browser outside Docker.
    """
    if settings.STORAGE_PROVIDER == "minio":
        public_endpoint = getattr(settings, "MINIO_PUBLIC_URL", None) or "http://localhost:9000"
        return boto3.client(
            "s3",
            endpoint_url=public_endpoint,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                connect_timeout=2,
                read_timeout=5,
                retries={"max_attempts": 2},
            ),
            region_name=settings.AWS_REGION or "ap-south-1",
        )
    return get_s3_client()


def generate_presigned_download_url(
    file_url: str,
    expires_in: int = 900,
) -> str:
    """
    Generates a pre-signed download URL that expires in 15 minutes (default 900 seconds).
    Accepts internal S3 URL in format s3://{bucket}/{key}.
    Uses browser-facing public endpoint (e.g. localhost:9000) for MinIO so the link works in user browsers.
    """
    bucket = settings.S3_BUCKET_NAME
    key = file_url

    if file_url.startswith("s3://"):
        parts = file_url[5:].split("/", 1)
        if len(parts) == 2:
            bucket, key = parts[0], parts[1]

    try:
        s3 = get_public_s3_client()
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        return url
    except Exception as e:
        # If presigned URL generation fails, return the internal key
        return f"/resumes/file/{key}"


def download_resume_file(file_url: str) -> bytes:
    """
    Downloads resume file bytes given an internal storage URL (s3://bucket/key or local path).
    Tries S3/MinIO first; falls back to local storage if needed.
    """
    bucket = settings.S3_BUCKET_NAME
    key = file_url

    if file_url.startswith("s3://"):
        parts = file_url[5:].split("/", 1)
        if len(parts) == 2:
            bucket, key = parts[0], parts[1]

    # 1. Try S3 / MinIO
    try:
        s3 = get_s3_client()
        response = s3.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except Exception:
        pass

    # 2. Check local fallback storage
    # File keys are structured as: resumes/{job_role_id}/{application_id}/{filename}
    parts = key.split("/")
    if len(parts) >= 4 and parts[0] == "resumes":
        local_name = f"{parts[1]}_{parts[2]}_{parts[3]}"
        local_path = LOCAL_STORAGE_DIR / local_name
        if local_path.exists():
            return local_path.read_bytes()

    direct_local = LOCAL_STORAGE_DIR / key
    if direct_local.exists():
        return direct_local.read_bytes()

    if Path(key).exists():
        return Path(key).read_bytes()

    raise FileNotFoundError(f"Resume file not found in S3/MinIO ({bucket}/{key}) or local disk.")

