import uuid
import zlib
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.users import User
from app.models.organizations import Organization, OrganizationMember
from app.models.github import GitHubInstallation
from app.models.repositories import Repository
from app.schemas.repositories import RepositoryConnectRequest
from app.services.github_service import GitHubService, GitHubException


class RepositoryServiceError(Exception):
    """Base exception for repository service errors."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class RepositoryAlreadyExistsError(RepositoryServiceError):

    def __init__(self, full_name: str):
        super().__init__(f"Repository '{full_name}' is already connected.", status_code=409)


class RepositoryNotFoundError(RepositoryServiceError):

    def __init__(self, repository_id: uuid.UUID):
        super().__init__(f"Repository with ID '{repository_id}' not found.", status_code=404)


class RepositoryAccessDeniedError(RepositoryServiceError):

    def __init__(self):
        super().__init__("You do not have permission to access this repository.", status_code=403)


async def get_or_create_user_organization(db: AsyncSession, user: User) -> Organization:
    """
    Retrieves the user's primary organization or creates a personal organization if none exists.
    """
    stmt = (
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
    )
    result = await db.execute(stmt)
    org = result.scalars().first()

    if org:
        return org

    slug = f"user-{user.id.hex[:12]}"
    org_name = user.name or user.email.split("@")[0]
    new_org = Organization(
        name=f"{org_name}'s Workspace",
        slug=slug,
    )
    db.add(new_org)
    await db.flush()

    member = OrganizationMember(
        organization_id=new_org.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)
    await db.flush()

    return new_org


async def get_or_create_installation(
    db: AsyncSession,
    organization_id: uuid.UUID,
    github_installation_id: Optional[int] = None,
) -> GitHubInstallation:
    """
    Retrieves an existing GitHubInstallation for the organization or creates a default record.
    """
    if github_installation_id:
        stmt = select(GitHubInstallation).where(
            GitHubInstallation.github_installation_id == github_installation_id
        )
        result = await db.execute(stmt)
        installation = result.scalar_one_or_none()
        if installation:
            return installation

    stmt = select(GitHubInstallation).where(GitHubInstallation.organization_id == organization_id)
    result = await db.execute(stmt)
    installation = result.scalars().first()

    if installation:
        return installation

    inst_id = github_installation_id or (int(organization_id.int % 9000000) + 100000)
    new_inst = GitHubInstallation(
        organization_id=organization_id,
        github_installation_id=inst_id,
        target_type="User",
        target_name="default",
        status="active",
    )
    db.add(new_inst)
    await db.flush()
    return new_inst


async def list_user_repositories(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> List[Repository]:
    """
    Retrieves all connected repositories belonging to the organizations of the specified user.
    """
    user_orgs_stmt = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == user_id
    )
    user_orgs_result = await db.execute(user_orgs_stmt)
    org_ids = list(user_orgs_result.scalars().all())

    if not org_ids:
        return []

    stmt = (
        select(Repository)
        .where(Repository.organization_id.in_(org_ids))
        .order_by(Repository.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def connect_repository(
    db: AsyncSession,
    user: User,
    connect_data: RepositoryConnectRequest,
    github_service: Optional[GitHubService] = None,
) -> Repository:
    """
    Connects a GitHub repository to the user's organization.
    Checks for duplicates and metadata.
    """
    raw_full_name = connect_data.full_name.strip()
    if not raw_full_name or "/" not in raw_full_name:
        raise RepositoryServiceError(
            "Invalid repository name. Format must be 'owner/repo'.",
            status_code=400,
        )

    parts = raw_full_name.split("/", 1)
    owner_handle = parts[0].strip()
    repo_name = parts[1].strip()
    full_name = f"{owner_handle}/{repo_name}"

    # 1. Prevent Duplicate Repository Records
    duplicate_stmt = select(Repository).where(func.lower(Repository.full_name) == full_name.lower())
    duplicate_res = await db.execute(duplicate_stmt)
    if duplicate_res.scalar_one_or_none():
        raise RepositoryAlreadyExistsError(full_name)

    # 2. Get User Organization & Installation
    org = await get_or_create_user_organization(db, user)
    installation = await get_or_create_installation(db, org.id, connect_data.installation_id)

    # 3. Retrieve metadata from GitHub if GitHubService is provided
    default_branch = connect_data.default_branch or "main"
    is_private = connect_data.is_private if connect_data.is_private is not None else True
    github_repo_id = zlib.crc32(full_name.encode("utf-8"))

    if github_service:
        try:
            token_resp = await github_service.get_installation_access_token(
                installation.github_installation_id
            )
            token = token_resp.get("token", "")
            gh_repo = await github_service.get_repository(token, owner_handle, repo_name)
            if gh_repo:
                github_repo_id = gh_repo.get("id", github_repo_id)
                default_branch = gh_repo.get("default_branch", default_branch)
                is_private = gh_repo.get("private", is_private)
                owner_handle = gh_repo.get("owner", {}).get("login", owner_handle)
                repo_name = gh_repo.get("name", repo_name)
                full_name = gh_repo.get("full_name", full_name)
        except GitHubException as exc:
            if exc.status_code == 404:
                raise RepositoryServiceError(
                    f"GitHub repository '{full_name}' not found or access unauthorized.",
                    status_code=404,
                ) from exc
            raise RepositoryServiceError(
                f"Failed to verify repository with GitHub: {exc.message}",
                status_code=exc.status_code or 502,
            ) from exc

    repository = Repository(
        organization_id=org.id,
        github_installation_id=installation.id,
        github_repo_id=github_repo_id,
        name=repo_name,
        full_name=full_name,
        owner_handle=owner_handle,
        default_branch=default_branch,
        is_private=is_private,
        is_archived=False,
        is_active=True,
    )

    db.add(repository)
    await db.commit()
    await db.refresh(repository)
    return repository


async def get_repository_details(
    db: AsyncSession,
    repository_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Repository:
    """
    Retrieves details of a specific repository, validating authenticated user membership.
    """
    stmt = select(Repository).where(Repository.id == repository_id)
    result = await db.execute(stmt)
    repository = result.scalar_one_or_none()

    if not repository:
        raise RepositoryNotFoundError(repository_id)

    # Validate User Membership in Repository Organization
    access_stmt = select(OrganizationMember).where(
        OrganizationMember.organization_id == repository.organization_id,
        OrganizationMember.user_id == user_id,
    )
    access_res = await db.execute(access_stmt)
    if not access_res.scalar_one_or_none():
        raise RepositoryAccessDeniedError()

    return repository


async def sync_repository(
    db: AsyncSession,
    repository_id: uuid.UUID,
    user_id: uuid.UUID,
    github_service: Optional[GitHubService] = None,
) -> Repository:
    """
    Syncs repository metadata from GitHub for an authorized user.
    """
    repository = await get_repository_details(db, repository_id, user_id)

    if github_service:
        inst_stmt = select(GitHubInstallation).where(
            GitHubInstallation.id == repository.github_installation_id
        )
        inst_res = await db.execute(inst_stmt)
        installation = inst_res.scalar_one_or_none()

        if installation:
            try:
                token_resp = await github_service.get_installation_access_token(
                    installation.github_installation_id
                )
                token = token_resp.get("token", "")
                gh_repo = await github_service.get_repository(
                    token, repository.owner_handle, repository.name
                )
                if gh_repo:
                    repository.name = gh_repo.get("name", repository.name)
                    repository.full_name = gh_repo.get("full_name", repository.full_name)
                    repository.default_branch = gh_repo.get("default_branch", repository.default_branch)
                    repository.is_private = gh_repo.get("private", repository.is_private)
                    repository.is_archived = gh_repo.get("archived", repository.is_archived)
            except GitHubException as exc:
                raise RepositoryServiceError(
                    f"GitHub API sync failed: {exc.message}",
                    status_code=exc.status_code or 502,
                ) from exc

    await db.commit()
    await db.refresh(repository)
    return repository
