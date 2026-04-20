from __future__ import annotations

import html
import logging
import os

from azure.communication.email import EmailClient
from azure.identity import DefaultAzureCredential
from fastapi import APIRouter, HTTPException

from app.cosmosdb import get_by_id
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import EmailShoppingList

logger = logging.getLogger(__name__)
router = APIRouter()

EVENTS_CONTAINER = "events"
MAX_SUBJECT_EVENT_NAME_LENGTH = 200

_email_client: EmailClient | None = None


def _get_email_client() -> EmailClient:
    global _email_client
    if _email_client is None:
        endpoint = os.environ.get("ACS_ENDPOINT")
        if not endpoint:
            raise RuntimeError("ACS_ENDPOINT is not configured")
        _email_client = EmailClient(f"https://{endpoint}", DefaultAzureCredential())
    return _email_client


@router.post("/events/{event_id}/shopping-list/email", status_code=202)
async def email_shopping_list(event_id: str, body: EmailShoppingList, auth: RequireTroopContext):
    if not check_permission(auth.role, "viewContent"):
        forbidden()

    existing_event = await get_by_id(EVENTS_CONTAINER, event_id, auth.troopId)
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")

    from_email = os.environ.get("ACS_FROM_EMAIL")
    if not from_email:
        raise HTTPException(status_code=500, detail="Email service not configured")

    try:
        client = _get_email_client()
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Email service not configured")

    event_name = existing_event.get("name") or "Unnamed Event"
    safe_event_name = str(event_name).replace("\n", " ").replace("\r", " ")[:MAX_SUBJECT_EVENT_NAME_LENGTH]

    text_rows = "\n".join(f"- {item.name}: {item.quantity} {item.unit}" for item in body.items)
    html_rows = "".join(
        f'<tr><td style="padding:4px 8px;">{html.escape(item.name)}</td>'
        f'<td style="padding:4px 8px;text-align:right;">{html.escape(str(item.quantity))}</td>'
        f'<td style="padding:4px 8px;">{html.escape(item.unit)}</td></tr>'
        for item in body.items
    )

    message = {
        "senderAddress": from_email,
        "recipients": {"to": [{"address": body.recipientEmail}]},
        "content": {
            "subject": f"Shopping List: {safe_event_name}",
            "plainText": f"Shopping list for {safe_event_name}\n\n{text_rows}",
            "html": (
                f"<h2>Shopping list for {html.escape(safe_event_name)}</h2>"
                f'<table style="border-collapse:collapse;">'
                f'<thead><tr><th style="padding:4px 8px;text-align:left;">Item</th>'
                f'<th style="padding:4px 8px;text-align:right;">Quantity</th>'
                f'<th style="padding:4px 8px;text-align:left;">Unit</th></tr></thead>'
                f"<tbody>{html_rows}</tbody></table>"
            ),
        },
    }

    poller = client.begin_send(message)
    result = poller.result()

    if result.get("status") != "Succeeded":
        raise HTTPException(status_code=502, detail="Failed to send email")

    return {"message": "Shopping list email sent"}
