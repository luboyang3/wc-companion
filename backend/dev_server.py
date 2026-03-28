"""Lightweight local dev server that wraps the AI Lambda handler.

Usage:
    cd backend
    pip install -r requirements.txt
    python dev_server.py

Serves the /ai/chat endpoint on http://localhost:3000 so the
React Native frontend can reach it via EXPO_PUBLIC_API_GATEWAY_URL.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env", override=True)

os.environ.setdefault("AWS_DEFAULT_REGION", os.environ.get("EXPO_PUBLIC_AWS_REGION", "us-east-1"))
os.environ.setdefault("AWS_ACCESS_KEY_ID", "local-dev")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "local-dev")

sys.path.insert(0, str(Path(__file__).resolve().parent / "lambdas" / "ai"))
from handler import handler as lambda_handler  # noqa: E402
from handler import stream_handler as lambda_stream_handler  # noqa: E402

DEV_USER_ID = "dev-local-user"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def _build_lambda_event(path: str, method: str) -> dict:
    """Translate a Flask request into an API Gateway v1 proxy event."""
    headers = {k: v for k, v in request.headers}

    auth = headers.get("Authorization") or headers.get("authorization")
    if not auth:
        import base64
        payload = json.dumps({"sub": DEV_USER_ID, "email": "dev@local.test"})
        b64 = base64.urlsafe_b64encode(payload.encode()).rstrip(b"=").decode()
        fake_jwt = f"eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.{b64}.dev-signature"
        headers["Authorization"] = f"Bearer {fake_jwt}"

    return {
        "httpMethod": method,
        "path": path,
        "headers": headers,
        "body": request.get_data(as_text=True) or None,
        "queryStringParameters": request.args.to_dict() or None,
    }


@app.route("/ai/chat", methods=["POST"])
def ai_chat():
    event = _build_lambda_event("/ai/chat", "POST")
    accept = request.headers.get("Accept", "")

    if "text/event-stream" in accept:
        result = lambda_stream_handler(event, None)
        if isinstance(result, dict):
            status = result.get("statusCode", 500)
            body = json.loads(result.get("body", "{}"))
            return jsonify(body), status
        return Response(
            result,
            content_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    result = lambda_handler(event, None)
    status = result.get("statusCode", 500)
    body = json.loads(result.get("body", "{}"))
    return jsonify(body), status


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "wc-companion-dev-api"})


@app.route("/debug/player/<name>", methods=["GET"])
def debug_player(name: str):
    """Dev-only: inspect player + season stats linkage."""
    from shared.db import fetch_all, fetch_one

    pattern = f"%{name.strip()}%"
    player = fetch_one(
        "SELECT id, api_football_id, name, position FROM players WHERE name ILIKE %s LIMIT 1",
        (pattern,),
    )
    if not player:
        return jsonify({"error": f"No player matching '{name}'", "players_sample": fetch_all("SELECT id, api_football_id, name FROM players LIMIT 20")})

    pid = player["id"]
    stats = fetch_all(
        "SELECT player_id, season, goals_total, passes_key, tackles_total, duels_won, minutes_played FROM player_season_stats WHERE player_id = %s",
        (pid,),
    )
    stats_by_api_id = fetch_all(
        "SELECT player_id, season, goals_total, passes_key, tackles_total, duels_won, minutes_played FROM player_season_stats WHERE player_id = %s",
        (player["api_football_id"],),
    )
    return jsonify({
        "player": player,
        "stats_by_id": stats,
        "stats_by_api_football_id": stats_by_api_id,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WC Companion dev API server")
    parser.add_argument(
        "--log-level",
        default=os.environ.get("LOG_LEVEL", "INFO"),
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Set logging level (default: INFO, or LOG_LEVEL env var)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("DEV_API_PORT", "3000")),
        help="Port to listen on (default: 3000)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    print(f"\n  WC Companion dev API running on http://localhost:{args.port}")
    print(f"  POST http://localhost:{args.port}/ai/chat")
    print(f"  GET  http://localhost:{args.port}/health")
    print(f"  Log level: {args.log_level}\n")
    app.run(host="0.0.0.0", port=args.port, debug=True)
