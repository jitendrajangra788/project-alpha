"""Bootstrap local DB (Postgres preferred; SQLite fallback when unavailable)."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)


async def postgres_available(url: str) -> bool:
    if not url.startswith("postgresql"):
        return False
    try:
        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(url)
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"Postgres unavailable: {exc}")
        return False


async def main() -> None:
    from app.core.config import get_settings

    settings = get_settings()
    if not await postgres_available(settings.database_url):
        print("Falling back to SQLite for local development (Docker/Postgres not running).")
        os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./careconnect.db"
        os.environ["DATABASE_URL_SYNC"] = "sqlite:///./careconnect.db"
        get_settings.cache_clear()

        # Recreate engine bindings
        import app.core.database as db

        from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

        db.engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
        db.AsyncSessionLocal = async_sessionmaker(db.engine, expire_on_commit=False)

        from app.core.database import Base
        import app.models  # noqa: F401

        async with db.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    else:
        print("Using PostgreSQL. Run: alembic upgrade head")
        os.system(f'"{sys.executable}" -m alembic upgrade head')

    from app.seed import seed

    await seed()
    print("Local bootstrap complete.")


if __name__ == "__main__":
    asyncio.run(main())
