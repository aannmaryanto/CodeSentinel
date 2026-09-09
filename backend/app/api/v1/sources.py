import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.core.auth_middleware import get_current_user
from app.schemas.sources import ProjectSourceResponse
from app.services import project_service, source_service

router = APIRouter()


@router.post(
    "/{project_id}/source",
    response_model=ProjectSourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_project_source(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectSourceResponse:
    """
    Submits, validates, and securely extracts a source code archive (.zip, .tar.gz, .tgz, .tar)
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
            detail="You do not have permission to upload source code to this project.",
        )

    source = await source_service.save_and_extract_source(
        db=db,
        project=project,
        upload_file=file,
    )
    return ProjectSourceResponse.model_validate(source)


@router.get(
    "/{project_id}/source",
    response_model=ProjectSourceResponse,
)
async def get_project_source(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectSourceResponse:
    """
    Retrieves metadata for the latest submitted source code for a project.
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
            detail="You do not have permission to access source metadata for this project.",
        )

    source = await source_service.get_latest_project_source(db=db, project_id=project_id)

    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No source code submitted for this project yet.",
        )

    return ProjectSourceResponse.model_validate(source)
