import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.ping")
def ping_task(message: str = "pong") -> dict:
    """Verifies that the Celery worker pipeline is operational and processing jobs."""
    logger.info("Executing background ping task with message: %s", message)
    return {"status": "ok", "response": message}
