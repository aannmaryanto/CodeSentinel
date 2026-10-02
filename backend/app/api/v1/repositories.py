import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.core.auth_middleware import get_current_user
from app.schemas.repositories import RepositoryConnectRequest, RepositoryResponse
from app.schemas.scans import ScanResponse
from app.services import repository_service
from app.services.repository_service import RepositoryServiceError
from app.services.github_service import GitHubService

router = APIRouter()


def get_github_service() -> GitHubService:
    """Dependency injector for GitHubService."""
    return GitHubService()


@router.get("", response_model=List[RepositoryResponse])
@router.get("/", response_model=List[RepositoryResponse], include_in_schema=False)
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RepositoryResponse]:
    """
    Retrieves all connected repositories belonging to the authenticated user's organization(s).
    """
    repos = await repository_service.list_user_repositories(db=db, user_id=current_user.id)
    return [RepositoryResponse.model_validate(r) for r in repos]


@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def connect_new_repository(
    connect_data: RepositoryConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    github_service: GitHubService = Depends(get_github_service),
) -> RepositoryResponse:
    """
    Connects a new GitHub repository for the authenticated user's workspace.
    """
    try:
        repo = await repository_service.connect_repository(
            db=db,
            user=current_user,
            connect_data=connect_data,
            github_service=github_service,
        )
        return RepositoryResponse.model_validate(repo)
    except RepositoryServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/{repository_id}", response_model=RepositoryResponse)
async def get_repository_details(
    repository_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RepositoryResponse:
    """
    Retrieves details of a specific connected repository owned by the authenticated user.
    """
    try:
        repo = await repository_service.get_repository_details(
            db=db,
            repository_id=repository_id,
            user_id=current_user.id,
        )
        return RepositoryResponse.model_validate(repo)
    except RepositoryServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/{repository_id}/sync", response_model=RepositoryResponse)
async def sync_repository_metadata(
    repository_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    github_service: GitHubService = Depends(get_github_service),
) -> RepositoryResponse:
    """
    Syncs repository metadata from GitHub for a connected repository.
    """
    try:
        repo = await repository_service.sync_repository(
            db=db,
            repository_id=repository_id,
            user_id=current_user.id,
            github_service=github_service,
        )
        return RepositoryResponse.model_validate(repo)
    except RepositoryServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/{repository_id}/scan", response_model=ScanResponse)
async def scan_repository_code(
    repository_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    github_service: GitHubService = Depends(get_github_service),
) -> ScanResponse:
    """
    Triggers an automated code security scan for a connected repository.
    """
    try:
        scan_result = await repository_service.scan_repository(
            db=db,
            repository_id=repository_id,
            user_id=current_user.id,
            github_service=github_service,
        )
        return scan_result
    except RepositoryServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

