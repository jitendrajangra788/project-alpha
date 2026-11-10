import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_live_ready_and_security_headers(client: AsyncClient):
    health = await client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert "version" in health.json()
    assert health.headers.get("x-content-type-options") == "nosniff"
    assert health.headers.get("x-frame-options") == "DENY"
    assert health.headers.get("x-request-id")

    live = await client.get("/api/v1/live")
    assert live.status_code == 200
    assert live.json()["status"] == "alive"

    ready = await client.get("/api/v1/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert ready.json()["checks"]["database"] is True

    metrics = await client.get("/api/v1/metrics")
    assert metrics.status_code == 200
    assert "careconnect_http_requests_total" in metrics.text


@pytest.mark.asyncio
async def test_production_rejects_weak_secret(monkeypatch):
    from app.core.config import Settings, get_settings

    get_settings.cache_clear()
    with pytest.raises(Exception):
        Settings(
            app_env="production",
            secret_key="change-me-to-a-long-random-secret-key",
            cors_origins="https://app.example.com",
        )
    get_settings.cache_clear()
