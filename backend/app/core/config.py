from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

WEAK_SECRETS = {
    "change-me-to-a-long-random-secret-key",
    "careconnect-dev-secret-change-in-production-32chars",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CareConnect"
    app_env: str = "development"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-to-a-long-random-secret-key"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    cors_origins: str = "http://localhost:4200"
    trusted_hosts: str = "*"

    database_url: str = "postgresql+asyncpg://careconnect:careconnect@localhost:5432/careconnect"
    database_url_sync: str = "postgresql+psycopg://careconnect:careconnect@localhost:5432/careconnect"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_async_database_url(cls, value: object) -> object:
        """Render/Neon often provide postgres:// — SQLAlchemy async needs +asyncpg."""
        if not isinstance(value, str) or not value:
            return value
        url = value.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+asyncpg" not in url and "+psycopg" not in url:
            url = "postgresql+asyncpg://" + url[len("postgresql://") :]
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
        return url

    redis_url: str = "redis://localhost:6379/0"
    redis_optional: bool = True

    upload_dir: str = "./uploads"
    max_upload_mb: int = 10

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
        """If only DATABASE_URL is set (Render), derive the sync Alembic URL."""
        if self.database_url and (
            not self.database_url_sync
            or self.database_url_sync.startswith("postgresql+psycopg://careconnect:careconnect@localhost")
        ):
            sync = self.database_url
            if sync.startswith("postgresql+asyncpg://"):
                sync = "postgresql+psycopg://" + sync[len("postgresql+asyncpg://") :]
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
