"""add project_sources table

Revision ID: 003_add_project_sources_table
Revises: 002_add_projects_scans_findings
Create Date: 2026-08-21 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_add_project_sources_table"
down_revision: Union[str, None] = "002_add_projects_scans_findings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(length=50), server_default="archive", nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("storage_path", sa.String(length=1000), nullable=False),
        sa.Column("file_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("uncompressed_size_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ready", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('ready', 'processing', 'failed')", name="ck_project_source_status"),
    )
    op.create_index("idx_project_sources_project_id", "project_sources", ["project_id"])
    op.create_index("idx_project_sources_status", "project_sources", ["status"])


def downgrade() -> None:
    op.drop_index("idx_project_sources_status", table_name="project_sources")
    op.drop_index("idx_project_sources_project_id", table_name="project_sources")
    op.drop_table("project_sources")
