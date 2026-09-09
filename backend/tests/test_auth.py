from fastapi.testclient import TestClient


def test_successful_registration(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jane Developer",
            "email": "jane@codesentinel.io",
            "password": "SecurePassword123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["name"] == "Jane Developer"
    assert data["user"]["email"] == "jane@codesentinel.io"
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]


def test_invalid_registration_data(client: TestClient):
    # Invalid email format
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jane Developer",
            "email": "not-an-email",
            "password": "SecurePassword123!",
        },
    )
    assert response.status_code == 422

    # Password too short (< 6 chars)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jane Developer",
            "email": "jane2@codesentinel.io",
            "password": "123",
        },
    )
    assert response.status_code == 422


def test_duplicate_email_registration(client: TestClient):
    payload = {
        "name": "User One",
        "email": "duplicate@codesentinel.io",
        "password": "Password123!",
    }
    # First registration succeeded
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same email fails
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_successful_login(client: TestClient):
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Login User",
            "email": "login@codesentinel.io",
            "password": "Password123!",
        },
    )

    # Login user
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@codesentinel.io",
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@codesentinel.io"


def test_login_incorrect_password(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Wrong Pass User",
            "email": "wrongpass@codesentinel.io",
            "password": "Password123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "wrongpass@codesentinel.io",
            "password": "WrongPassword!",
        },
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@codesentinel.io",
            "password": "Password123!",
        },
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_protected_endpoint_without_token(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Authentication token required" in response.json()["detail"]


def test_protected_endpoint_with_invalid_token(client: TestClient):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token_str"},
    )
    assert response.status_code == 401
    assert "Invalid or expired" in response.json()["detail"]


def test_protected_endpoint_with_valid_token(client: TestClient):
    # Register user to get valid token
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Auth Me User",
            "email": "me@codesentinel.io",
            "password": "Password123!",
        },
    )
    token = reg_res.json()["access_token"]

    # Call /api/auth/me with valid token
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == "me@codesentinel.io"
    assert user_data["name"] == "Auth Me User"
    assert "password" not in user_data


def test_current_user_endpoint_v1_alias(client: TestClient):
    # Register user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "V1 Alias User",
            "email": "v1alias@codesentinel.io",
            "password": "Password123!",
        },
    )
    token = reg_res.json()["access_token"]

    # Call /api/v1/auth/me with valid token
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "v1alias@codesentinel.io"
