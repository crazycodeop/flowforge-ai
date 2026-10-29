import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ApprovalStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ApprovalRequest(Base):
    """Human-in-the-loop review gateway request pausing automated execution."""

    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("step_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required_role: Mapped[str] = mapped_column(String(64), default="reviewer", nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=ApprovalStatus.PENDING.value, nullable=False, index=True
    )
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timeout_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    workflow_run: Mapped["WorkflowRun"] = relationship("WorkflowRun")  # noqa: F821
    step_run: Mapped["StepRun"] = relationship("StepRun")  # noqa: F821
