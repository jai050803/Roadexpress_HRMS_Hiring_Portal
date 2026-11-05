import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PresignedUrlResponse(BaseModel):
    resume_id: uuid.UUID
    file_name: Optional[str] = None
    download_url: str
    expires_in_seconds: int = 900

    model_config = ConfigDict(from_attributes=True)
