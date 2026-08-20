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
    }
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables)
    assert len(registered_tables) == 13


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
