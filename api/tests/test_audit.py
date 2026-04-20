from types import SimpleNamespace

from app import audit


def test_audit_create_sets_shared_timestamp_and_actor(monkeypatch):
    monkeypatch.setattr(audit.time, "time", lambda: 123.456)
    auth = SimpleNamespace(userId="user-1", displayName="Scout User", email="scout@example.com")

    result = audit.audit_create(auth)

    assert result == {
        "createdAt": 123456,
        "createdBy": {
            "userId": "user-1",
            "displayName": "Scout User",
            "email": "scout@example.com",
        },
        "updatedAt": 123456,
        "updatedBy": {
            "userId": "user-1",
            "displayName": "Scout User",
            "email": "scout@example.com",
        },
    }


def test_audit_update_sets_updated_timestamp_and_actor(monkeypatch):
    monkeypatch.setattr(audit.time, "time", lambda: 987.654)
    auth = SimpleNamespace(userId="user-2", displayName="Leader User", email="leader@example.com")

    result = audit.audit_update(auth)

    assert result == {
        "updatedAt": 987654,
        "updatedBy": {
            "userId": "user-2",
            "displayName": "Leader User",
            "email": "leader@example.com",
        },
    }
