from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system import SystemAudit


def test_system_audit_persistence(db_session: Session):
    audit = SystemAudit(
        component="execution_engine",
        status="operational",
        message="System initial boot sequence successful",
    )
    db_session.add(audit)
    db_session.flush()

    retrieved = db_session.scalar(
        select(SystemAudit).where(SystemAudit.component == "execution_engine")
    )
    assert retrieved is not None
    assert retrieved.id == audit.id
    assert retrieved.status == "operational"
    assert retrieved.message == "System initial boot sequence successful"
    assert retrieved.created_at is not None
