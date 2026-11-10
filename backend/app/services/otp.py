import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.redis import get_redis


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


class OtpService:
    """Mock notification channel: OTP is returned in API response only in development."""

    async def request_otp(self, mobile: str, purpose: str = "login") -> dict:
        settings = get_settings()
        redis = await get_redis()
        rate_key = f"otp:rate:{purpose}:{mobile}"
        if await redis.exists(rate_key):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="OTP requested too frequently")

        otp = f"{secrets.randbelow(10**6):06d}"
        await redis.setex(f"otp:{purpose}:{mobile}", settings.otp_ttl_seconds, _hash_otp(otp))
        await redis.setex(rate_key, settings.otp_rate_limit_seconds, "1")

        payload = {
            "message": "OTP sent",
            "expires_in": settings.otp_ttl_seconds,
            "channel": "mock",
        }
        if settings.app_env == "development":
            payload["dev_otp"] = otp  # clearly labeled mock/dev only
        return payload

    async def verify_otp(self, mobile: str, otp: str, purpose: str = "login") -> bool:
        redis = await get_redis()
        stored = await redis.get(f"otp:{purpose}:{mobile}")
        if not stored or stored != _hash_otp(otp):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
        await redis.delete(f"otp:{purpose}:{mobile}")
        return True


otp_service = OtpService()
