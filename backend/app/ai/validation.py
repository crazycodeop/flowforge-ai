import json
import re
from typing import Any

import jsonschema
from jsonschema.exceptions import ValidationError as JSONSchemaValidationError

from app.workflows.errors import ModelOutputInvalidError


def parse_and_clean_json(raw: Any) -> Any:
    """Parses raw text or JSON into a Python data structure, stripping markdown code blocks if present."""
    if isinstance(raw, (dict, list)):
        return raw

    if not isinstance(raw, str):
        raise ModelOutputInvalidError(
            f"Expected JSON string or dict, received {type(raw).__name__}"
        )

    text = raw.strip()

    # Strip markdown code blocks: ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as err:
        raise ModelOutputInvalidError(f"AI response is not valid JSON: {err.msg}") from err


def validate_classification_output(data: Any, allowed_categories: list[str]) -> dict[str, Any]:
    """Validates classification payload against allowed categories, ensuring type safety and confidence clamping."""
    payload = parse_and_clean_json(data)
    if not isinstance(payload, dict):
        raise ModelOutputInvalidError(
            f"Classification output must be an object, received {type(payload).__name__}"
        )

    raw_category = payload.get("category")
    if not raw_category or not isinstance(raw_category, str):
        raise ModelOutputInvalidError(
            "Classification output missing required string field 'category'"
        )

    # Case-insensitive match against allowed categories
    normalized_category: str | None = None
    for cat in allowed_categories:
        if raw_category.strip().lower() == cat.strip().lower():
            normalized_category = cat
            break

    if not normalized_category:
        raise ModelOutputInvalidError(
            f"Classification returned '{raw_category}', which is not in allowed categories: {allowed_categories}"
        )

    # Validate or default confidence
    raw_confidence = payload.get("confidence", 0.90)
    try:
        confidence = float(raw_confidence)
        confidence = max(0.0, min(1.0, confidence))
    except (ValueError, TypeError):
        confidence = 0.85

    reasoning = str(payload.get("reasoning", "")).strip()

    return {
        "category": normalized_category,
        "confidence": round(confidence, 4),
        "reasoning": reasoning or "Classified by AI model",
    }


def validate_structured_output(data: Any, schema: dict[str, Any]) -> dict[str, Any]:
    """Validates structured JSON payload against the provided JSON Schema."""
    payload = parse_and_clean_json(data)

    if not isinstance(payload, (dict, list)):
        raise ModelOutputInvalidError(
            f"Expected structured object or array, received {type(payload).__name__}"
        )

    try:
        jsonschema.validate(instance=payload, schema=schema)
    except JSONSchemaValidationError as err:
        path = " -> ".join(str(p) for p in err.absolute_path) or "root"
        raise ModelOutputInvalidError(
            f"Structured output schema validation failed: {err.message} at path '{path}'"
        ) from err

    return payload if isinstance(payload, dict) else {"items": payload}
