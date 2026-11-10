"""Razorpay gateway with mock adapter for local/dev without API keys."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Optional
from uuid import uuid4

import httpx

from app.core.config import get_settings


@dataclass
class GatewayOrder:
    order_id: str
    amount_paise: int
    currency: str
    key_id: str
    mock: bool
    raw: Optional[dict] = None


class RazorpayGateway:
    def create_order(self, *, amount: float, currency: str, receipt: str, notes: Optional[dict] = None) -> GatewayOrder:
        raise NotImplementedError

    def verify_payment_signature(self, *, order_id: str, payment_id: str, signature: str) -> bool:
        raise NotImplementedError

    def verify_webhook_signature(self, *, body: bytes, signature: str) -> bool:
        raise NotImplementedError

    def create_refund(self, *, payment_id: str, amount_paise: int) -> dict[str, Any]:
        raise NotImplementedError


class MockRazorpayGateway(RazorpayGateway):
    def create_order(self, *, amount: float, currency: str, receipt: str, notes: Optional[dict] = None) -> GatewayOrder:
        amount_paise = int(round(amount * 100))
        order_id = f"order_mock_{uuid4().hex[:16]}"
        return GatewayOrder(
            order_id=order_id,
            amount_paise=amount_paise,
            currency=currency,
            key_id="rzp_test_mock",
            mock=True,
            raw={"id": order_id, "amount": amount_paise, "currency": currency, "receipt": receipt, "notes": notes or {}},
        )

    def verify_payment_signature(self, *, order_id: str, payment_id: str, signature: str) -> bool:
        # Accept deterministic mock signature or any non-empty signature in mock mode
        expected = self.mock_signature(order_id, payment_id)
        return bool(signature) and (signature == expected or signature.startswith("mock_sig_"))

    def verify_webhook_signature(self, *, body: bytes, signature: str) -> bool:
        return bool(signature)

    def create_refund(self, *, payment_id: str, amount_paise: int) -> dict[str, Any]:
        return {
            "id": f"rfnd_mock_{uuid4().hex[:12]}",
            "payment_id": payment_id,
            "amount": amount_paise,
            "status": "processed",
        }

    @staticmethod
    def mock_signature(order_id: str, payment_id: str) -> str:
        return "mock_sig_" + hashlib.sha256(f"{order_id}|{payment_id}".encode()).hexdigest()[:32]

    @staticmethod
    def mock_payment_id() -> str:
        return f"pay_mock_{uuid4().hex[:16]}"


class LiveRazorpayGateway(RazorpayGateway):
    BASE = "https://api.razorpay.com/v1"

    def __init__(self, key_id: str, key_secret: str, webhook_secret: str = "") -> None:
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret

    def create_order(self, *, amount: float, currency: str, receipt: str, notes: Optional[dict] = None) -> GatewayOrder:
        amount_paise = int(round(amount * 100))
        payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt[:40],
            "payment_capture": 1,
            "notes": notes or {},
        }
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                f"{self.BASE}/orders",
                json=payload,
                auth=(self.key_id, self.key_secret),
            )
            res.raise_for_status()
            data = res.json()
        return GatewayOrder(
            order_id=data["id"],
            amount_paise=amount_paise,
            currency=currency,
            key_id=self.key_id,
            mock=False,
            raw=data,
        )

    def verify_payment_signature(self, *, order_id: str, payment_id: str, signature: str) -> bool:
        message = f"{order_id}|{payment_id}".encode()
        digest = hmac.new(self.key_secret.encode(), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, signature)

    def verify_webhook_signature(self, *, body: bytes, signature: str) -> bool:
        if not self.webhook_secret:
            return False
        digest = hmac.new(self.webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, signature)

    def create_refund(self, *, payment_id: str, amount_paise: int) -> dict[str, Any]:
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                f"{self.BASE}/payments/{payment_id}/refund",
                json={"amount": amount_paise},
                auth=(self.key_id, self.key_secret),
            )
            res.raise_for_status()
            return res.json()


def get_razorpay_gateway() -> RazorpayGateway:
    settings = get_settings()
    if settings.razorpay_live:
        return LiveRazorpayGateway(
            settings.razorpay_key_id,
            settings.razorpay_key_secret,
            settings.razorpay_webhook_secret,
        )
    return MockRazorpayGateway()


def parse_webhook_event(body: bytes) -> dict[str, Any]:
    return json.loads(body.decode("utf-8"))
