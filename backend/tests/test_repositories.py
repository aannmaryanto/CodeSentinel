import uuid
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.github_service import GitHubService, GitHubNotFoundError, GitHubAPIError
from app.api.v1.repositories import get_github_service


def get_auth_token(client: TestClient, email: str = "repo_dev@codesentinel.io") -> str:
    """Helper function to register a test user and obtain a JWT access token."""
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Repo Test Developer",
            "email": email,
            "password": "Password123!",
        },
    )
    return reg_res.json()["access_token"]


@pytest.fixture
def mock_github_service() -> AsyncMock:
    """Fixture to override get_github_service dependency with a mock."""
    mock_service = AsyncMock(spec=GitHubService)
    mock_service.get_repository_installation.return_value = {
        "id": 68500224,
        "target_type": "User",
        "account": {"login": "aannmaryanto"},
    }
    mock_service.get_installation_access_token.return_value = {
        "token": "ghs_mock_token_12345",
        "expires_at": "2026-12-31T23:59:59Z",
    }
    mock_service.get_repository.return_value = {
        "id": 987654321,
        "name": "CodeSentinel",
        "full_name": "aannmaryanto/CodeSentinel",
        "default_branch": "main",
        "private": True,
        "archived": False,
        "owner": {"login": "aannmaryanto"},
    }

    # Dummy repository zip file content
    import io, zipfile
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("repo-main/main.py", "print('hello world')\n")
    mock_service.download_repository_archive.return_value = zip_buf.getvalue()

    app.dependency_overrides[get_github_service] = lambda: mock_service
    yield mock_service
    app.dependency_overrides.pop(get_github_service, None)




def test_unauthorized_access(client: TestClient):
    response = client.get("/api/v1/repositories")
    assert response.status_code == 401

    response_post = client.post("/api/v1/repositories", json={"full_name": "aannmaryanto/CodeSentinel"})
    assert response_post.status_code == 401


def test_connect_repository_success(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "connect_success@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "full_name": "aannmaryanto/CodeSentinel",
        "installation_id": 12345678,
        "default_branch": "main",
        "is_private": True,
    }
    response = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert response.status_code == 201

    data = response.json()
    assert data["full_name"] == "aannmaryanto/CodeSentinel"
    assert data["name"] == "CodeSentinel"
    assert data["owner_handle"] == "aannmaryanto"
    assert data["github_repo_id"] == 987654321
    assert "id" in data
    assert "organization_id" in data


def test_duplicate_repository_handling(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "duplicate_repo@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"full_name": "aannmaryanto/CodeSentinel"}
    resp1 = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert resp1.status_code == 201

    # Second connect attempt for same repository
    resp2 = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert resp2.status_code == 409
    assert "already connected" in resp2.json()["detail"]


def test_list_user_repositories(client: TestClient, mock_github_service: AsyncMock):
    async def mock_get_repo(token, owner, repo):
        import zlib
        return {
            "id": zlib.crc32(f"{owner}/{repo}".encode("utf-8")),
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "default_branch": "main",
            "private": True,
            "archived": False,
            "owner": {"login": owner},
        }
    mock_github_service.get_repository.side_effect = mock_get_repo

    token = get_auth_token(client, "list_repos@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        # Connect two repositories
        client.post("/api/v1/repositories", json={"full_name": "aannmaryanto/repo-one"}, headers=headers)
        client.post("/api/v1/repositories", json={"full_name": "aannmaryanto/repo-two"}, headers=headers)

        response = client.get("/api/v1/repositories", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
    finally:
        mock_github_service.get_repository.side_effect = None


def test_get_repository_details_success_and_forbidden(
    client: TestClient,
    mock_github_service: AsyncMock,
):
    token1 = get_auth_token(client, "owner_repo@codesentinel.io")
    headers1 = {"Authorization": f"Bearer {token1}"}

    token2 = get_auth_token(client, "other_user_repo@codesentinel.io")
    headers2 = {"Authorization": f"Bearer {token2}"}

    resp_create = client.post(
        "/api/v1/repositories",
        json={"full_name": "aannmaryanto/private-repo"},
        headers=headers1,
    )
    assert resp_create.status_code == 201
    repo_id = resp_create.json()["id"]

    # Retrieve as authorized owner
    resp_get = client.get(f"/api/v1/repositories/{repo_id}", headers=headers1)
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == repo_id

    # Retrieve as unauthorized second user -> 403 Forbidden
    resp_unauth = client.get(f"/api/v1/repositories/{repo_id}", headers=headers2)
    assert resp_unauth.status_code == 403
    assert "permission" in resp_unauth.json()["detail"].lower()


def test_get_repository_not_found(client: TestClient):
    token = get_auth_token(client, "not_found_repo@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/repositories/{random_id}", headers=headers)
    assert response.status_code == 404


def test_sync_repository_success(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "sync_repo@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    resp_create = client.post(
        "/api/v1/repositories",
        json={"full_name": "aannmaryanto/CodeSentinel"},
        headers=headers,
    )
    assert resp_create.status_code == 201
    repo_id = resp_create.json()["id"]

    # Mock updated metadata on GitHub
    mock_github_service.get_repository.return_value = {
        "id": 987654321,
        "name": "CodeSentinel",
        "full_name": "aannmaryanto/CodeSentinel",
        "default_branch": "develop",
        "private": True,
        "archived": False,
        "owner": {"login": "aannmaryanto"},
    }

    resp_sync = client.post(f"/api/v1/repositories/{repo_id}/sync", headers=headers)
    assert resp_sync.status_code == 200
    assert resp_sync.json()["default_branch"] == "develop"


def test_github_api_error_handling(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "gh_error_repo@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate GitHub 404 Not Found error during connection
    mock_github_service.get_repository.side_effect = GitHubNotFoundError("Repository not found on GitHub", status_code=404)

    payload = {"full_name": "aannmaryanto/nonexistent-repo"}
    response = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_inactive_installation_status_handling(client: TestClient, mock_github_service: AsyncMock):
    from tests.conftest import TestingSessionLocal
    from app.models.github import GitHubInstallation
    from sqlalchemy import update
    import asyncio

    mock_github_service.get_repository_installation.return_value = {
        "id": 999111,
        "target_type": "User",
        "account": {"login": "aannmaryanto"},
    }

    token = get_auth_token(client, "inactive_inst@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    # First create a successful repository connection to initialize user org & installation
    payload = {"full_name": "aannmaryanto/active-repo", "installation_id": 999111}
    resp1 = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert resp1.status_code == 201
    repo_id = resp1.json()["id"]

    # Manually update the installation status to 'suspended' in DB
    async def suspend_installation():
        async with TestingSessionLocal() as session:
            await session.execute(
                update(GitHubInstallation)
                .where(GitHubInstallation.github_installation_id == 999111)
                .values(status="suspended")
            )
            await session.commit()

    asyncio.run(suspend_installation())

    # Connecting a new repo using the suspended installation should fail with 400
    payload_new = {"full_name": "aannmaryanto/new-repo", "installation_id": 999111}
    resp_conn = client.post("/api/v1/repositories", json=payload_new, headers=headers)
    assert resp_conn.status_code == 400
    assert "not active" in resp_conn.json()["detail"].lower()

    # Syncing the repo associated with the suspended installation should fail with 400
    resp_sync = client.post(f"/api/v1/repositories/{repo_id}/sync", headers=headers)
    assert resp_sync.status_code == 400
    assert "not active" in resp_sync.json()["detail"].lower()


def test_connect_repository_app_not_installed(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "app_not_installed@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate GitHub App not installed on the repository (GET /repos/owner/repo/installation -> 404)
    mock_github_service.get_repository_installation.side_effect = GitHubNotFoundError(
        "Installation not found for repository", status_code=404
    )

    try:
        payload = {"full_name": "aannmaryanto/uninstalled-repo"}
        response = client.post("/api/v1/repositories", json=payload, headers=headers)
        assert response.status_code == 404
        assert "not installed" in response.json()["detail"].lower()
    finally:
        mock_github_service.get_repository_installation.side_effect = None


def test_scan_repository_success(client: TestClient, mock_github_service: AsyncMock):
    async def mock_get_repo(token, owner, repo):
        import zlib
        return {
            "id": zlib.crc32(f"{owner}/{repo}".encode("utf-8")),
            "name": repo,
            "full_name": f"{owner}/{repo}",
            "default_branch": "main",
            "private": True,
            "archived": False,
            "owner": {"login": owner},
        }
    mock_github_service.get_repository.side_effect = mock_get_repo

    token = get_auth_token(client, "scan_repo_user@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        payload = {"full_name": "aannmaryanto/scan-test-repo", "installation_id": 999333}
        connect_resp = client.post("/api/v1/repositories", json=payload, headers=headers)
        assert connect_resp.status_code == 201
        repo_id = connect_resp.json()["id"]

        scan_resp = client.post(f"/api/v1/repositories/{repo_id}/scan", headers=headers)
        assert scan_resp.status_code == 200
        assert scan_resp.json()["id"] == repo_id
        assert scan_resp.json()["full_name"] == "aannmaryanto/scan-test-repo"
    finally:
        mock_github_service.get_repository.side_effect = None



def test_scan_repository_creates_findings_in_db(client: TestClient, mock_github_service: AsyncMock):
    import io, zipfile, asyncio
    from tests.conftest import TestingSessionLocal
    from app.models.scans import Scan
    from app.models.findings import Finding
    from sqlalchemy.future import select

    # Mock download_repository_archive to return a zip with a vulnerable python file
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("test-repo-main/vulnerable.py", "eval('1 + 1')\npassword = 'SuperSecretPass123!'\n")
    mock_github_service.download_repository_archive.return_value = zip_buf.getvalue()

    token = get_auth_token(client, "repo_scan_db@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"full_name": "aannmaryanto/vulnerable-repo", "installation_id": 999555}
    connect_resp = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert connect_resp.status_code == 201
    repo_id = connect_resp.json()["id"]

    scan_resp = client.post(f"/api/v1/repositories/{repo_id}/scan", headers=headers)
    assert scan_resp.status_code == 200

    # Query DB to ensure Scan record is completed and Findings were persisted
    async def verify_db_records():
        async with TestingSessionLocal() as session:
            scan_res = await session.execute(select(Scan).order_by(Scan.created_at.desc()))
            scans = list(scan_res.scalars().all())
            assert len(scans) >= 1
            latest_scan = scans[0]
            assert latest_scan.status == "completed"

            finding_res = await session.execute(
                select(Finding).where(Finding.scan_id == latest_scan.id)
            )
            findings = list(finding_res.scalars().all())
            assert len(findings) >= 1

    asyncio.run(verify_db_records())


def test_scan_repository_path_traversal_prevention(client: TestClient, mock_github_service: AsyncMock):
    import io, zipfile

    # Create malicious ZIP attempting path traversal
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("../../../etc/passwd", "root:x:0:0:root:/root:/bin/bash\n")
    mock_github_service.download_repository_archive.return_value = zip_buf.getvalue()

    token = get_auth_token(client, "path_trav_user@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"full_name": "aannmaryanto/malicious-repo", "installation_id": 999777}
    connect_resp = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert connect_resp.status_code == 201
    repo_id = connect_resp.json()["id"]

    scan_resp = client.post(f"/api/v1/repositories/{repo_id}/scan", headers=headers)
    assert scan_resp.status_code == 400
    assert "path traversal" in scan_resp.json()["detail"].lower()


def test_scan_repository_download_failure(client: TestClient, mock_github_service: AsyncMock):
    token = get_auth_token(client, "download_fail_user@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"full_name": "aannmaryanto/fail-download-repo", "installation_id": 999888}
    connect_resp = client.post("/api/v1/repositories", json=payload, headers=headers)
    assert connect_resp.status_code == 201
    repo_id = connect_resp.json()["id"]

    mock_github_service.download_repository_archive.side_effect = GitHubNotFoundError(
        "Archive not found on GitHub", status_code=404
    )

    try:
        scan_resp = client.post(f"/api/v1/repositories/{repo_id}/scan", headers=headers)
        assert scan_resp.status_code == 404
        assert "download" in scan_resp.json()["detail"].lower() or "not found" in scan_resp.json()["detail"].lower()
    finally:
        mock_github_service.download_repository_archive.side_effect = None



