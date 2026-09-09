from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_404_not_found_exception():
    response = client.get("/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
    assert data["error"]["status_code"] == 404
