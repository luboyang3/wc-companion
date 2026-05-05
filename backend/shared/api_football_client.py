"""Shared API-Football v3 HTTP client with rate limiting, retry, and pagination."""

from __future__ import annotations

import logging
import os
import time
import threading
from collections import deque
from typing import Any

import requests

log = logging.getLogger("api_football")

DEFAULT_BASE_URL = "https://v3.football.api-sports.io"
MAX_RETRIES = 3
BACKOFF_FACTORS = (1, 2, 4)
RETRYABLE_STATUS_CODES = {429, 499, 500, 502, 503}
SLIDING_WINDOW_SECONDS = 60
CALLS_PER_MINUTE = 290  # leave 10-call buffer under 300/min Pro limit


class QuotaExhaustedError(Exception):
    """Raised when the daily API quota reaches zero."""


class APIFootballError(Exception):
    """Raised when the API response contains errors."""


class _RateLimiter:
    """Thread-safe sliding-window rate limiter."""

    def __init__(self, max_calls: int = CALLS_PER_MINUTE, window: int = SLIDING_WINDOW_SECONDS):
        self._max_calls = max_calls
        self._window = window
        self._timestamps: deque[float] = deque()
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            while self._timestamps and self._timestamps[0] <= now - self._window:
                self._timestamps.popleft()
            if len(self._timestamps) >= self._max_calls:
                sleep_for = self._window - (now - self._timestamps[0]) + 0.1
                log.debug("Rate limiter sleeping %.1fs", sleep_for)
                time.sleep(max(sleep_for, 0.1))
            self._timestamps.append(time.monotonic())


_rate_limiter = _RateLimiter()
_daily_remaining: int | None = None
_daily_remaining_lock = threading.Lock()


def _update_quota(headers: dict[str, str]) -> None:
    """Track daily quota from response headers."""
    global _daily_remaining
    raw = headers.get("x-ratelimit-requests-remaining")
    if raw is None:
        return
    try:
        remaining = int(raw)
    except (TypeError, ValueError):
        return

    with _daily_remaining_lock:
        _daily_remaining = remaining

    if remaining == 0:
        raise QuotaExhaustedError("API-Football daily quota exhausted (0 remaining)")
    daily_limit_str = headers.get("x-ratelimit-requests-limit", "7500")
    try:
        daily_limit = int(daily_limit_str)
    except (TypeError, ValueError):
        daily_limit = 7500
    if daily_limit > 0 and remaining / daily_limit < 0.20:
        log.warning(
            "API-Football quota low: %d/%d remaining (%.0f%%)",
            remaining, daily_limit, remaining / daily_limit * 100,
        )


def get(
    endpoint: str,
    params: dict[str, Any] | None = None,
    *,
    dry_run: bool = False,
) -> list[Any]:
    """Call an API-Football endpoint and return the ``response`` payload.

    Handles rate limiting, retries with backoff, quota tracking, and error
    extraction.  Returns the list stored under the ``"response"`` key.
    """
    base_url = os.environ.get("API_FOOTBALL_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    api_key = os.environ.get("API_FOOTBALL_KEY", "").strip()
    if not api_key:
        raise RuntimeError("API_FOOTBALL_KEY environment variable is required")

    url = f"{base_url}/{endpoint.lstrip('/')}"

    if dry_run:
        log.info("[DRY-RUN] GET %s params=%s", url, params)
        return []

    headers = {"x-apisports-key": api_key}
    last_exc: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        _rate_limiter.wait()
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=45)
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_FACTORS[attempt])
                continue
            raise

        _update_quota(resp.headers)

        if resp.status_code in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
            wait = BACKOFF_FACTORS[attempt]
            log.warning(
                "HTTP %d from %s — retrying in %ds (attempt %d/%d)",
                resp.status_code, endpoint, wait, attempt + 1, MAX_RETRIES,
            )
            time.sleep(wait)
            continue

        resp.raise_for_status()

        payload = resp.json()
        errors = payload.get("errors")
        if errors and (isinstance(errors, list) and errors or isinstance(errors, dict) and errors):
            raise APIFootballError(f"API errors from {endpoint}: {errors}")

        return payload.get("response") or []

    raise last_exc or RuntimeError(f"All {MAX_RETRIES} retries exhausted for {endpoint}")


def get_all_pages(
    endpoint: str,
    params: dict[str, Any] | None = None,
    *,
    dry_run: bool = False,
    max_pages: int = 50,
) -> list[Any]:
    """Fetch all pages from a paginated endpoint, concatenating results."""
    params = dict(params or {})
    all_results: list[Any] = []
    page = 1

    while True:
        params["page"] = page

        base_url = os.environ.get("API_FOOTBALL_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        api_key = os.environ.get("API_FOOTBALL_KEY", "").strip()
        if not api_key:
            raise RuntimeError("API_FOOTBALL_KEY environment variable is required")

        url = f"{base_url}/{endpoint.lstrip('/')}"

        if dry_run:
            log.info("[DRY-RUN] GET %s params=%s", url, params)
            return all_results

        headers_req = {"x-apisports-key": api_key}
        last_exc: Exception | None = None
        payload: dict[str, Any] = {}

        for attempt in range(MAX_RETRIES + 1):
            _rate_limiter.wait()
            try:
                resp = requests.get(url, headers=headers_req, params=params, timeout=45)
            except requests.RequestException as exc:
                last_exc = exc
                if attempt < MAX_RETRIES:
                    time.sleep(BACKOFF_FACTORS[attempt])
                    continue
                raise

            _update_quota(resp.headers)

            if resp.status_code in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
                time.sleep(BACKOFF_FACTORS[attempt])
                continue

            resp.raise_for_status()
            payload = resp.json()

            errors = payload.get("errors")
            if errors and (isinstance(errors, list) and errors or isinstance(errors, dict) and errors):
                raise APIFootballError(f"API errors from {endpoint}: {errors}")
            break
        else:
            raise last_exc or RuntimeError(f"All retries exhausted for {endpoint} page {page}")

        batch = payload.get("response") or []
        all_results.extend(batch)

        paging = payload.get("paging") or {}
        try:
            total_pages = int(paging.get("total") or 1)
        except (TypeError, ValueError):
            total_pages = 1

        if page >= total_pages or page >= max_pages or not batch:
            break
        page += 1
        time.sleep(0.3)

    return all_results
