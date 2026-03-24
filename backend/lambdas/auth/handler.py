"""Cognito post-confirmation trigger for user bootstrap profile.

Input contract:
- event: AWS Cognito trigger payload containing user attributes
- context: Lambda context object

Output contract:
- returns original event object for Cognito to continue flow
"""

import json
import os
from datetime import UTC, datetime

import boto3

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("USER_PROFILE_TABLE", "")


def handler(event, context):
    """Create a blank user profile after successful user confirmation."""
    if not table_name:
        print(json.dumps({"level": "error", "message": "USER_PROFILE_TABLE is not configured"}))
        return event

    user_id = event.get("request", {}).get("userAttributes", {}).get("sub")
    email = event.get("request", {}).get("userAttributes", {}).get("email")

    if not user_id:
        print(json.dumps({"level": "warning", "message": "Missing Cognito user sub"}))
        return event

    now = datetime.now(UTC).isoformat()
    item = {
        "userId": user_id,
        "email": email,
        "createdAt": now,
        "updatedAt": now,
    }

    table = dynamodb.Table(table_name)
    table.put_item(
        Item=item,
        ConditionExpression="attribute_not_exists(userId)",
    )

    print(json.dumps({"level": "info", "message": "Created profile record", "userId": user_id}))
    return event
