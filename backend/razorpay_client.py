"""
Razorpay API Client — Mock + Live Mode
========================================
All Razorpay API interactions go through this module.

MOCK_MODE=true (default):
  - Returns realistic Razorpay response shapes
  - Adds 50-200ms simulated latency
  - Simulates 10% random API failure rate for RETRY calls
  - Never hits real Razorpay endpoints

MOCK_MODE=false:
  - Uses httpx.AsyncClient with Basic auth
  - Base URL: https://api.razorpay.com/v1/
"""

import os
import random
import string
import asyncio
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
BASE_URL = "https://api.razorpay.com/v1"


def _random_id(prefix: str, length: int = 14) -> str:
    """Generate a random Razorpay-style ID."""
    chars = string.ascii_letters + string.digits
    return f"{prefix}_" + "".join(random.choices(chars, k=length))


def _now_unix() -> int:
    """Current time as Unix timestamp."""
    return int(datetime.now(timezone.utc).timestamp())


async def _mock_latency():
    """Simulate realistic API latency (50-200ms)."""
    await asyncio.sleep(random.uniform(0.05, 0.2))


def _mock_payment_response(payment_id: str, status: str = "authorized", amount: int = 50000) -> dict:
    """Build a realistic Razorpay payment response object."""
    return {
        "id": payment_id,
        "entity": "payment",
        "amount": amount,
        "currency": "INR",
        "status": status,
        "order_id": _random_id("order"),
        "method": random.choice(["card", "upi", "netbanking"]),
        "description": "Payment retry via triage agent",
        "captured": status == "captured",
        "amount_refunded": 0,
        "refund_status": None,
        "email": "customer@example.com",
        "contact": "+919876543210",
        "fee": int(amount * 0.02) if status == "captured" else 0,
        "tax": int(amount * 0.02 * 0.18) if status == "captured" else 0,
        "error_code": None if status != "failed" else "BAD_REQUEST_ERROR",
        "error_description": None if status != "failed" else "Payment processing failed",
        "error_source": None if status != "failed" else "gateway",
        "error_step": None if status != "failed" else "payment_authorization",
        "error_reason": None if status != "failed" else "payment_failed",
        "notes": {},
        "created_at": _now_unix(),
    }


class RazorpayClient:
    """Async Razorpay API client with mock/live mode support."""

    def __init__(self):
        self.mock_mode = MOCK_MODE
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client for live mode."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=BASE_URL,
                auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
                timeout=30.0,
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def retry_payment(self, payment_id: str, amount: int = 50000) -> dict:
        """
        Retry a failed payment.
        Mock: 90% success, 10% failure (simulates real-world API unreliability).
        Live: POST /payments/{id}/retry
        """
        if self.mock_mode:
            await _mock_latency()
            # 10% chance of API failure for retry calls
            if random.random() < 0.10:
                return {
                    "success": False,
                    "mock": True,
                    "error": "Gateway timeout during retry",
                    "payment": _mock_payment_response(payment_id, status="failed", amount=amount),
                }
            return {
                "success": True,
                "mock": True,
                "payment": _mock_payment_response(payment_id, status="authorized", amount=amount),
            }

        # Live mode
        client = await self._get_client()
        try:
            resp = await client.post(f"/payments/{payment_id}/retry")
            resp.raise_for_status()
            return {"success": True, "mock": False, "payment": resp.json()}
        except httpx.HTTPError as e:
            return {"success": False, "mock": False, "error": str(e)}

    async def send_payment_link(
        self, amount: int, customer_email: str, customer_phone: str,
        customer_name: str = "Customer", description: str = "Payment link for card update"
    ) -> dict:
        """
        Create a Razorpay payment link.
        Mock: always succeeds with a realistic plink_ response.
        Live: POST /payment_links
        """
        if self.mock_mode:
            await _mock_latency()
            plink_id = _random_id("plink")
            return {
                "success": True,
                "mock": True,
                "payment_link": {
                    "id": plink_id,
                    "entity": "payment_link",
                    "amount": amount,
                    "currency": "INR",
                    "status": "created",
                    "accept_partial": False,
                    "first_min_partial_amount": 0,
                    "short_url": f"https://rzp.io/i/{_random_id('', 8)}",
                    "reference_id": _random_id("ref", 8),
                    "description": description,
                    "customer": {
                        "name": customer_name,
                        "contact": f"+91{customer_phone}",
                        "email": customer_email,
                    },
                    "notify": {"sms": True, "email": True},
                    "reminder_enable": True,
                    "created_at": _now_unix(),
                    "updated_at": _now_unix(),
                },
            }

        # Live mode
        client = await self._get_client()
        try:
            payload = {
                "amount": amount,
                "currency": "INR",
                "description": description,
                "customer": {
                    "name": customer_name,
                    "contact": f"+91{customer_phone}",
                    "email": customer_email,
                },
                "notify": {"sms": True, "email": True},
                "reminder_enable": True,
            }
            resp = await client.post("/payment_links", json=payload)
            resp.raise_for_status()
            return {"success": True, "mock": False, "payment_link": resp.json()}
        except httpx.HTTPError as e:
            return {"success": False, "mock": False, "error": str(e)}

    async def send_reminder(self, payment_id: str) -> dict:
        """
        Send a payment reminder to the customer.
        Mock: always succeeds.
        Live: POST /payments/{id}/notify (if available, otherwise simulate)
        """
        if self.mock_mode:
            await _mock_latency()
            return {
                "success": True,
                "mock": True,
                "notification": {
                    "payment_id": payment_id,
                    "sms_status": "sent",
                    "email_status": "sent",
                    "sent_at": _now_unix(),
                },
            }

        # Live mode — Razorpay's notify endpoint
        client = await self._get_client()
        try:
            resp = await client.post(
                f"/payments/{payment_id}/notify",
                json={"type": "sms"}
            )
            resp.raise_for_status()
            return {"success": True, "mock": False, "notification": resp.json()}
        except httpx.HTTPError as e:
            return {"success": False, "mock": False, "error": str(e)}

    async def get_payment(self, payment_id: str) -> dict:
        """
        Fetch payment details.
        Mock: returns a realistic payment object.
        Live: GET /payments/{id}
        """
        if self.mock_mode:
            await _mock_latency()
            return {
                "success": True,
                "mock": True,
                "payment": _mock_payment_response(payment_id),
            }

        client = await self._get_client()
        try:
            resp = await client.get(f"/payments/{payment_id}")
            resp.raise_for_status()
            return {"success": True, "mock": False, "payment": resp.json()}
        except httpx.HTTPError as e:
            return {"success": False, "mock": False, "error": str(e)}


# Module-level singleton
razorpay_client = RazorpayClient()
