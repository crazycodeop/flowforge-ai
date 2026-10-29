from enum import StrEnum


class RunStatus(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class StepStatus(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    RETRY_WAIT = "RETRY_WAIT"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"
    SKIPPED = "SKIPPED"


class InvalidStateTransitionError(Exception):
    """Raised when an illegal state transition is attempted."""

    def __init__(self, current_state: str, target_state: str, entity_type: str = "Step"):
        self.current_state = current_state
        self.target_state = target_state
        self.entity_type = entity_type
        super().__init__(
            f"Invalid {entity_type} state transition from '{current_state}' to '{target_state}'"
        )


# Explicit Valid State Transitions Map
VALID_RUN_TRANSITIONS: dict[RunStatus, set[RunStatus]] = {
    RunStatus.PENDING: {RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.CANCELLED},
    RunStatus.QUEUED: {RunStatus.RUNNING, RunStatus.CANCELLED},
    RunStatus.RUNNING: {
        RunStatus.PAUSED,
        RunStatus.SUCCEEDED,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
    },
    RunStatus.PAUSED: {RunStatus.RUNNING, RunStatus.CANCELLED, RunStatus.FAILED},
    RunStatus.SUCCEEDED: set(),  # Terminal state
    RunStatus.FAILED: set(),  # Terminal state
    RunStatus.CANCELLED: set(),  # Terminal state
}

VALID_STEP_TRANSITIONS: dict[StepStatus, set[StepStatus]] = {
    StepStatus.PENDING: {
        StepStatus.QUEUED,
        StepStatus.RUNNING,
        StepStatus.SKIPPED,
        StepStatus.CANCELLED,
    },
    StepStatus.QUEUED: {StepStatus.RUNNING, StepStatus.CANCELLED, StepStatus.SKIPPED},
    StepStatus.RUNNING: {
        StepStatus.SUCCEEDED,
        StepStatus.FAILED,
        StepStatus.PAUSED,
        StepStatus.RETRY_WAIT,
        StepStatus.CANCELLED,
    },
    StepStatus.RETRY_WAIT: {
        StepStatus.QUEUED,
        StepStatus.RUNNING,
        StepStatus.CANCELLED,
        StepStatus.FAILED,
    },
    StepStatus.PAUSED: {
        StepStatus.RUNNING,
        StepStatus.SUCCEEDED,
        StepStatus.CANCELLED,
        StepStatus.FAILED,
    },
    StepStatus.SUCCEEDED: set(),  # Terminal state
    StepStatus.FAILED: set(),  # Terminal state
    StepStatus.CANCELLED: set(),  # Terminal state
    StepStatus.SKIPPED: set(),  # Terminal state
}


def validate_run_transition(current: RunStatus, target: RunStatus) -> None:
    """Validates that a workflow run transition is permitted by the explicit state machine."""
    if current == target:
        return
    allowed = VALID_RUN_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidStateTransitionError(current.value, target.value, entity_type="WorkflowRun")


def validate_step_transition(current: StepStatus, target: StepStatus) -> None:
    """Validates that a step run transition is permitted by the explicit state machine."""
    if current == target:
        return
    allowed = VALID_STEP_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidStateTransitionError(current.value, target.value, entity_type="StepRun")
