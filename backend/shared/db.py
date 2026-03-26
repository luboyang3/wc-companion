"""Shared PostgreSQL helpers for backend services."""

from __future__ import annotations

import os
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from psycopg2 import pool
from psycopg2.extras import RealDictCursor

_pool_lock = threading.Lock()
_connection_pool: pool.SimpleConnectionPool | None = None


def _normalize_database_url(url: str) -> str:
    # Some providers use postgres://; psycopg2 expects postgresql://.
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def get_connection_pool() -> pool.SimpleConnectionPool:
    """Create (once) and return a reusable connection pool."""
    global _connection_pool

    if _connection_pool is not None:
        return _connection_pool

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required")

    minconn = max(1, int(os.environ.get("DB_POOL_MIN", "1")))
    maxconn = max(minconn, int(os.environ.get("DB_POOL_MAX", "5")))

    with _pool_lock:
        if _connection_pool is None:
            _connection_pool = pool.SimpleConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=_normalize_database_url(database_url),
                connect_timeout=5,
                sslmode=os.environ.get("DB_SSLMODE", "prefer"),
            )

    return _connection_pool


@contextmanager
def get_db_connection() -> Iterator[Any]:
    """Yield a pooled connection and always return it."""
    conn_pool = get_connection_pool()
    conn = conn_pool.getconn()
    try:
        yield conn
    finally:
        conn_pool.putconn(conn)


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    """Run a SELECT query and return rows as dictionaries."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    """Run a SELECT query and return a single row."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
    return dict(row) if row else None
