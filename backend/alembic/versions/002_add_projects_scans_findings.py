"""add projects, scans, findings tables and update users table

Revision ID: 002_add_projects_scans_findings
Revises: 001_initial_schema
Create Date: 2026-08-21 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_add_projects_scans_findings"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update users table
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hashed_password", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("role", sa.String(length=50), server_default="developer", nullable=False))
    op.alter_column("users", "github_user_id", existing_type=sa.BigInteger(), nullable=True)
    op.alter_column("users", "github_handle", existing_type=sa.String(length=255), nullable=True)
    op.create_index("idx_users_role", "users", ["role"])

    # 1. projects
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("repository_url", sa.String(length=500), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_projects_owner_id", "projects", ["owner_id"])
    op.create_index("idx_projects_name", "projects", ["name"])

    # 2. scans
    op.create_table(
        "scans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="pending", nullable=False),
        sa.Column("commit_sha", sa.String(length=40), nullable=True),
        sa.Column("branch", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'running', 'completed', 'failed')", name="ck_scan_status"),
    )
    op.create_index("idx_scans_project_id", "scans", ["project_id"])
    op.create_index("idx_scans_status", "scans", ["status"])

    # 3. findings
    op.create_table(
        "findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_id", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("file_path", sa.String(length=1000), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("code_snippet", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("severity IN ('critical', 'high', 'medium', 'low', 'info')", name="ck_finding_severity"),
    )
    op.create_index("idx_scan_findings_scan_id", "findings", ["scan_id"])
    op.create_index("idx_scan_findings_project_id", "findings", ["project_id"])
    op.create_index("idx_scan_findings_severity", "findings", ["severity"])
    op.create_index("idx_scan_findings_rule_id", "findings", ["rule_id"])


def downgrade() -> None:
    op.drop_index("idx_scan_findings_rule_id", table_name="findings")
    op.drop_index("idx_scan_findings_severity", table_name="findings")
    op.drop_index("idx_scan_findings_project_id", table_name="findings")
    op.drop_index("idx_scan_findings_scan_id", table_name="findings")
    op.drop_table("findings")

    op.drop_index("idx_scans_status", table_name="scans")
    op.drop_index("idx_scans_project_id", table_name="scans")
    op.drop_table("scans")

    op.drop_index("idx_projects_name", table_name="projects")
    op.drop_index("idx_projects_owner_id", table_name="projects")
    op.drop_table("projects")

    op.drop_index("idx_users_role", table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "hashed_password")
    op.drop_column("users", "name")
