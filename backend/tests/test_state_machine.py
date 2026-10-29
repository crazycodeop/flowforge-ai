import pytest

from app.workflows.state_machine import (
    InvalidStateTransitionError,
    RunStatus,
    StepStatus,
    validate_run_transition,
    validate_step_transition,
)


def test_valid_run_transitions():
    # PENDING -> QUEUED -> RUNNING -> SUCCEEDED
    validate_run_transition(RunStatus.PENDING, RunStatus.QUEUED)
    validate_run_transition(RunStatus.QUEUED, RunStatus.RUNNING)
    validate_run_transition(RunStatus.RUNNING, RunStatus.SUCCEEDED)

    # RUNNING -> PAUSED -> RUNNING -> FAILED
    validate_run_transition(RunStatus.RUNNING, RunStatus.PAUSED)
    validate_run_transition(RunStatus.PAUSED, RunStatus.RUNNING)
    validate_run_transition(RunStatus.RUNNING, RunStatus.FAILED)

    # Identity transition is valid
    validate_run_transition(RunStatus.RUNNING, RunStatus.RUNNING)


def test_invalid_run_transitions():
    # Terminal SUCCEEDED cannot transition to RUNNING or PENDING
    with pytest.raises(InvalidStateTransitionError):
        validate_run_transition(RunStatus.SUCCEEDED, RunStatus.RUNNING)

    # Terminal FAILED cannot transition to QUEUED
    with pytest.raises(InvalidStateTransitionError):
        validate_run_transition(RunStatus.FAILED, RunStatus.QUEUED)

    # PENDING cannot jump directly to SUCCEEDED
    with pytest.raises(InvalidStateTransitionError):
        validate_run_transition(RunStatus.PENDING, RunStatus.SUCCEEDED)


def test_valid_step_transitions():
    # PENDING -> RUNNING -> SUCCEEDED
    validate_step_transition(StepStatus.PENDING, StepStatus.RUNNING)
    validate_step_transition(StepStatus.RUNNING, StepStatus.SUCCEEDED)

    # PENDING -> SKIPPED
    validate_step_transition(StepStatus.PENDING, StepStatus.SKIPPED)

    # RUNNING -> FAILED
    validate_step_transition(StepStatus.RUNNING, StepStatus.FAILED)


def test_invalid_step_transitions():
    # Terminal SUCCEEDED cannot transition to RUNNING
    with pytest.raises(InvalidStateTransitionError):
        validate_step_transition(StepStatus.SUCCEEDED, StepStatus.RUNNING)

    # Terminal SKIPPED cannot transition to SUCCEEDED
    with pytest.raises(InvalidStateTransitionError):
        validate_step_transition(StepStatus.SKIPPED, StepStatus.SUCCEEDED)

    # Terminal FAILED cannot transition to PENDING
    with pytest.raises(InvalidStateTransitionError):
        validate_step_transition(StepStatus.FAILED, StepStatus.PENDING)
