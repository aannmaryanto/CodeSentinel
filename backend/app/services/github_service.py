import time
from typing import Any, Optional
import httpx
import jwt

from app.config import settings


class GitHubException(Exception):
    """Base exception for all GitHub service errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GitHubAuthenticationError(GitHubException):
    """Raised when GitHub App authentication or token generation fails (401)."""

    pass


class GitHubPermissionError(GitHubException):
    """Raised when access is forbidden or rate limits are exceeded (403)."""

    pass


class GitHubNotFoundError(GitHubException):
    """Raised when a requested GitHub resource is not found (404)."""

    pass


class GitHubAPIError(GitHubException):
    """Raised when GitHub API returns an unexpected error status code (4xx/5xx) or network fails."""

    pass


class GitHubService:
    """
    Service layer providing authenticated access to the GitHub REST API
    for GitHub App installations, repositories, and pull requests.
    """

    DEFAULT_BASE_URL = "https://api.github.com"

    def __init__(
        self,
        app_id: Optional[str] = None,
        private_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 10.0,
    ):
        self.app_id = app_id or settings.GITHUB_APP_ID
        self.private_key = private_key or settings.GITHUB_PRIVATE_KEY
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout

    def generate_app_jwt(self) -> str:
        """
        Generates a signed RS256 JWT for GitHub App authentication.
        Expires in 10 minutes.
        """
        if not self.app_id or not self.private_key:
            raise GitHubAuthenticationError(
                "GitHub App ID and Private Key must be configured to generate an App JWT."
            )

        formatted_key = self.private_key.replace("\\n", "\n").strip()
        now = int(time.time())

        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": str(self.app_id),
        }

        try:
            encoded_jwt = jwt.encode(payload, formatted_key, algorithm="RS256")
            if isinstance(encoded_jwt, bytes):
                return encoded_jwt.decode("utf-8")
            return encoded_jwt
        except Exception as exc:
            raise GitHubAuthenticationError(
                "Failed to generate GitHub App JWT. Please check App ID and RSA private key format."
            ) from exc

    async def _request(
        self,
        method: str,
        endpoint: str,
        token: str,
        params: Optional[dict[str, Any]] = None,
        json_body: Optional[dict[str, Any]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Any:
        """
        Helper method to execute authenticated HTTP requests against the GitHub REST API.
        """
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        url = f"{self.base_url}{endpoint}"

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=self.timeout)
            close_client = True

        try:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
            )
            return self._handle_response(response, method=method, endpoint=endpoint)
        except httpx.TimeoutException as exc:
            raise GitHubAPIError(f"GitHub API request timed out: {method} {endpoint}") from exc
        except httpx.RequestError as exc:
            raise GitHubAPIError(f"GitHub API network request failed: {method} {endpoint}") from exc
        finally:
            if close_client:
                await client.aclose()

    def _handle_response(self, response: httpx.Response, method: str, endpoint: str) -> Any:
        """
        Validates GitHub API HTTP responses and converts non-2xx status codes into custom exceptions.
        Scrubs secret payload content from exception messages.
        """
        if response.is_success:
            if response.status_code == 204:
                return None
            try:
                return response.json()
            except ValueError as exc:
                raise GitHubAPIError(
                    f"Invalid JSON returned by GitHub API for {method} {endpoint}",
                    status_code=response.status_code,
                ) from exc

        status = response.status_code
        message = f"GitHub API call failed: {method} {endpoint} (HTTP {status})"

        try:
            err_data = response.json()
            if isinstance(err_data, dict) and "message" in err_data:
                message = f"GitHub API error (HTTP {status}): {err_data['message']}"
        except Exception:
            pass

        if status == 401:
            raise GitHubAuthenticationError(message, status_code=status)
        elif status == 403:
            raise GitHubPermissionError(message, status_code=status)
        elif status == 404:
            raise GitHubNotFoundError(message, status_code=status)
        else:
            raise GitHubAPIError(message, status_code=status)

    async def get_installation_access_token(
        self,
        installation_id: int,
        client: Optional[httpx.AsyncClient] = None,
    ) -> dict[str, Any]:
        """
        Exchanges a GitHub App JWT for a short-lived installation access token.
        POST /app/installations/{installation_id}/access_tokens
        """
        jwt_token = self.generate_app_jwt()
        endpoint = f"/app/installations/{installation_id}/access_tokens"
        return await self._request("POST", endpoint, token=jwt_token, client=client)

    async def get_installation_repositories(
        self,
        installation_token: str,
        page: int = 1,
        per_page: int = 30,
        client: Optional[httpx.AsyncClient] = None,
    ) -> dict[str, Any]:
        """
        Retrieves all repositories accessible to an installation.
        GET /installation/repositories
        """
        endpoint = "/installation/repositories"
        params = {"page": page, "per_page": per_page}
        return await self._request("GET", endpoint, token=installation_token, params=params, client=client)

    async def get_repository(
        self,
        installation_token: str,
        owner: str,
        repo: str,
        client: Optional[httpx.AsyncClient] = None,
    ) -> dict[str, Any]:
        """
        Retrieves metadata for a specific repository.
        GET /repos/{owner}/{repo}
        """
        endpoint = f"/repos/{owner}/{repo}"
        return await self._request("GET", endpoint, token=installation_token, client=client)

    async def get_pull_requests(
        self,
        installation_token: str,
        owner: str,
        repo: str,
        state: str = "open",
        sort: str = "created",
        direction: str = "desc",
        page: int = 1,
        per_page: int = 30,
        client: Optional[httpx.AsyncClient] = None,
    ) -> list[dict[str, Any]]:
        """
        Lists pull requests for a repository.
        GET /repos/{owner}/{repo}/pulls
        """
        endpoint = f"/repos/{owner}/{repo}/pulls"
        params = {
            "state": state,
            "sort": sort,
            "direction": direction,
            "page": page,
            "per_page": per_page,
        }
        return await self._request("GET", endpoint, token=installation_token, params=params, client=client)

    async def get_pull_request_files(
        self,
        installation_token: str,
        owner: str,
        repo: str,
        pull_number: int,
        page: int = 1,
        per_page: int = 100,
        client: Optional[httpx.AsyncClient] = None,
    ) -> list[dict[str, Any]]:
        """
        Retrieves the list of changed files for a pull request.
        GET /repos/{owner}/{repo}/pulls/{pull_number}/files
        """
        endpoint = f"/repos/{owner}/{repo}/pulls/{pull_number}/files"
        params = {"page": page, "per_page": per_page}
        return await self._request("GET", endpoint, token=installation_token, params=params, client=client)
