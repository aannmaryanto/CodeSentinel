import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class FindingResponse(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    project_id: uuid.UUID
    rule_id: str
    title: str
    description: str
    severity: str
    category: str
    file_path: str
    line_number: int
    code_snippet: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ScanResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_findings: int = 0
    severity_counts: SeverityCounts = SeverityCounts()
    findings: List[FindingResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
