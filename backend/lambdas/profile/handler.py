"""Profile API Lambda.

Input contract:
- GET /profile: returns the current user's profile by userId from JWT.
- PUT /profile: accepts partial profile fields in JSON body and updates only provided fields.

Output contract:
- HTTP response with JSON profile body.
"""

import json
import os
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import boto3

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("USER_PROFILE_TABLE", "")

ALLOWED_FIELDS = {
    "dateOfBirth",
    "gender",
    "nationality",
    "yearsAsFan",
    "favoriteNationalTeams",
    "favoriteClubTeams",
    "language",
    "isPaidUser",
    "dailyAIQueryCount",
    "lastQueryReset",
}


def _json_response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _get_user_id(event: dict[str, Any]) -> str | None:
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    return claims.get("sub")


def _normalize_numbers(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_numbers(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_numbers(val) for key, val in value.items()}
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    return value


def _get_profile(table, user_id: str) -> dict[str, Any]:
    response = table.get_item(Key={"userId": user_id})
    item = response.get("Item")
    if item:
        return _normalize_numbers(item)
    return {"userId": user_id}


def handler(event, context):
    """Handle profile GET and PUT operations."""
    if not table_name:
        print(json.dumps({"level": "error", "message": "USER_PROFILE_TABLE is not configured"}))
        return _json_response(500, {"message": "Server configuration error"})

    user_id = _get_user_id(event)
    if not user_id:
        print(json.dumps({"level": "warning", "message": "Missing JWT user id"}))
        return _json_response(401, {"message": "Unauthorized"})

    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    table = dynamodb.Table(table_name)

    if method == "GET":
        profile = _get_profile(table, user_id)
        print(json.dumps({"level": "info", "message": "Fetched profile", "userId": user_id}))
        return _json_response(200, profile)

    if method == "PUT":
        raw_body = event.get("body") or "{}"
        payload = json.loads(raw_body)
        update_fields = {key: value for key, value in payload.items() if key in ALLOWED_FIELDS}

        if not update_fields:
            return _json_response(400, {"message": "No valid fields provided"})

        expression_attribute_names = {}
        expression_attribute_values = {":updatedAt": datetime.now(UTC).isoformat()}
        update_fragments = []

        for index, (key, value) in enumerate(update_fields.items()):
            name_key = f"#f{index}"
            value_key = f":v{index}"
            expression_attribute_names[name_key] = key
            expression_attribute_values[value_key] = value
            update_fragments.append(f"{name_key} = {value_key}")

        expression_attribute_names["#updatedAt"] = "updatedAt"
        update_expression = f"SET {', '.join(update_fragments)}, #updatedAt = :updatedAt"

        table.update_item(
            Key={"userId": user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
        )

        updated_profile = _get_profile(table, user_id)
        print(
            json.dumps(
                {
                    "level": "info",
                    "message": "Updated profile",
                    "userId": user_id,
                    "updatedKeys": list(update_fields.keys()),
                }
            )
        )
        return _json_response(200, updated_profile)

    return _json_response(405, {"message": "Method not allowed"})
