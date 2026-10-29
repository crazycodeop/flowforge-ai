import random
from enum import StrEnum


class ErrorCategory(StrEnum):
    TRANSIENT_NETWORK = "TRANSIENT_NETWORK"
    RATE_LIMIT = "RATE_LIMIT"
    MODEL_OUTPUT_INVALID = "MODEL_OUTPUT_INVALID"
    PERMANENT_VALIDATION = "PERMANENT_VALIDATION"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    SYSTEM_ERROR = "SYSTEM_ERROR"


class WorkflowEngineError(Exception):
    """Base class for domain-level execution errors with explicit retry categorization."""

    def __init__(
        self,
        message: str,
        category: ErrorCategory = ErrorCategory.SYSTEM_ERROR,
        retryable: bool = False,
        user_message: str | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.retryable = retryable
        self.user_message = user_message or "An internal execution error occurred."


class TransientNetworkError(WorkflowEngineError):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            category=ErrorCategory.TRANSIENT_NETWORK,
            retryable=True,
            user_message="Temporary network communication failure.",
        )


class RateLimitExceededError(WorkflowEngineError):
    def __init__(self, message: str, retry_after: float | None = None):
        super().__init__(
            message=message,
            category=ErrorCategory.RATE_LIMIT,
            retryable=True,
            user_message="Upstream provider rate limit reached. Retrying with backoff.",
        )
        self.retry_after = retry_after


class PermanentValidationError(WorkflowEngineError):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            category=ErrorCategory.PERMANENT_VALIDATION,
            retryable=False,
            user_message="Input or configuration failed schema validation.",
        )


class ModelOutputInvalidError(WorkflowEngineError):
    def __init__(self, message: str, retryable: bool = True):
        super().__init__(
            message=message,
            category=ErrorCategory.MODEL_OUTPUT_INVALID,
            retryable=retryable,
            user_message="AI model produced output that failed schema validation.",
        )


def classify_exception(exc: Exception) -> tuple[ErrorCategory, bool, str]:
    """Inspects an exception and returns its category, retry eligibility, and sanitized user message."""
    if isinstance(exc, WorkflowEngineError):
        return exc.category, exc.retryable, exc.user_message

    msg = str(exc).lower()

    # Rate limits
    if "rate limit" in msg or "429" in msg or "too many requests" in msg:
        return ErrorCategory.RATE_LIMIT, True, "Service rate limit encountered. Retrying."

    # Transient network / timeout
    if any(
        k in msg
        for k in ("timeout", "connection reset", "broken pipe", "temporary failure", "econnreset")
    ):
        return (
            ErrorCategory.TRANSIENT_NETWORK,
            True,
            "Transient network timeout encountered. Retrying.",
        )

    # Schema / validation errors
    if any(
        k in msg for k in ("validationerror", "invalid schema", "missing required", "typeerror")
    ):
        return ErrorCategory.PERMANENT_VALIDATION, False, "Data validation failed."

    # Default to non-retryable system error
    return ErrorCategory.SYSTEM_ERROR, False, "An unhandled execution error occurred."


def calculate_backoff_delay(
    attempt: int,
    base_seconds: float = 1.0,
    factor: float = 2.0,
    max_backoff_seconds: float = 60.0,
    jitter: bool = True,
) -> float:
    """Calculates exponential backoff delay with full jitter: delay = min(max_backoff, base * factor^attempt) * random(0.5, 1.5)"""
    nominal = min(max_backoff_seconds, base_seconds * (factor ** max(0, attempt - 1)))
    if jitter:
        # Full jitter between 50% and 150% of nominal backoff
        nominal = nominal * random.uniform(0.5, 1.5)
    return round(nominal, 2)
