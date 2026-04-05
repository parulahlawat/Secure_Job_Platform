
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Dummy JWT for testing (replace with real token logic in production)
DUMMY_JWT = "Bearer testtoken"

def auth_headers():
    return {"Authorization": DUMMY_JWT}

def test_send_connection_request(monkeypatch):
    # Patch get_current_user to return a dummy user
    from app.modules.auth import routes as auth_routes
    monkeypatch.setattr(auth_routes, "get_current_user", lambda: type("User", (), {"id": 1})())
    # Patch DB session and models as needed for isolated test
    response = client.post("/api/v1/connections/request", json={"receiver_id": 2}, headers=auth_headers())
    assert response.status_code in (200, 400)  # 400 if already sent, 200 if new

def test_respond_connection_request(monkeypatch):
    from app.modules.auth import routes as auth_routes
    monkeypatch.setattr(auth_routes, "get_current_user", lambda: type("User", (), {"id": 2})())
    # Patch DB session and models as needed for isolated test
    response = client.post("/api/v1/connections/respond", json={"connection_id": 1, "accept": True}, headers=auth_headers())
    assert response.status_code in (200, 404)  # 404 if not found, 200 if found

def test_get_my_connections(monkeypatch):
    from app.modules.auth import routes as auth_routes
    monkeypatch.setattr(auth_routes, "get_current_user", lambda: type("User", (), {"id": 1})())
    response = client.get("/api/v1/connections/my", headers=auth_headers())
    assert response.status_code == 200
    assert isinstance(response.json(), list)
