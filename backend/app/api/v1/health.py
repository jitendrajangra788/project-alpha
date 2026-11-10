from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.metrics import prometheus_text, snapshot
from app.core.redis import get_redis, is_using_memory_store

router = APIRouter()


@router.get("/health")
async def health():
    """Compatibility health endpoint (always 200 if process is up)."""
    settings = get_settings()
    redis_status = await _redis_status()
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "env": settings.app_env,
        "redis": redis_status,
    }


@router.get("/live")
async def live():
    """Kubernetes-style liveness probe."""
    return {"status": "alive"}


@router.get("/ready")
async def ready(response: Response):
    """Readiness: database must respond; Redis preferred."""
    settings = get_settings()
    checks = {"database": False, "redis": await _redis_status()}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = True
    except Exception as exc:  # noqa: BLE001
        checks["database_error"] = str(exc)

    ready_ok = checks["database"]
    if settings.is_production and not settings.redis_optional:
        ready_ok = ready_ok and checks["redis"] in {"up", "memory"}

    if not ready_ok:
        response.status_code = 503
        return {"status": "not_ready", "checks": checks, "version": settings.app_version}
    return {"status": "ready", "checks": checks, "version": settings.app_version}


@router.get("/metrics")
async def metrics():
    settings = get_settings()
    if not settings.metrics_enabled:
        return Response(status_code=404)
    accept = "text"  # default prometheus
    return PlainTextResponse(prometheus_text(), media_type="text/plain; version=0.0.4")


@router.get("/metrics/json")
async def metrics_json():
    settings = get_settings()
    if not settings.metrics_enabled:
        return Response(status_code=404)
    return snapshot()


async def _redis_status() -> str:
    try:
        client = await get_redis()
        ok = bool(await client.ping())
        if not ok:
            return "down"
        return "memory" if is_using_memory_store() else "up"
    except Exception:
        return "down"
