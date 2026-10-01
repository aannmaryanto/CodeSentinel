import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RepositoryConnectRequest(BaseModel):
    full_name: str = Field(..., description="GitHub repository full name (e.g. 'owner/repo')")
    installation_id: Optional[int] = Field(None, description="GitHub App installation ID")
    default_branch: Optional[str] = Field("main", description="Default branch name")
    is_private: Optional[bool] = Field(True, description="Whether the repository is private")


class RepositoryResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    github_installation_id: uuid.UUID
    github_repo_id: int
    name: str
    full_name: str
    owner_handle: str
    default_branch: str
    is_private: bool
    is_archived: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
