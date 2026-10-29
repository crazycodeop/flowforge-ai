import logging

from app.core.database import SessionLocal
from app.workers.celery_app import celery_app
from app.workflows.executor import execute_workflow_run

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.ping")
def ping_task(message: str = "pong") -> dict:
    """Verifies that the Celery worker pipeline is operational and processing jobs."""
    logger.info("Executing background ping task with message: %s", message)
    return {"status": "ok", "response": message}


@celery_app.task(name="app.workers.tasks.execute_workflow")
def execute_workflow_task(run_id: str) -> dict:
    """Background Celery task that executes a workflow run to completion."""
    logger.info("Starting background execution for run_id: %s", run_id)
    db = SessionLocal()
    try:
        run = execute_workflow_run(run_id, db)
        return {
            "run_id": run.id,
            "status": run.status,
            "error_message": run.error_message,
        }
    except Exception as e:
        logger.exception("Background execution task failed for run_id %s: %s", run_id, str(e))
        return {
            "run_id": run_id,
            "status": "FAILED",
            "error_message": str(e),
        }
    finally:
        db.close()
