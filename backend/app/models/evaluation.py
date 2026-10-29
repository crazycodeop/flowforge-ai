import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EvaluationDataset(Base):
    """Benchmark dataset containing standardized test cases and ground-truth assertions."""

    __tablename__ = "evaluation_datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_cases: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    runs: Mapped[list["EvaluationRun"]] = relationship(
        "EvaluationRun",
        back_populates="dataset",
        cascade="all, delete-orphan",
        order_by="EvaluationRun.created_at.desc()",
    )


class EvaluationRun(Base):
    """Execution instance of an evaluation dataset benchmark evaluating workflow accuracy and latency."""

    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("evaluation_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workflow_version_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflow_versions.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False, index=True)
    accuracy_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary_metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dataset: Mapped["EvaluationDataset"] = relationship("EvaluationDataset", back_populates="runs")
    workflow: Mapped["Workflow"] = relationship("Workflow")  # noqa: F821
    version: Mapped["WorkflowVersion"] = relationship("WorkflowVersion")  # noqa: F821
