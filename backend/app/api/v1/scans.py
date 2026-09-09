import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.core.auth_middleware import get_current_user
from app.schemas.scans import ScanResponse
from app.services import project_service, source_service, scanner_service

router = APIRouter()


@router.post(
    "/{project_id}/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def trigger_project_scan(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanResponse:
    """
    Triggers a static analysis security scan on the uploaded source code workspace
    for a project owned by the authenticated user.
    """
    project = await project_service.get_project_by_id(db=db, project_id=project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to scan this project.",
        )

    source = await source_service.get_latest_project_source(db=db, project_id=project_id)

    if source is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No source code submitted for this project yet.",
        )

    if source.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project source code is not ready for scanning.",
        )

    scan_result = await scanner_service.run_project_scan(
        db=db,
        project=project,
        source=source,
    )
    return scan_result
