from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "FlowForge AI"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars-long"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql+psycopg2://vakildesk@localhost:5433/flowforge"
    TEST_DATABASE_URL: str = "postgresql+psycopg2://vakildesk@localhost:5433/flowforge_test"

    @field_validator("DATABASE_URL", "TEST_DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None) -> str | None:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        if v and v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # AI Provider
    AI_PROVIDER: str = "mock"
    AI_MODEL: str = "mock-model-v1"
    AI_API_KEY: str | None = None
    AI_BASE_URL: str | None = None
    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 3

    # Google OAuth
    GOOGLE_CLIENT_ID: str | None = (
        "984331841923-mbs15eafro18p6tlr0ab4fm9ca6dfhj9.apps.googleusercontent.com"
    )
    GOOGLE_CLIENT_SECRET: str | None = None

    # Operational Limits
    MAX_WORKFLOW_NODES: int = 50
    MAX_GRAPH_DEPTH: int = 20
    MAX_EXECUTION_TIMEOUT_SECONDS: int = 3600
    WORKER_CONCURRENCY: int = 4


@lru_cache
def get_settings() -> Settings:
    return Settings()
