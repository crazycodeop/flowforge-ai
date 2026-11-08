import os
import subprocess
import sys


def main():
    print("[FlowForge] Running database migrations...")
    subprocess.run(["alembic", "upgrade", "head"], check=True)

    # Check and auto-seed if database is fresh
    try:
        from app.core.database import SessionLocal
        from app.models.user import User

        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()

        if user_count == 0:
            print(
                "[FlowForge] Fresh database detected. Auto-seeding organizations and pipelines..."
            )
            from scripts.seed_tenants_and_users import seed_all

            seed_all()
    except Exception as e:
        print(f"[FlowForge] Seeding check completed with notice: {e}")

    # Launch Celery worker in background if unified mode enabled (default)
    worker_proc = None
    if os.getenv("RUN_WORKER", "true").lower() in ("true", "1", "yes"):
        print("[FlowForge] Launching background Celery worker daemon...")
        worker_proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "celery",
                "-A",
                "app.workers.celery_app.celery_app",
                "worker",
                "--loglevel=info",
                "-P",
                "threads",
            ]
        )

    port = int(os.getenv("PORT", "8000"))
    print(f"[FlowForge] Starting FastAPI server on port {port}...")
    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                str(port),
            ],
            check=True,
        )
    finally:
        if worker_proc:
            print("[FlowForge] Gracefully stopping Celery worker...")
            worker_proc.terminate()


if __name__ == "__main__":
    main()
