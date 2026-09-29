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
