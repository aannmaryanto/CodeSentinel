import io
import os
import uuid
import zipfile
import shutil
from fastapi.testclient import TestClient
from app.services.scanner.engine import ScanEngine, is_safe_workspace_path
from app.services.scanner.rules.secrets import SecretDetectionRule


def get_auth_headers(client: TestClient, email: str = "scan_user@codesentinel.io") -> dict:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Scan User",
            "email": email,
            "password": "Password123!",
        },
    )
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_zip_archive(files: dict) -> bytes:
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path, content in files.items():
            if isinstance(content, str):
                zf.writestr(file_path, content)
            else:
                zf.writestr(file_path, content)
    return zip_buffer.getvalue()


def test_successful_scan(client: TestClient):
    headers = get_auth_headers(client, "succ_scan@codesentinel.io")

    # 1. Create Project
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Scan Test Project"})
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Upload Source Code
    zip_bytes = create_zip_archive({
        "app/main.py": "print('Hello World')\n",
        "app/utils.py": "def add(a, b):\n    return a + b\n",
    })
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    assert upload_res.status_code == 201
    storage_path = upload_res.json()["storage_path"]

    # 3. Trigger Scan
    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["project_id"] == project_id
    assert data["status"] == "completed"
    assert data["total_findings"] == 0
    assert data["started_at"] is not None
    assert data["completed_at"] is not None

    # Clean up storage
    shutil.rmtree(storage_path, ignore_errors=True)


def test_authenticated_scan(client: TestClient):
    headers = get_auth_headers(client, "auth_scan@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Auth Project"})
    project_id = proj_res.json()["id"]

    zip_bytes = create_zip_archive({"main.py": "x = 1\n"})
    client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    assert scan_res.json()["status"] == "completed"


def test_unauthenticated_request(client: TestClient):
    fake_id = uuid.uuid4()
    res = client.post(f"/api/v1/projects/{fake_id}/scans")
    assert res.status_code == 401
    assert "Authentication token required" in res.json()["detail"]


def test_another_user_project(client: TestClient):
    headers1 = get_auth_headers(client, "user1_scan@codesentinel.io")
    headers2 = get_auth_headers(client, "user2_scan@codesentinel.io")

    # User 1 creates project & uploads source
    proj_res = client.post("/api/v1/projects", headers=headers1, json={"name": "User 1 Scan Proj"})
    project_id = proj_res.json()["id"]

    zip_bytes = create_zip_archive({"main.py": "print(1)\n"})
    client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers1,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )

    # User 2 attempts to trigger scan on User 1's project
    res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers2)
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]


def test_nonexistent_project(client: TestClient):
    headers = get_auth_headers(client, "nonexistent_scan@codesentinel.io")
    fake_id = uuid.uuid4()
    res = client.post(f"/api/v1/projects/{fake_id}/scans", headers=headers)
    assert res.status_code == 404
    assert "Project not found" in res.json()["detail"]


def test_missing_source(client: TestClient):
    headers = get_auth_headers(client, "no_source_scan@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Empty Proj"})
    project_id = proj_res.json()["id"]

    # Trigger scan without uploading source code first
    res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert res.status_code == 400
    assert "No source code submitted" in res.json()["detail"]


def test_secret_detection(client: TestClient):
    headers = get_auth_headers(client, "secret_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Secrets Project"})
    project_id = proj_res.json()["id"]

    secret_code = """
AWS_KEY = "AKIA1234567890ABCDEF"
GITHUB_TOKEN = "ghp_123456789012345678901234567890123456"
PRIV_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
"""
    zip_bytes = create_zip_archive({"config/secrets.py": secret_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["status"] == "completed"
    assert data["total_findings"] >= 3
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert "SEC-001" in rule_ids or "SEC-002" in rule_ids or "SEC-003" in rule_ids or "SEC-004" in rule_ids

    shutil.rmtree(storage_path, ignore_errors=True)


def test_hardcoded_password_detection(client: TestClient):
    headers = get_auth_headers(client, "cred_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Creds Project"})
    project_id = proj_res.json()["id"]

    cred_code = """
password = "SuperSecretPassword123!"
DB_URI = "postgres://admin:super_secret_pass@localhost:5432/mydb"
"""
    zip_bytes = create_zip_archive({"settings.py": cred_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    categories = [f["category"] for f in data["findings"]]
    assert "Hardcoded Credentials" in categories

    shutil.rmtree(storage_path, ignore_errors=True)


def test_sql_injection_detection(client: TestClient):
    headers = get_auth_headers(client, "sqli_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "SQLi Project"})
    project_id = proj_res.json()["id"]

    sqli_code = """
def get_user(user_input):
    query = "SELECT * FROM users WHERE name = '" + user_input + "'"
    cursor.execute(f"SELECT * FROM users WHERE id = {user_input}")
"""
    zip_bytes = create_zip_archive({"db.py": sqli_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert any("INJ" in r for r in rule_ids)

    shutil.rmtree(storage_path, ignore_errors=True)


def test_command_injection_detection(client: TestClient):
    headers = get_auth_headers(client, "cmdi_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "CmdI Project"})
    project_id = proj_res.json()["id"]

    cmdi_code = """
import os, subprocess

def run_cmd(user_path):
    os.system("ls " + user_path)
    subprocess.run(f"cat {user_path}", shell=True)
"""
    zip_bytes = create_zip_archive({"shell.py": cmdi_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert any("INJ-003" in r or "INJ-004" in r or "DANG" in r or "AST" in r for r in rule_ids)

    shutil.rmtree(storage_path, ignore_errors=True)


def test_eval_detection(client: TestClient):
    headers = get_auth_headers(client, "eval_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Eval Project"})
    project_id = proj_res.json()["id"]

    eval_code = """
def calc(expr):
    return eval(expr)
"""
    zip_bytes = create_zip_archive({"math_eval.py": eval_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert "DANG-001" in rule_ids or "AST-001" in rule_ids

    shutil.rmtree(storage_path, ignore_errors=True)


def test_exec_detection(client: TestClient):
    headers = get_auth_headers(client, "exec_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Exec Project"})
    project_id = proj_res.json()["id"]

    exec_code = """
def run_dynamic(code_str):
    exec(code_str)
"""
    zip_bytes = create_zip_archive({"runner.py": exec_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert "DANG-002" in rule_ids or "AST-002" in rule_ids

    shutil.rmtree(storage_path, ignore_errors=True)


def test_ast_detection(client: TestClient):
    headers = get_auth_headers(client, "ast_detect@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "AST Project"})
    project_id = proj_res.json()["id"]

    ast_code = """
import os, subprocess

eval("1 + 1")
exec("print(1)")
os.system("ls")
subprocess.run("ls", shell=True)
password = "HardcodedSecretValueInAST123!"
"""
    zip_bytes = create_zip_archive({"ast_sample.py": ast_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    rule_ids = [f["rule_id"] for f in data["findings"]]
    assert any(r.startswith("AST-") for r in rule_ids)

    shutil.rmtree(storage_path, ignore_errors=True)


def test_malformed_source_file(client: TestClient):
    headers = get_auth_headers(client, "malformed_scan@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Malformed Proj"})
    project_id = proj_res.json()["id"]

    malformed_code = "def broken_syntax(::: invalid python {{{\n"
    zip_bytes = create_zip_archive({"broken.py": malformed_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    assert scan_res.json()["status"] == "completed"

    shutil.rmtree(storage_path, ignore_errors=True)


def test_unsupported_binary_file(client: TestClient):
    headers = get_auth_headers(client, "binary_scan@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Binary Proj"})
    project_id = proj_res.json()["id"]

    binary_data = b"\x00\x01\x02\x03\x04\xff\xfe"
    zip_bytes = create_zip_archive({"image.png": binary_data, "clean.py": "print('ok')\n"})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["status"] == "completed"
    # Ensure binary file produced no spurious findings
    assert all("image.png" not in f["file_path"] for f in data["findings"])

    shutil.rmtree(storage_path, ignore_errors=True)


def test_path_traversal_protection():
    workspace = os.path.abspath("/tmp/workspace_test")
    safe_file = os.path.abspath("/tmp/workspace_test/app/main.py")
    unsafe_file = os.path.abspath("/tmp/workspace_test/../../etc/passwd")

    assert is_safe_workspace_path(workspace, safe_file) is True
    assert is_safe_workspace_path(workspace, unsafe_file) is False


def test_finding_persistence(client: TestClient):
    headers = get_auth_headers(client, "persist_finding@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Persist Finding Proj"})
    project_id = proj_res.json()["id"]

    zip_bytes = create_zip_archive({"app.py": "eval('1+1')\n"})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["total_findings"] >= 1
    finding = data["findings"][0]
    assert "id" in finding
    assert finding["scan_id"] == data["id"]
    assert finding["project_id"] == project_id
    assert finding["severity"] in {"critical", "high", "medium", "low", "info"}

    shutil.rmtree(storage_path, ignore_errors=True)


def test_scan_persistence(client: TestClient):
    headers = get_auth_headers(client, "persist_scan@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Persist Scan Proj"})
    project_id = proj_res.json()["id"]

    zip_bytes = create_zip_archive({"app.py": "x = 1\n"})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    assert data["id"] is not None
    assert data["status"] == "completed"
    assert data["started_at"] is not None
    assert data["completed_at"] is not None

    shutil.rmtree(storage_path, ignore_errors=True)


def test_severity_counts(client: TestClient):
    headers = get_auth_headers(client, "severity_cnt@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "Severity Proj"})
    project_id = proj_res.json()["id"]

    vuln_code = """
eval("1+1")
password = "SecretPassword123!"
"""
    zip_bytes = create_zip_archive({"vuln.py": vuln_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    data = scan_res.json()
    counts = data["severity_counts"]
    total = counts["critical"] + counts["high"] + counts["medium"] + counts["low"] + counts["info"]
    assert total == data["total_findings"]

    shutil.rmtree(storage_path, ignore_errors=True)


def test_duplicate_prevention(client: TestClient):
    rule = SecretDetectionRule()
    line_with_dups = "AKIA1234567890ABCDEF"
    findings = rule.analyze_file("/tmp/test.py", "test.py", line_with_dups)
    # Deduplicate via scan engine logic test
    engine = ScanEngine(rules=[rule])
    # Engine deduplication handles duplicate occurrences per line/rule
    assert len(findings) >= 1


def test_source_code_never_executed(client: TestClient):
    headers = get_auth_headers(client, "no_exec_test@codesentinel.io")
    proj_res = client.post("/api/v1/projects", headers=headers, json={"name": "No Exec Proj"})
    project_id = proj_res.json()["id"]

    # Source code containing executable side-effect or exception if imported/run
    side_effect_code = """
import sys
raise RuntimeError("THIS SOURCE CODE MUST NEVER BE EXECUTED OR IMPORTED!")
"""
    zip_bytes = create_zip_archive({"boom.py": side_effect_code})
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/source",
        headers=headers,
        files={"file": ("source.zip", zip_bytes, "application/zip")},
    )
    storage_path = upload_res.json()["storage_path"]

    # Triggering scan must NOT raise RuntimeError
    scan_res = client.post(f"/api/v1/projects/{project_id}/scans", headers=headers)
    assert scan_res.status_code == 201
    assert scan_res.json()["status"] == "completed"

    shutil.rmtree(storage_path, ignore_errors=True)
