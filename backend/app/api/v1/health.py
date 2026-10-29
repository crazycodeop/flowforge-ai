import redis
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import check_db_health
from app.schemas.health import HealthResponse, ReadinessResponse, ServiceStatus

router = APIRouter(tags=["Health & Diagnostics"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
def liveness() -> HealthResponse:
    """Liveness probe to confirm that the HTTP application process is responsive."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
    )


@router.get("/ready", response_model=ReadinessResponse, summary="Readiness check")
def readiness() -> JSONResponse:
    """Readiness probe that validates connectivity to PostgreSQL and Redis."""
    # 1. PostgreSQL check
    db_ok = check_db_health()
    db_status = ServiceStatus(
        healthy=db_ok,
        details="PostgreSQL connection active" if db_ok else "PostgreSQL unreachable",
    )

    # 2. Redis check
    redis_ok = False
    redis_msg = ""
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        if r.ping():
            redis_ok = True
            redis_msg = "Redis connection active"
    except Exception as e:
        redis_msg = f"Redis unreachable: {str(e)}"
    redis_status = ServiceStatus(healthy=redis_ok, details=redis_msg)

    # 3. Celery broker check
    celery_ok = redis_ok  # Celery uses Redis broker
    celery_status = ServiceStatus(
        healthy=celery_ok,
        details="Celery broker reachable" if celery_ok else "Celery broker unreachable",
    )

    all_ready = db_ok and redis_ok
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    content = ReadinessResponse(
        status="ready" if all_ready else "not_ready",
        database=db_status,
        redis=redis_status,
        celery=celery_status,
    ).model_dump()

    return JSONResponse(status_code=status_code, content=content)
