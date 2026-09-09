import uuid
from fastapi.testclient import TestClient


def get_auth_token(client: TestClient, email: str = "projectuser@codesentinel.io") -> str:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Project Owner",
            "email": email,
            "password": "Password123!",
        },
    )
    return reg_res.json()["access_token"]


def test_authenticated_user_create_project(client: TestClient):
    token = get_auth_token(client, "create_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/projects",
        headers=headers,
        json={
            "name": "CodeSentinel Core",
            "description": "AI Security Analysis Engine",
            "repository_url": "https://github.com/aannmaryanto/CodeSentinel",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "CodeSentinel Core"
    assert data["description"] == "AI Security Analysis Engine"
    assert data["repository_url"] == "https://github.com/aannmaryanto/CodeSentinel"
    assert "id" in data
    assert "owner_id" in data


def test_unauthenticated_user_create_project(client: TestClient):
    response = client.post(
        "/api/projects",
        json={
            "name": "Unauthorized Project",
        },
    )
    assert response.status_code == 401
    assert "Authentication token required" in response.json()["detail"]


def test_get_user_projects(client: TestClient):
    token = get_auth_token(client, "list_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    # Create 2 projects
    client.post("/api/projects", headers=headers, json={"name": "Project Alpha"})
    client.post("/api/projects", headers=headers, json={"name": "Project Beta"})

    # Fetch all user projects
    response = client.get("/api/projects", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    names = {p["name"] for p in data}
    assert names == {"Project Alpha", "Project Beta"}


def test_get_single_project(client: TestClient):
    token = get_auth_token(client, "single_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/projects",
        headers=headers,
        json={"name": "Single Project", "description": "Details test"},
    )
    project_id = create_res.json()["id"]

    response = client.get(f"/api/projects/{project_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Single Project"


def test_update_own_project(client: TestClient):
    token = get_auth_token(client, "update_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/projects",
        headers=headers,
        json={"name": "Original Name", "description": "Original Description"},
    )
    project_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"name": "Updated Name", "description": "Updated Description"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated Description"


def test_delete_own_project(client: TestClient):
    token = get_auth_token(client, "delete_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/projects",
        headers=headers,
        json={"name": "Project to Delete"},
    )
    project_id = create_res.json()["id"]

    del_res = client.delete(f"/api/projects/{project_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify project no longer exists
    get_res = client.get(f"/api/projects/{project_id}", headers=headers)
    assert get_res.status_code == 404


def test_access_another_user_project(client: TestClient):
    token1 = get_auth_token(client, "user1_access@codesentinel.io")
    token2 = get_auth_token(client, "user2_access@codesentinel.io")

    # User 1 creates project
    create_res = client.post(
        "/api/projects",
        headers={"Authorization": f"Bearer {token1}"},
        json={"name": "User 1 Confidential Project"},
    )
    project_id = create_res.json()["id"]

    # User 2 attempts to view User 1's project
    res = client.get(
        f"/api/projects/{project_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


def test_update_another_user_project(client: TestClient):
    token1 = get_auth_token(client, "user1_update@codesentinel.io")
    token2 = get_auth_token(client, "user2_update@codesentinel.io")

    create_res = client.post(
        "/api/projects",
        headers={"Authorization": f"Bearer {token1}"},
        json={"name": "User 1 Project"},
    )
    project_id = create_res.json()["id"]

    # User 2 attempts to update User 1's project
    res = client.put(
        f"/api/projects/{project_id}",
        headers={"Authorization": f"Bearer {token2}"},
        json={"name": "Hacked Name"},
    )
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


def test_delete_another_user_project(client: TestClient):
    token1 = get_auth_token(client, "user1_del@codesentinel.io")
    token2 = get_auth_token(client, "user2_del@codesentinel.io")

    create_res = client.post(
        "/api/projects",
        headers={"Authorization": f"Bearer {token1}"},
        json={"name": "User 1 Project for Deletion"},
    )
    project_id = create_res.json()["id"]

    # User 2 attempts to delete User 1's project
    res = client.delete(
        f"/api/projects/{project_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


def test_invalid_project_data(client: TestClient):
    token = get_auth_token(client, "invalid_data@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}

    # Blank/whitespace project name
    response = client.post(
        "/api/projects",
        headers=headers,
        json={"name": "   "},
    )
    assert response.status_code == 422


def test_nonexistent_project(client: TestClient):
    token = get_auth_token(client, "nonexistent_proj@codesentinel.io")
    headers = {"Authorization": f"Bearer {token}"}
    fake_id = uuid.uuid4()

    response = client.get(f"/api/projects/{fake_id}", headers=headers)
    assert response.status_code == 404
    assert "Project not found" in response.json()["detail"]
