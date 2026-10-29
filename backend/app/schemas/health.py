from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class ServiceStatus(BaseModel):
    healthy: bool
    details: str | None = None


class ReadinessResponse(BaseModel):
    status: str
    database: ServiceStatus
    redis: ServiceStatus
    celery: ServiceStatus
