from fastapi.testclient import TestClient
from src.app import app


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_delete_flow():
    activity = "Programming Class"
    email = "tester@example.com"

    # Ensure email not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Now the participant should appear
    resp = client.get("/activities")
    assert email in resp.json()[activity]["participants"]

    # Duplicate signup should fail
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 400

    # Remove the signup
    resp = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")

    # Now participant should be gone
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]


def test_signup_activity_not_found():
    resp = client.post("/activities/DoesNotExist/signup", params={"email": "x@x.com"})
    assert resp.status_code == 404
