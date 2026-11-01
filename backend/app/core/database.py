from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy models."""

    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> bool:
    """Executes a lightweight query to verify database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        # Fallback to TEST_DATABASE_URL if configured and default engine connection fails
        try:
            curr_settings = get_settings()
            if (
                curr_settings.TEST_DATABASE_URL
                and curr_settings.TEST_DATABASE_URL != curr_settings.DATABASE_URL
            ):
                fallback_engine = create_engine(curr_settings.TEST_DATABASE_URL)
                with fallback_engine.connect() as fallback_conn:
                    fallback_conn.execute(text("SELECT 1"))
                return True
        except Exception:
            pass
        return False
