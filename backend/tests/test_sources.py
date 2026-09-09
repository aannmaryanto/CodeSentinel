import io
import os
import uuid
import zipfile
import shutil
from fastapi.testclient import TestClient


def get_auth_headers(client: TestClient, email: str = "source_user@codesentinel.io") -> dict:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Source User",
            "email": email,
            "password": "Password123!",
        },
    )
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_sample_zip(files: dict = None) -> bytes:
    if files is None:
        files = {
            "main.py": "print('Hello CodeSentinel')\n",
            "utils/helpers.py": "def add(a, b):\n    return a + b\n",
        }
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path, content in files.items():
            zf.writestr(file_path, content)
    return zip_buffer.getvalue()


def test_successful_source_submission(client: TestClient):
    headers = get_auth_headers(client, "succ_source@codesentinel.io")

    # Create project
    proj_res = client.post("/api/projects", headers=headers, json={"name": "Source Test Project"})
    project_id = proj_res.json()["id"]

    # Upload zip archive
    zip_bytes = create_sample_zip()
    files = {"file": ("source.zip", zip_bytes, "application/zip")}

    res = client.post(f"/api/projects/{project_id}/source", headers=headers, files=files)
    assert res.status_code == 201
    data = res.json()
    assert data["project_id"] == project_id
    assert data["file_name"] == "source.zip"
    assert data["file_count"] == 2
    assert data["status"] == "ready"
    assert "checksum_sha256" in data
    assert "storage_path" in data

    # Verify extracted directory exists
    extracted_path = os.path.join(data["storage_path"], "extracted")
    assert os.path.isdir(extracted_path)
    assert os.path.isfile(os.path.join(extracted_path, "main.py"))

    # Clean up storage folder after test
    shutil.rmtree(data["storage_path"], ignore_errors=True)


def test_unauthenticated_source_submission(client: TestClient):
    zip_bytes = create_sample_zip()
    files = {"file": ("source.zip", zip_bytes, "application/zip")}
    fake_id = uuid.uuid4()

    res = client.post(f"/api/projects/{fake_id}/source", files=files)
    assert res.status_code == 401
    assert "Authentication token required" in res.json()["detail"]


def test_submission_another_user_project(client: TestClient):
    headers1 = get_auth_headers(client, "user1_src@codesentinel.io")
    headers2 = get_auth_headers(client, "user2_src@codesentinel.io")

    # User 1 creates project
    proj_res = client.post("/api/projects", headers=headers1, json={"name": "User 1 Project"})
    project_id = proj_res.json()["id"]

    # User 2 attempts upload to User 1's project
    zip_bytes = create_sample_zip()
    files = {"file": ("source.zip", zip_bytes, "application/zip")}

    res = client.post(f"/api/projects/{project_id}/source", headers=headers2, files=files)
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


def test_invalid_file_type(client: TestClient):
    headers = get_auth_headers(client, "invalid_type@codesentinel.io")
    proj_res = client.post("/api/projects", headers=headers, json={"name": "Invalid Type Project"})
    project_id = proj_res.json()["id"]

    # Upload invalid .exe file
    files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}

    res = client.post(f"/api/projects/{project_id}/source", headers=headers, files=files)
    assert res.status_code == 400
    assert "Unsupported file type" in res.json()["detail"]


def test_oversized_source(client: TestClient):
    headers = get_auth_headers(client, "oversized@codesentinel.io")
    proj_res = client.post("/api/projects", headers=headers, json={"name": "Oversized Project"})
    project_id = proj_res.json()["id"]

    # Create 26MB dummy payload (exceeding 25MB limit)
    large_payload = b"A" * (26 * 1024 * 1024)
    files = {"file": ("large_source.zip", large_payload, "application/zip")}

    res = client.post(f"/api/projects/{project_id}/source", headers=headers, files=files)
    assert res.status_code == 400
    assert "exceeds maximum limit" in res.json()["detail"]


def test_malicious_path_traversal_filename(client: TestClient):
    headers = get_auth_headers(client, "traversal@codesentinel.io")
    proj_res = client.post("/api/projects", headers=headers, json={"name": "Traversal Test Project"})
    project_id = proj_res.json()["id"]

    # Create zip with path traversal entry
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("../../hacked.txt", "malicious payload")
    malicious_zip = zip_buffer.getvalue()

    files = {"file": ("traversal.zip", malicious_zip, "application/zip")}

    res = client.post(f"/api/projects/{project_id}/source", headers=headers, files=files)
    assert res.status_code == 400
    assert "Path traversal" in res.json()["detail"] or "Malicious" in res.json()["detail"]


def test_invalid_project(client: TestClient):
    headers = get_auth_headers(client, "invalid_proj@codesentinel.io")
    fake_id = uuid.uuid4()

    zip_bytes = create_sample_zip()
    files = {"file": ("source.zip", zip_bytes, "application/zip")}

    res = client.post(f"/api/projects/{fake_id}/source", headers=headers, files=files)
    assert res.status_code == 404
    assert "Project not found" in res.json()["detail"]


def test_source_metadata_retrieval(client: TestClient):
    headers = get_auth_headers(client, "get_source@codesentinel.io")
    proj_res = client.post("/api/projects", headers=headers, json={"name": "Metadata Test Project"})
    project_id = proj_res.json()["id"]

    # Before submission, get source returns 404
    res_before = client.get(f"/api/projects/{project_id}/source", headers=headers)
    assert res_before.status_code == 404

    # Upload source
    zip_bytes = create_sample_zip()
    files = {"file": ("source.zip", zip_bytes, "application/zip")}
    client.post(f"/api/projects/{project_id}/source", headers=headers, files=files)

    # Get source metadata
    res_after = client.get(f"/api/projects/{project_id}/source", headers=headers)
    assert res_after.status_code == 200
    data = res_after.json()
    assert data["project_id"] == project_id
    assert data["file_name"] == "source.zip"
    assert data["status"] == "ready"

    # Cleanup storage
    shutil.rmtree(data["storage_path"], ignore_errors=True)
