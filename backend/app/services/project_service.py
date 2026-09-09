import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.projects import Project
from app.schemas.projects import ProjectCreate, ProjectUpdate


async def create_project(
    db: AsyncSession,
    owner_id: uuid.UUID,
    project_data: ProjectCreate,
) -> Project:
    """
    Creates a new Project associated with the authenticated user.
    """
    project = Project(
        name=project_data.name.strip(),
        description=project_data.description.strip() if project_data.description else None,
        repository_url=project_data.repository_url.strip() if project_data.repository_url else None,
        owner_id=owner_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def get_user_projects(
    db: AsyncSession,
    owner_id: uuid.UUID,
) -> List[Project]:
    """
    Retrieves all projects owned by the specified user, ordered by creation date descending.
    """
    stmt = select(Project).where(Project.owner_id == owner_id).order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_project_by_id(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> Optional[Project]:
    """
    Fetches a project by its primary key UUID.
    """
    stmt = select(Project).where(Project.id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_project(
    db: AsyncSession,
    project: Project,
    update_data: ProjectUpdate,
) -> Project:
    """
    Updates provided fields on an existing Project entity.
    """
    if update_data.name is not None:
        project.name = update_data.name.strip()
    if update_data.description is not None:
        project.description = update_data.description.strip() if update_data.description else None
    if update_data.repository_url is not None:
        project.repository_url = update_data.repository_url.strip() if update_data.repository_url else None

    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(
    db: AsyncSession,
    project: Project,
) -> None:
    """
    Deletes a project entity from the database.
    """
    await db.delete(project)
    await db.commit()
