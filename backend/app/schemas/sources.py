import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProjectSourceResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    source_type: str = "archive"
    file_name: str
    file_size_bytes: int
    checksum_sha256: str
    file_count: int
    uncompressed_size_bytes: int
    storage_path: Optional[str] = None
    status: str = "ready"
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
