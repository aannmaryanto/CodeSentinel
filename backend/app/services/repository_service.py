import io
import os
import tempfile
import uuid
import zipfile
import zlib
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.users import User
from app.models.organizations import Organization, OrganizationMember
from app.models.github import GitHubInstallation
from app.models.repositories import Repository
from app.models.projects import Project
from app.schemas.repositories import RepositoryConnectRequest
from app.schemas.scans import ScanResponse
from app.services.github_service import GitHubService, GitHubException, GitHubNotFoundError
from app.services import scanner_service
from app.services.scanner.engine import is_safe_workspace_path



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
    target_type: str = "User",
    target_name: str = "default",
) -> GitHubInstallation:
    """
    Retrieves an existing active GitHubInstallation for the organization or creates a record with a real installation ID.
    """
    if github_installation_id:
        stmt = select(GitHubInstallation).where(
            GitHubInstallation.github_installation_id == github_installation_id
        )
        result = await db.execute(stmt)
        installation = result.scalar_one_or_none()
        if installation:
            if installation.status != "active":
                raise RepositoryServiceError(
                    f"GitHub Installation '{github_installation_id}' is not active (status: {installation.status}).",
                    status_code=400,
                )
            return installation

    stmt = select(GitHubInstallation).where(
        GitHubInstallation.organization_id == organization_id,
        GitHubInstallation.status == "active",
    )
    result = await db.execute(stmt)
    installation = result.scalars().first()

    if installation:
        return installation

    if not github_installation_id:
        raise RepositoryServiceError(
            "A valid GitHub App installation ID is required to connect a repository.",
            status_code=400,
        )

    new_inst = GitHubInstallation(
        organization_id=organization_id,
        github_installation_id=github_installation_id,
        target_type=target_type,
        target_name=target_name,
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
    Resolves real GitHub App installation and verifies repository metadata.
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

    # 2. Get User Organization
    org = await get_or_create_user_organization(db, user)

    # 3. Resolve Real GitHub Installation & Retrieve Metadata
    default_branch = connect_data.default_branch or "main"
    is_private = connect_data.is_private if connect_data.is_private is not None else True
    github_repo_id = zlib.crc32(full_name.encode("utf-8"))
    resolved_installation_id = connect_data.installation_id

    if github_service:
        # A. Resolve real GitHub App installation for the repository
        try:
            gh_inst = await github_service.get_repository_installation(owner_handle, repo_name)
            resolved_installation_id = gh_inst.get("id") or resolved_installation_id
            target_type = gh_inst.get("target_type") or "User"
            target_name = gh_inst.get("account", {}).get("login") or owner_handle
        except GitHubNotFoundError as exc:
            raise RepositoryServiceError(
                f"GitHub App is not installed on repository '{full_name}'. Please install CodeSentinel on your GitHub account or organization first.",
                status_code=404,
            ) from exc
        except GitHubException as exc:
            raise RepositoryServiceError(
                f"Failed to resolve GitHub App installation for '{full_name}': {exc.message}",
                status_code=exc.status_code or 502,
            ) from exc

        if not resolved_installation_id:
            raise RepositoryServiceError(
                f"Could not determine GitHub App installation ID for '{full_name}'.",
                status_code=400,
            )

        # B. Get or create GitHubInstallation record in DB using real installation ID
        installation = await get_or_create_installation(
            db,
            org.id,
            github_installation_id=resolved_installation_id,
            target_type=target_type,
            target_name=target_name,
        )

        # C. Retrieve repository metadata using installation token
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
            raise RepositoryServiceError(
                f"Failed to verify repository metadata with GitHub: {exc.message}",
                status_code=exc.status_code or 502,
            ) from exc
    else:
        if not resolved_installation_id:
            raise RepositoryServiceError(
                "A valid GitHub installation ID is required to connect a repository.",
                status_code=400,
            )
        installation = await get_or_create_installation(
            db, org.id, github_installation_id=resolved_installation_id
        )

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

        if not installation or installation.status != "active":
            status_desc = installation.status if installation else "missing"
            raise RepositoryServiceError(
                f"Cannot sync repository. Associated GitHub installation is not active (status: {status_desc}).",
                status_code=400,
            )

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


def safe_extract_zip(zip_bytes: bytes, target_dir: str) -> None:
    """
    Safely extracts a ZIP archive into target_dir, checking for path traversal (Zip Slip).
    """
    target_dir_abs = os.path.abspath(target_dir)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for member in zf.infolist():
            member_path = os.path.abspath(os.path.join(target_dir_abs, member.filename))
            if not is_safe_workspace_path(target_dir_abs, member_path):
                raise RepositoryServiceError(
                    f"Path traversal detected in repository archive member '{member.filename}'.",
                    status_code=400,
                )
        zf.extractall(target_dir_abs)


async def get_or_create_project_for_repository(
    db: AsyncSession,
    user_id: uuid.UUID,
    repository: Repository,
) -> Project:
    """
    Retrieves or creates a Project record for the repository owned by the user.
    """
    stmt = select(Project).where(
        Project.owner_id == user_id,
        Project.name == repository.name,
    )
    result = await db.execute(stmt)
    project = result.scalars().first()
    if project:
        return project

    new_project = Project(
        name=repository.name,
        description=f"GitHub Repository: {repository.full_name}",
        repository_url=f"https://github.com/{repository.full_name}",
        owner_id=user_id,
    )
    db.add(new_project)
    await db.flush()
    return new_project


async def scan_repository(
    db: AsyncSession,
    repository_id: uuid.UUID,
    user_id: uuid.UUID,
    github_service: Optional[GitHubService] = None,
) -> ScanResponse:
    """
    Triggers a security scan for a connected repository.
    Downloads source code archive securely from GitHub, safely extracts inside TemporaryDirectory(),
    runs static analysis scanner, persists scan/finding records, and updates repository metadata.
    Returns ScanResponse containing scan details, status, total findings, severity counts, and findings list.
    """
    repository = await get_repository_details(db, repository_id, user_id)

    inst_stmt = select(GitHubInstallation).where(
        GitHubInstallation.id == repository.github_installation_id
    )
    inst_res = await db.execute(inst_stmt)
    installation = inst_res.scalar_one_or_none()

    if not installation or installation.status != "active":
        status_desc = installation.status if installation else "missing"
        raise RepositoryServiceError(
            f"Cannot scan repository. Associated GitHub installation is not active (status: {status_desc}).",
            status_code=400,
        )

    project = await get_or_create_project_for_repository(db, user_id, repository)

    if github_service:
        try:
            token_resp = await github_service.get_installation_access_token(
                installation.github_installation_id
            )
            token = token_resp.get("token", "")
            archive_bytes = await github_service.download_repository_archive(
                token, repository.owner_handle, repository.name, repository.default_branch
            )
        except GitHubException as exc:
            raise RepositoryServiceError(
                f"Failed to download repository archive from GitHub: {exc.message}",
                status_code=exc.status_code or 502,
            ) from exc

        with tempfile.TemporaryDirectory() as temp_dir:
            safe_extract_zip(archive_bytes, temp_dir)

            # GitHub zipball archives extract as a single top-level folder (owner-repo-commit/)
            entries = [os.path.join(temp_dir, e) for e in os.listdir(temp_dir)]
            subdirs = [e for e in entries if os.path.isdir(e)]
            scan_workspace = subdirs[0] if len(subdirs) == 1 else temp_dir

            scan = await scanner_service.scan_workspace_directory(
                db=db,
                project_id=project.id,
                workspace_dir=scan_workspace,
                branch=repository.default_branch,
            )

            repository.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(repository)
            return await scanner_service.build_scan_response(db=db, scan=scan)
    else:
        scan = await scanner_service.scan_workspace_directory(
            db=db,
            project_id=project.id,
            workspace_dir=tempfile.gettempdir(),
            branch=repository.default_branch,
        )
        repository.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(repository)
        return await scanner_service.build_scan_response(db=db, scan=scan)


