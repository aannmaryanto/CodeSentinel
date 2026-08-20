import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, BigInteger, Integer, Text, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    github_pr_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False,
        index=True,
    )
    number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    author_handle: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    source_branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    target_branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    head_sha: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
    )
    base_sha: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    is_merged: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    merged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
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

    __table_args__ = (
        UniqueConstraint("repository_id", "number", name="uk_prs_repo_number"),
        CheckConstraint("state IN ('open', 'closed', 'merged')", name="ck_pr_state"),
        Index("idx_prs_org_id", "organization_id"),
        Index("idx_prs_head_sha", "head_sha"),
    )


class PullRequestFile(Base):
    __tablename__ = "pull_request_files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    pull_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pull_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    additions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    deletions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    changed_lines: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    blob_sha: Mapped[Optional[str]] = mapped_column(
        String(40),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("status IN ('added', 'modified', 'deleted', 'renamed')", name="ck_pr_file_status"),
    )
