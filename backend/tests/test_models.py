import uuid
from app.models import (
    Base,
    User,
    Organization,
    OrganizationMember,
    GitHubInstallation,
    Repository,
    PullRequest,
    PullRequestFile,
    ReviewJob,
    Review,
    ReviewFinding,
    ReviewComment,
    AIUsage,
    AuditLog,
    Project,
    Scan,
    Finding,
    ProjectSource,
)


def test_models_metadata_registration():
    expected_tables = {
        "users",
        "organizations",
        "organization_members",
        "github_installations",
        "repositories",
        "pull_requests",
        "pull_request_files",
        "review_jobs",
        "reviews",
        "review_findings",
        "review_comments",
        "ai_usage",
        "audit_logs",
        "projects",
        "scans",
        "findings",
        "project_sources",
    }
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables)
    assert len(registered_tables) == 17


def test_individual_model_tablename():
    assert User.__tablename__ == "users"
    assert Organization.__tablename__ == "organizations"
    assert OrganizationMember.__tablename__ == "organization_members"
    assert GitHubInstallation.__tablename__ == "github_installations"
    assert Repository.__tablename__ == "repositories"
    assert PullRequest.__tablename__ == "pull_requests"
    assert PullRequestFile.__tablename__ == "pull_request_files"
    assert ReviewJob.__tablename__ == "review_jobs"
    assert Review.__tablename__ == "reviews"
    assert ReviewFinding.__tablename__ == "review_findings"
    assert ReviewComment.__tablename__ == "review_comments"
    assert AIUsage.__tablename__ == "ai_usage"
    assert AuditLog.__tablename__ == "audit_logs"
    assert Project.__tablename__ == "projects"
    assert Scan.__tablename__ == "scans"
    assert Finding.__tablename__ == "findings"
    assert ProjectSource.__tablename__ == "project_sources"


def test_user_model_fields():
    user = User(
        name="Test User",
        email="test@codesentinel.io",
        hashed_password="secret_hash",
        role="developer",
    )
    assert user.name == "Test User"
    assert user.email == "test@codesentinel.io"
    assert user.hashed_password == "secret_hash"
    assert user.role == "developer"


def test_project_model_fields():
    owner_id = uuid.uuid4()
    project = Project(
        name="CodeSentinel Backend",
        description="AI Security Analysis Engine",
        repository_url="https://github.com/aannmaryanto/CodeSentinel",
        owner_id=owner_id,
    )
    assert project.name == "CodeSentinel Backend"
    assert project.description == "AI Security Analysis Engine"
    assert project.repository_url == "https://github.com/aannmaryanto/CodeSentinel"
    assert project.owner_id == owner_id


def test_scan_model_fields():
    project_id = uuid.uuid4()
    scan = Scan(
        project_id=project_id,
        status="pending",
        commit_sha="a1b2c3d4e5f6",
        branch="main",
    )
    assert scan.project_id == project_id
    assert scan.status == "pending"
    assert scan.commit_sha == "a1b2c3d4e5f6"
    assert scan.branch == "main"


def test_finding_model_fields():
    scan_id = uuid.uuid4()
    project_id = uuid.uuid4()
    finding = Finding(
        scan_id=scan_id,
        project_id=project_id,
        rule_id="SEC-001",
        title="SQL Injection Vulnerability",
        description="Potential SQL injection detected in raw query",
        severity="critical",
        category="security",
        file_path="app/database.py",
        line_number=42,
        code_snippet="db.execute(f'SELECT * FROM users WHERE id={user_id}')",
        recommendation="Use parameterized queries",
    )
    assert finding.scan_id == scan_id
    assert finding.project_id == project_id
    assert finding.rule_id == "SEC-001"
    assert finding.title == "SQL Injection Vulnerability"
    assert finding.severity == "critical"
    assert finding.category == "security"
    assert finding.line_number == 42


def test_project_source_model_fields():
    project_id = uuid.uuid4()
    source = ProjectSource(
        project_id=project_id,
        source_type="archive",
        file_name="app_v1.zip",
        file_size_bytes=1024,
        checksum_sha256="abc123hash",
        storage_path="/tmp/storage/sources/123",
        file_count=5,
        uncompressed_size_bytes=5000,
        status="ready",
    )
    assert source.project_id == project_id
    assert source.source_type == "archive"
    assert source.file_name == "app_v1.zip"
    assert source.file_count == 5
    assert source.status == "ready"
