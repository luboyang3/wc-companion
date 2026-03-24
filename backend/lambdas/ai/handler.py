"""AI chat Lambda handler.

Input contract:
- POST /ai/chat with JSON body:
  {
    "message": "<string>",
    "history": [{"role": "user|assistant", "content": "<string>"}],
    "language": "en|es|zh-Hans"
  }
- Authorization header with Bearer JWT.

Output contract:
- HTTP 200 with:
  {
    "message": "<assistant response>",
    "source": "sportradar|ai_knowledge"
  }
"""

from __future__ import annotations

import base64
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import boto3
import httpx

try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover - keeps local validation resilient
    Anthropic = None  # type: ignore[assignment]


dynamodb = boto3.resource("dynamodb")
profile_table_name = os.environ.get("USER_PROFILE_TABLE", "")
sportradar_api_key = os.environ.get("SPORTRADAR_API_KEY", "")
sportradar_base_url = os.environ.get(
    "SPORTRADAR_BASE_URL", "https://api.sportradar.com/soccer/production/v4"
)
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
cache_table_name = os.environ.get("CACHE_TABLE", "")

PROMPT_DIR = Path(__file__).parent / "prompts"
ALLOWED_LANGUAGES = {"en", "es", "zh-Hans"}


def _log(level: str, message: str, **kwargs: Any) -> None:
    payload = {"level": level, "message": message, **kwargs}
    print(json.dumps(payload))


def _json_response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _decode_jwt_without_verification(token: str) -> dict[str, Any]:
    """Decode JWT payload without verification for development scaffolding."""
    parts = token.split(".")
    if len(parts) != 3:
        return {}
    payload = parts[1]
    padding = "=" * (-len(payload) % 4)
    decoded = base64.urlsafe_b64decode(payload + padding).decode("utf-8")
    return json.loads(decoded)


def _get_user_id(event: dict[str, Any]) -> str | None:
    auth_header = (event.get("headers") or {}).get("authorization") or (
        event.get("headers") or {}
    ).get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.replace("Bearer ", "", 1).strip()
    claims = _decode_jwt_without_verification(token)
    return claims.get("sub")


def _get_profile(user_id: str) -> dict[str, Any]:
    if not profile_table_name:
        return {"userId": user_id}
    table = dynamodb.Table(profile_table_name)
    item = table.get_item(Key={"userId": user_id}).get("Item")
    return item or {"userId": user_id}


def _get_cached_matches() -> list[dict[str, Any]] | None:
    if not cache_table_name:
        return None
    table = dynamodb.Table(cache_table_name)
    response = table.get_item(Key={"cacheKey": "sportradar:today_matches"})
    item = response.get("Item")
    if not item:
        return None
    return item.get("value")


def _set_cached_matches(matches: list[dict[str, Any]]) -> None:
    if not cache_table_name:
        return
    table = dynamodb.Table(cache_table_name)
    table.put_item(
        Item={
            "cacheKey": "sportradar:today_matches",
            "value": matches,
            "updatedAt": datetime.now(UTC).isoformat(),
            "ttl": int(datetime.now(UTC).timestamp()) + 300,
        }
    )


def _fetch_today_matches() -> list[dict[str, Any]]:
    if not sportradar_api_key:
        return []
    url = f"{sportradar_base_url}/en/schedules/live/schedule.json"
    try:
        response = httpx.get(url, params={"api_key": sportradar_api_key}, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        return data.get("schedules", [])
    except Exception as exc:
        _log("warning", "Failed fetching Sportradar schedule", error=str(exc))
        return []


def _build_match_context() -> str:
    matches = _get_cached_matches()
    if matches is None:
        matches = _fetch_today_matches()
        if matches:
            _set_cached_matches(matches)
    if not matches:
        return "No live schedule data available."

    snippets: list[str] = []
    for match in matches[:6]:
        sport_event = match.get("sport_event", {})
        competitors = sport_event.get("competitors", [])
        if len(competitors) >= 2:
            home = competitors[0].get("name", "Home")
            away = competitors[1].get("name", "Away")
            snippets.append(f"{home} vs {away}")
    return "; ".join(snippets) if snippets else "No match summary available."


def _load_prompt_template(language: str) -> str:
    filename = f"{language if language in ALLOWED_LANGUAGES else 'en'}.txt"
    path = PROMPT_DIR / filename
    if not path.exists():
        path = PROMPT_DIR / "en.txt"
    return path.read_text(encoding="utf-8")


def _build_system_prompt(profile: dict[str, Any], match_context: str, language: str) -> str:
    template = _load_prompt_template(language)
    return template.format(
        nationality=profile.get("nationality", "unknown"),
        favorite_national_teams=", ".join(profile.get("favoriteNationalTeams", [])) or "unknown",
        favorite_club_teams=", ".join(profile.get("favoriteClubTeams", [])) or "unknown",
        years_as_fan=str(profile.get("yearsAsFan", "unknown")),
        match_context=match_context,
    )


def _invoke_claude(system_prompt: str, history: list[dict[str, str]], message: str) -> str:
    if not anthropic_api_key or Anthropic is None:
        return (
            "AI backend is in fallback mode. Connect ANTHROPIC_API_KEY to enable "
            "Claude-generated responses with live data context."
        )

    client = Anthropic(api_key=anthropic_api_key)
    messages = history + [{"role": "user", "content": message}]
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def _increment_daily_query_count(user_id: str) -> None:
    if not profile_table_name:
        return
    table = dynamodb.Table(profile_table_name)
    now_iso = datetime.now(UTC).isoformat()
    today = now_iso[:10]
    profile = table.get_item(Key={"userId": user_id}).get("Item") or {"userId": user_id}
    last_reset = str(profile.get("lastQueryReset", ""))[:10]
    current_count = int(profile.get("dailyAIQueryCount", 0))
    if today != last_reset:
        current_count = 0

    table.update_item(
        Key={"userId": user_id},
        UpdateExpression="SET dailyAIQueryCount = :count, lastQueryReset = :reset",
        ExpressionAttributeValues={":count": current_count + 1, ":reset": now_iso},
    )


def handler(event, context):
    """Generate an AI chat response with profile + match context."""
    user_id = _get_user_id(event)
    if not user_id:
        _log("warning", "Missing or invalid auth token")
        return _json_response(401, {"message": "Unauthorized"})

    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON body"})

    message = str(payload.get("message", "")).strip()
    history = payload.get("history", [])
    language = payload.get("language", "en")

    if not message:
        return _json_response(400, {"message": "message is required"})

    if not isinstance(history, list):
        return _json_response(400, {"message": "history must be a list"})

    profile = _get_profile(user_id)
    match_context = _build_match_context()
    system_prompt = _build_system_prompt(profile, match_context, str(language))
    ai_text = _invoke_claude(system_prompt, history[-10:], message)
    _increment_daily_query_count(user_id)

    source = "sportradar" if "vs" in match_context else "ai_knowledge"
    _log("info", "Generated AI response", userId=user_id, source=source)
    return _json_response(200, {"message": ai_text, "source": source})
