from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "flowforge",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.MAX_EXECUTION_TIMEOUT_SECONDS,
    worker_concurrency=settings.WORKER_CONCURRENCY,
)

# Upstash and TLS-enabled Redis configurations (optimized for free-tier quotas)
if settings.CELERY_BROKER_URL.startswith("rediss://"):
    import ssl

    celery_app.conf.update(
        broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
        redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
        broker_transport_options={"visibility_timeout": 3600},
        broker_connection_retry_on_startup=True,
        result_expires=3600,
        worker_prefetch_multiplier=1,
    )
