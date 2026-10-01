import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import httpx

from app.services.github_service import (
    GitHubService,
    GitHubAuthenticationError,
    GitHubPermissionError,
    GitHubNotFoundError,
    GitHubAPIError,
)


@pytest.fixture(scope="module")
def rsa_private_key_pem() -> str:
    """Generates a valid temporary RSA private key in PEM format for unit tests."""
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem.decode("utf-8")


@pytest.fixture
def github_service(rsa_private_key_pem: str) -> GitHubService:
    """Initializes GitHubService with mock App ID and valid RSA key."""
    return GitHubService(
        app_id="123456",
        private_key=rsa_private_key_pem,
        base_url="https://api.github.test",
        timeout=5.0,
    )


def test_jwt_generation_success(github_service: GitHubService, rsa_private_key_pem: str):
    token = github_service.generate_app_jwt()
    assert isinstance(token, str)
    assert len(token) > 20

    # Decode and verify token header & payload claims
    unverified_header = jwt.get_unverified_header(token)
    assert unverified_header["alg"] == "RS256"

    # Verify signature with public key derived from private key
    key_object = serialization.load_pem_private_key(
        rsa_private_key_pem.encode("utf-8"),
        password=None,
    )
    public_key = key_object.public_key()
    decoded = jwt.decode(token, public_key, algorithms=["RS256"])

    assert decoded["iss"] == "123456"
    assert "iat" in decoded
    assert "exp" in decoded
    assert decoded["exp"] > decoded["iat"]
    assert decoded["exp"] - decoded["iat"] <= 600


def test_jwt_generation_with_client_id(rsa_private_key_pem: str):
    service = GitHubService(
        app_id="5136469",
        client_id="Iv23ctjEwR9PSgeAJk7e",
        private_key=rsa_private_key_pem,
    )
    token = service.generate_app_jwt()
    key_object = serialization.load_pem_private_key(
        rsa_private_key_pem.encode("utf-8"),
        password=None,
    )
    public_key = key_object.public_key()
    decoded = jwt.decode(token, public_key, algorithms=["RS256"])

    assert decoded["iss"] == "Iv23ctjEwR9PSgeAJk7e"


def test_jwt_generation_prefers_client_id_from_settings(monkeypatch, rsa_private_key_pem: str):
    from app.config import settings
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "Iv23ctjEwR9PSgeAJk7e")
    monkeypatch.setattr(settings, "GITHUB_APP_ID", "5136469")
    monkeypatch.setattr(settings, "GITHUB_PRIVATE_KEY", rsa_private_key_pem)

    service = GitHubService()
    token = service.generate_app_jwt()

    key_object = serialization.load_pem_private_key(
        rsa_private_key_pem.encode("utf-8"),
        password=None,
    )
    public_key = key_object.public_key()
    decoded = jwt.decode(token, public_key, algorithms=["RS256"])

    assert decoded["iss"] == "Iv23ctjEwR9PSgeAJk7e"


def test_jwt_generation_missing_credentials():
    service = GitHubService(app_id="", client_id="", private_key="")
    with pytest.raises(GitHubAuthenticationError, match="must be configured"):
        service.generate_app_jwt()


def test_jwt_generation_invalid_private_key():
    service = GitHubService(app_id="123456", private_key="INVALID_PEM_KEY")
    with pytest.raises(GitHubAuthenticationError, match="Failed to generate GitHub App JWT"):
        service.generate_app_jwt()


@pytest.mark.asyncio
async def test_get_repository_installation_success(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/repos/aannmaryanto/CodeSentinel/installation"
        assert request.headers["Accept"] == "application/vnd.github+json"
        assert request.headers["Authorization"].startswith("Bearer ")

        return httpx.Response(
            status_code=200,
            json={
                "id": 68500224,
                "target_type": "User",
                "account": {"login": "aannmaryanto"},
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        inst = await github_service.get_repository_installation(
            owner="aannmaryanto",
            repo="CodeSentinel",
            client=client,
        )

    assert inst["id"] == 68500224
    assert inst["target_type"] == "User"
    assert inst["account"]["login"] == "aannmaryanto"


@pytest.mark.asyncio
async def test_get_installation_access_token(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/app/installations/999888/access_tokens"
        assert request.headers["Accept"] == "application/vnd.github+json"
        assert request.headers["X-GitHub-Api-Version"] == "2022-11-28"
        assert request.headers["Authorization"].startswith("Bearer ")

        return httpx.Response(
            status_code=201,
            json={
                "token": "ghs_mock_access_token_123456789",
                "expires_at": "2026-09-28T16:00:00Z",
                "permissions": {"pull_requests": "write", "contents": "read"},
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await github_service.get_installation_access_token(
            installation_id=999888,
            client=client,
        )

    assert result["token"] == "ghs_mock_access_token_123456789"
    assert result["permissions"]["pull_requests"] == "write"


@pytest.mark.asyncio
async def test_get_installation_repositories(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/installation/repositories"
        assert request.url.params["page"] == "2"
        assert request.url.params["per_page"] == "10"
        assert request.headers["Authorization"] == "Bearer ghs_test_token"

        return httpx.Response(
            status_code=200,
            json={
                "total_count": 1,
                "repositories": [
                    {
                        "id": 101,
                        "name": "CodeSentinel",
                        "full_name": "aannmaryanto/CodeSentinel",
                        "private": True,
                    }
                ],
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await github_service.get_installation_repositories(
            installation_token="ghs_test_token",
            page=2,
            per_page=10,
            client=client,
        )

    assert result["total_count"] == 1
    assert result["repositories"][0]["full_name"] == "aannmaryanto/CodeSentinel"


@pytest.mark.asyncio
async def test_get_repository_metadata(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/repos/aannmaryanto/CodeSentinel"
        assert request.headers["Authorization"] == "Bearer ghs_test_token"

        return httpx.Response(
            status_code=200,
            json={
                "id": 101,
                "name": "CodeSentinel",
                "full_name": "aannmaryanto/CodeSentinel",
                "default_branch": "main",
                "private": True,
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        repo = await github_service.get_repository(
            installation_token="ghs_test_token",
            owner="aannmaryanto",
            repo="CodeSentinel",
            client=client,
        )

    assert repo["id"] == 101
    assert repo["default_branch"] == "main"


@pytest.mark.asyncio
async def test_get_pull_requests(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/repos/aannmaryanto/CodeSentinel/pulls"
        assert request.url.params["state"] == "open"
        assert request.url.params["sort"] == "created"
        assert request.url.params["direction"] == "desc"

        return httpx.Response(
            status_code=200,
            json=[
                {
                    "id": 1001,
                    "number": 42,
                    "title": "Add GitHub API Service Layer",
                    "state": "open",
                    "head": {"sha": "abc1234"},
                    "base": {"sha": "def5678"},
                }
            ],
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        prs = await github_service.get_pull_requests(
            installation_token="ghs_test_token",
            owner="aannmaryanto",
            repo="CodeSentinel",
            state="open",
            client=client,
        )

    assert len(prs) == 1
    assert prs[0]["number"] == 42
    assert prs[0]["head"]["sha"] == "abc1234"


@pytest.mark.asyncio
async def test_get_pull_request_files(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/repos/aannmaryanto/CodeSentinel/pulls/42/files"
        assert request.url.params["page"] == "1"
        assert request.url.params["per_page"] == "100"

        return httpx.Response(
            status_code=200,
            json=[
                {
                    "sha": "file_blob_sha_123",
                    "filename": "backend/app/services/github_service.py",
                    "status": "added",
                    "additions": 150,
                    "deletions": 0,
                    "changes": 150,
                }
            ],
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        files = await github_service.get_pull_request_files(
            installation_token="ghs_test_token",
            owner="aannmaryanto",
            repo="CodeSentinel",
            pull_number=42,
            client=client,
        )

    assert len(files) == 1
    assert files[0]["filename"] == "backend/app/services/github_service.py"
    assert files[0]["status"] == "added"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status_code,expected_exception",
    [
        (401, GitHubAuthenticationError),
        (403, GitHubPermissionError),
        (404, GitHubNotFoundError),
        (500, GitHubAPIError),
    ],
)
async def test_github_error_handling(
    github_service: GitHubService,
    status_code: int,
    expected_exception: type[Exception],
):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=status_code,
            json={"message": f"GitHub returned error {status_code}"},
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(expected_exception) as exc_info:
            await github_service.get_repository(
                installation_token="ghs_test_token",
                owner="aannmaryanto",
                repo="NonExistentRepo",
                client=client,
            )

    assert f"HTTP {status_code}" in str(exc_info.value)


@pytest.mark.asyncio
async def test_github_timeout_handling(github_service: GitHubService):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Connection timed out", request=request)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(GitHubAPIError, match="timed out"):
            await github_service.get_repository(
                installation_token="ghs_test_token",
                owner="aannmaryanto",
                repo="CodeSentinel",
                client=client,
            )


@pytest.mark.asyncio
async def test_download_repository_archive(github_service: GitHubService):
    dummy_zip_content = b"PK\x03\x04mock_zip_content"

    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/repos/aannmaryanto/CodeSentinel/zipball/main"
        assert request.headers["Authorization"] == "Bearer ghs_test_token"
        return httpx.Response(status_code=200, content=dummy_zip_content)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        archive_bytes = await github_service.download_repository_archive(
            installation_token="ghs_test_token",
            owner="aannmaryanto",
            repo="CodeSentinel",
            ref="main",
            client=client,
        )

    assert archive_bytes == dummy_zip_content

