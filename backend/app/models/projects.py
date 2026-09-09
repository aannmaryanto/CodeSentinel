import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.users import User
    from app.models.scans import Scan
    from app.models.findings import Finding
    from app.models.sources import ProjectSource


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    repository_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="projects",
    )
    scans: Mapped[List["Scan"]] = relationship(
        "Scan",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    findings: Mapped[List["Finding"]] = relationship(
        "Finding",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    sources: Mapped[List["ProjectSource"]] = relationship(
        "ProjectSource",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_projects_owner_id", "owner_id"),
        Index("idx_projects_name", "name"),
    )
