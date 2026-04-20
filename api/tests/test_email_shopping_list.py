from types import SimpleNamespace
from unittest.mock import AsyncMock
from unittest.mock import Mock

import pytest

from app.routers import email_shopping_list as router
from app.schemas import EmailShoppingList


class _SucceededPoller:
    def result(self):
        return {"status": "Succeeded"}


class _FakeEmailClient:
    def __init__(self):
        self.sent_message = None

    def begin_send(self, message):
        self.sent_message = message
        return _SucceededPoller()


@pytest.mark.asyncio
async def test_email_subject_sanitizes_crlf_event_name(monkeypatch):
    monkeypatch.setenv("ACS_FROM_EMAIL", "from@example.com")
    monkeypatch.setattr(
        router,
        "get_by_id",
        AsyncMock(return_value={"id": "event-1", "troopId": "troop-1", "name": "Camp\r\nBCC:evil@example.com"}),
    )

    fake_client = _FakeEmailClient()
    monkeypatch.setattr(router, "_get_email_client", lambda: fake_client)
    track_custom_event = Mock()
    monkeypatch.setattr(router, "track_custom_event", track_custom_event)

    body = EmailShoppingList(
        recipientEmail="parent@example.com",
        items=[{"name": "Beans", "quantity": 2, "unit": "can"}],
    )
    auth = SimpleNamespace(role="scout", troopId="troop-1")

    response = await router.email_shopping_list("event-1", body, auth)

    assert response == {"message": "Shopping list email sent"}
    assert fake_client.sent_message is not None
    expected_event_name = "Camp  BCC:evil@example.com"
    subject = fake_client.sent_message["content"]["subject"]
    assert subject == f"Shopping List: {expected_event_name}"
    assert "\r" not in subject
    assert "\n" not in subject
    first_plain_text_line = fake_client.sent_message["content"]["plainText"].split("\n", 1)[0]
    assert first_plain_text_line == f"Shopping list for {expected_event_name}"
    track_custom_event.assert_called_once_with("shopping_list_emailed", properties={
        "eventId": "event-1",
        "troopId": "troop-1",
        "recipientDomain": "example.com",
        "itemCount": "1",
    })
