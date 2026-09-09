import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, BigInteger, Integer, Text, DateTime, ForeignKey, CheckConstraint, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.projects import Project


class ProjectSource(Base):
    __tablename__ = "project_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        default="archive",
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    checksum_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    storage_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    file_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    uncompressed_size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ready",
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
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
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="sources",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('ready', 'processing', 'failed')",
            name="ck_project_source_status",
        ),
        Index("idx_project_sources_project_id", "project_id"),
        Index("idx_project_sources_status", "status"),
    )
