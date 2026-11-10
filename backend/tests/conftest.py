from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.enums import RoleCode
from app.core.security import hash_password
from app.main import create_app
from app.models.platform import PlatformSetting
from app.models.user import Permission, Role, RolePermission, User, UserRole
from app.services.platform import DEFAULTS

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DB_URL, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        # seed roles + admin
        roles = {}
        for code in RoleCode:
            role = Role(code=code.value, name=code.value.replace("_", " ").title())
            session.add(role)
            await session.flush()
            roles[code.value] = role

        perm = Permission(code="admin.access", name="Admin access")
        session.add(perm)
        await session.flush()
        session.add(RolePermission(role_id=roles[RoleCode.SUPER_ADMIN.value].id, permission_id=perm.id))
        session.add(RolePermission(role_id=roles[RoleCode.ADMIN.value].id, permission_id=perm.id))

        for key, value in DEFAULTS.items():
            session.add(PlatformSetting(key=key, value=value))

        admin = User(
            full_name="Test Admin",
            email="admin@example.com",
            mobile="9000000000",
            password_hash=hash_password("Admin@12345"),
            is_active=True,
        )
        session.add(admin)
        await session.flush()
        session.add(UserRole(user_id=admin.id, role_id=roles[RoleCode.SUPER_ADMIN.value].id))
        await session.commit()

        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
