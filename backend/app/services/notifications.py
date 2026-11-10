"""Notification provider abstraction. Phase 3 uses in-app + mock channel."""

from __future__ import annotations

import json
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Notification


class NotificationProvider:
    async def send(
        self,
        *,
        user_id: str,
        event_type: str,
        title: str,
        body: str,
        payload: Optional[dict] = None,
        channel: str = "in_app",
    ) -> Notification:
        raise NotImplementedError


class MockNotificationProvider(NotificationProvider):
    async def send(
        self,
        *,
        user_id: str,
        event_type: str,
        title: str,
        body: str,
        payload: Optional[dict] = None,
        channel: str = "in_app",
    ) -> Notification:
        # Simulated SMS/Email/WhatsApp + persisted in-app record
        return Notification(
            user_id=user_id,
            channel=channel,
            event_type=event_type,
            title=title,
            body=body,
            payload_json=json.dumps(payload or {}),
            sent_via="mock",
        )


notification_provider: NotificationProvider = MockNotificationProvider()


async def notify_user(
    db: AsyncSession,
    *,
    user_id: str,
    event_type: str,
    title: str,
    body: str,
    payload: Optional[dict] = None,
) -> Notification:
    note = await notification_provider.send(
        user_id=user_id,
        event_type=event_type,
        title=title,
        body=body,
        payload=payload,
    )
    db.add(note)
    return note
