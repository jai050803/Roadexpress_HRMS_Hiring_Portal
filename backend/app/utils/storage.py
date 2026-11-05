import hashlib
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.config import settings

# Directory for local fallback storage if object storage is unreachable
LOCAL_STORAGE_DIR = Path("uploads/resumes")
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_s3_client():
    if settings.STORAGE_PROVIDER == "minio":
        return boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT_URL or "http://localhost:9000",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4", connect_timeout=1, read_timeout=2, retries={"max_attempts": 1}),
            region_name=settings.AWS_REGION or "us-east-1",
        )
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(connect_timeout=2, read_timeout=3, retries={"max_attempts": 1}),
        region_name=settings.AWS_REGION,
    )


def ensure_bucket_exists(s3_client, bucket_name: str):
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=bucket_name)
        except Exception:
            pass


async def save_resume_file(
    file: UploadFile,
    application_id: uuid.UUID,
) -> Tuple[str, str, int, str]:
    """
    Validates PDF file, computes SHA-256, and stores file in MinIO/S3 (or local fallback).
    Returns (file_url, file_name, file_size_bytes, file_hash).
    """
    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_file_type", "message": "Only PDF files are accepted for resume upload."},
        )

    content = await file.read()
    file_size = len(content)

    max_size_bytes = settings.MAX_RESUME_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "file_too_large", "message": f"Resume file size exceeds maximum limit of {settings.MAX_RESUME_SIZE_MB}MB."},
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "empty_file", "message": "Uploaded resume file is empty."},
        )

    # Calculate SHA-256 hash
    file_hash = hashlib.sha256(content).hexdigest()

    # Generate object key
    file_key = f"resumes/{application_id}/{file_hash[:12]}_{filename}"

    # Try storing to S3 / MinIO
    stored_url = None
    try:
        s3 = get_s3_client()
        bucket = settings.S3_BUCKET_NAME
        ensure_bucket_exists(s3, bucket)
        s3.put_object(
            Bucket=bucket,
            Key=file_key,
            Body=content,
            ContentType="application/pdf",
        )
        stored_url = f"s3://{bucket}/{file_key}"
    except Exception as e:
        # Fallback to local storage
        local_path = LOCAL_STORAGE_DIR / f"{application_id}_{filename}"
        with open(local_path, "wb") as f:
            f.write(content)
        stored_url = str(local_path.as_posix())

    return stored_url, filename, file_size, file_hash
