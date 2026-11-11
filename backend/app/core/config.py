import os
from functools import lru_cache
from typing import List, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_upload_dir() -> str:
    # Vercel / Lambda package dir is read-only; only /tmp is writable.
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return "/tmp/careconnect-uploads"
    return "./uploads"


def _ensure_postgres_ssl(url: str, *, async_driver: bool) -> str:
    """Neon / Vercel Postgres require TLS; normalize query params per driver."""
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    host = (parts.hostname or "").lower()
    needs_ssl = any(x in host for x in ("neon.tech", "vercel-storage.com", "supabase.co")) or "sslmode" in query or "ssl" in query
    if needs_ssl:
        if async_driver:
            query.pop("sslmode", None)
            query.setdefault("ssl", "require")
        else:
            query.pop("ssl", None)
            query.setdefault("sslmode", "require")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))

WEAK_SECRETS = {
    "change-me-to-a-long-random-secret-key",
    "careconnect-dev-secret-change-in-production-32chars",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "CareConnect"
    app_env: str = "development"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-to-a-long-random-secret-key"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    cors_origins: str = "http://localhost:4200"
    trusted_hosts: str = "*"

    # Neon/Vercel may inject DATABASE_URL or POSTGRES_URL
    database_url: str = Field(
        default="postgresql+asyncpg://careconnect:careconnect@localhost:5432/careconnect",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"),
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg://careconnect:careconnect@localhost:5432/careconnect",
        validation_alias=AliasChoices("DATABASE_URL_SYNC", "POSTGRES_URL_NON_POOLING"),
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_async_database_url(cls, value: object) -> object:
        """Render/Neon/Vercel often provide postgres:// — SQLAlchemy async needs +asyncpg."""
        if not isinstance(value, str) or not value:
            return value
        url = value.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+asyncpg" not in url and "+psycopg" not in url:
            url = "postgresql+asyncpg://" + url[len("postgresql://") :]
        if url.startswith("postgresql"):
            return _ensure_postgres_ssl(url, async_driver=True)
        return url

    @field_validator("database_url_sync", mode="before")
    @classmethod
    def normalize_sync_database_url(cls, value: object) -> object:
        if not isinstance(value, str) or not value:
            return value
        url = value.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql+asyncpg://"):
            url = "postgresql+psycopg://" + url[len("postgresql+asyncpg://") :]
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        if url.startswith("postgresql"):
            return _ensure_postgres_ssl(url, async_driver=False)
        return url

    redis_url: str = "redis://localhost:6379/0"
    redis_optional: bool = True

    upload_dir: str = Field(default_factory=_default_upload_dir)
    max_upload_mb: int = 10

    @field_validator("upload_dir", mode="before")
    @classmethod
    def normalize_upload_dir(cls, value: object) -> object:
        """Force writable path on serverless even if UPLOAD_DIR=./uploads is set."""
        if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            raw = str(value or "").strip() or "./uploads"
            # Relative or /var/task paths are not writable on Vercel
            if not raw.startswith("/tmp"):
                return "/tmp/careconnect-uploads"
        return value

    seed_admin_email: str = "admin@careconnect.local"
    seed_admin_password: str = "Admin@12345"
    seed_admin_mobile: str = "9999999999"

    frontend_url: str = "http://localhost:4200"
    otp_ttl_seconds: int = 300
    otp_rate_limit_seconds: int = 60

    # Razorpay — leave keys empty to use mock gateway in development
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_mock: bool = True
    platform_commission_percent: float = Field(default=10.0)

    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_window_seconds: int = 60
    rate_limit_auth_max: int = 20
    rate_limit_payment_max: int = 30
    rate_limit_default_max: int = 180

    # Ops
    enable_docs: Optional[bool] = None  # None = auto (on in non-prod)
    log_level: str = "INFO"
    metrics_enabled: bool = True
    # Vercel/Neon first boot helpers
    auto_migrate: bool = False
    auto_seed_three: bool = False

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def docs_enabled(self) -> bool:
        if self.enable_docs is not None:
            return self.enable_docs
        return not self.is_production

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_host_list(self) -> List[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def razorpay_live(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret and not self.razorpay_mock)

    @field_validator("secret_key")
    @classmethod
    def secret_min_length(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value

    @model_validator(mode="after")
    def fill_sync_database_url(self) -> "Settings":
        """If only DATABASE_URL / POSTGRES_URL is set, derive the sync Alembic URL."""
        async_url = self.database_url or ""
        sync_url = self.database_url_sync or ""
        should_derive = async_url.startswith("postgresql") and (
            not sync_url
            or "localhost" in sync_url
            or sync_url.startswith("sqlite")
            or sync_url.startswith("postgresql+psycopg://careconnect:careconnect@localhost")
        )
        if should_derive:
            sync = async_url
            if sync.startswith("postgresql+asyncpg://"):
                sync = "postgresql+psycopg://" + sync[len("postgresql+asyncpg://") :]
            sync = _ensure_postgres_ssl(sync, async_driver=False)
            object.__setattr__(self, "database_url_sync", sync)
        return self

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if not self.is_production:
            return self
        if self.secret_key in WEAK_SECRETS:
            raise ValueError("SECRET_KEY must be changed for production")
        if "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS must not include '*' in production")
        if self.razorpay_mock and not self.razorpay_live:
            # Allow mock only when explicitly forced; recommend live keys
            pass
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
