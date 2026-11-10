"""Redis client with optional in-memory fallback for local development."""

from __future__ import annotations

import time
from typing import Optional

from app.core.config import get_settings

try:
    import redis.asyncio as redis
except ImportError:  # pragma: no cover
    redis = None  # type: ignore


class MemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[str, Optional[float]]] = {}

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self._data[key] = (value, time.time() + ttl)

    async def get(self, key: str) -> Optional[str]:
        item = self._data.get(key)
        if not item:
            return None
        value, expires = item
        if expires is not None and time.time() > expires:
            self._data.pop(key, None)
            return None
        return value

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)

    async def exists(self, key: str) -> bool:
        return (await self.get(key)) is not None

    async def incr(self, key: str) -> int:
        current = await self.get(key)
        value = int(current or "0") + 1
        expires = None
        item = self._data.get(key)
        if item and item[1] is not None:
            expires = item[1]
        self._data[key] = (str(value), expires)
        return value

    async def expire(self, key: str, ttl: int) -> None:
        item = self._data.get(key)
        if not item:
            return
        value, _ = item
        self._data[key] = (value, time.time() + ttl)

    async def ping(self) -> bool:
        return True


_memory = MemoryStore()
_client: Optional[object] = None
_using_memory = False


async def get_redis():
    global _client, _using_memory
    if _client is not None:
        return _client

    settings = get_settings()
    if redis is None:
        _using_memory = True
        _client = _memory
        return _client

    try:
        client = redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        _client = client
        _using_memory = False
        return _client
    except Exception:
        if settings.redis_optional:
            _using_memory = True
            _client = _memory
            return _client
        raise


def is_using_memory_store() -> bool:
    return _using_memory
