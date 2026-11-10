"""Security headers, request ID, and lightweight rate limiting."""

from __future__ import annotations

import time
import uuid
from collections import defaultdict
from typing import Callable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.logging import request_id_ctx
from app.core.metrics import record_request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        elapsed_ms = (time.perf_counter() - started) * 1000
        record_request(request.url.path, request.method, response.status_code, elapsed_ms)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        settings = get_settings()
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-process sliding window fallback; Redis preferred when available."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self._hits: dict[str, list[float]] = defaultdict(list)

    def _limit_for_path(self, path: str) -> int:
        settings = get_settings()
        if "/auth/" in path:
            return settings.rate_limit_auth_max
        if "/payments/" in path:
            return settings.rate_limit_payment_max
        return settings.rate_limit_default_max

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        settings = get_settings()
        if not settings.rate_limit_enabled:
            return await call_next(request)

        # Skip health/metrics
        path = request.url.path
        if path.endswith("/health") or path.endswith("/ready") or path.endswith("/live") or path.endswith("/metrics"):
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        key = f"{client}:{path.split(settings.api_prefix)[-1][:40]}"
        now = time.time()
        window = settings.rate_limit_window_seconds
        limit = self._limit_for_path(path)

        # Prefer Redis counter when available
        count = await self._redis_count(key, window)
        if count is None:
            bucket = self._hits[key]
            self._hits[key] = [t for t in bucket if now - t < window]
            self._hits[key].append(now)
            count = len(self._hits[key])

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again shortly."},
                headers={"Retry-After": str(window)},
            )
        return await call_next(request)

    async def _redis_count(self, key: str, window: int) -> Optional[int]:
        try:
            from app.core.redis import get_redis, is_using_memory_store

            client = await get_redis()
            # Memory store may not support incr — fall back
            if is_using_memory_store() and not hasattr(client, "incr"):
                return None
            rkey = f"rl:{key}"
            if hasattr(client, "incr"):
                value = await client.incr(rkey)
                if value == 1 and hasattr(client, "expire"):
                    await client.expire(rkey, window)
                return int(value)
        except Exception:
            return None
        return None
