"""Lightweight local dev server that wraps the AI Lambda handler.

Usage:
    cd backend
    pip install -r requirements.txt
    python dev_server.py

Serves the /ai/chat endpoint on http://localhost:3000 so the
React Native frontend can reach it via EXPO_PUBLIC_API_GATEWAY_URL.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

os.environ.setdefault("AWS_DEFAULT_REGION", os.environ.get("EXPO_PUBLIC_AWS_REGION", "us-east-1"))
os.environ.setdefault("AWS_ACCESS_KEY_ID", "local-dev")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "local-dev")

sys.path.insert(0, str(Path(__file__).resolve().parent / "lambdas" / "ai"))
from handler import handler as lambda_handler  # noqa: E402

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
    result = lambda_handler(event, None)
    status = result.get("statusCode", 500)
    body = json.loads(result.get("body", "{}"))
    return jsonify(body), status


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "wc-companion-dev-api"})


if __name__ == "__main__":
    port = int(os.environ.get("DEV_API_PORT", "3000"))
    print(f"\n  WC Companion dev API running on http://localhost:{port}")
    print(f"  POST http://localhost:{port}/ai/chat")
    print(f"  GET  http://localhost:{port}/health\n")
    app.run(host="0.0.0.0", port=port, debug=True)
