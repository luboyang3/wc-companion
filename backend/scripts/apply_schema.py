"""One-off: apply backend/db/schema.sql using DATABASE_URL from project root .env."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def main() -> None:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        sys.exit("DATABASE_URL missing in .env")
    sslmode = os.environ.get("DB_SSLMODE", "require").strip()
    schema_path = ROOT / "backend" / "db" / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    conn = psycopg2.connect(url, connect_timeout=15, sslmode=sslmode)
    conn.autocommit = True
    cur = conn.cursor()
    n = 0
    for raw in sql.split(";"):
        stmt = raw.strip()
        if not stmt:
            continue
        cur.execute(stmt + ";")
        n += 1
    cur.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    )
    tables = [r[0] for r in cur.fetchall()]
    cur.close()
    conn.close()
    print(f"Executed {n} statements from {schema_path}")
    print("public tables:", ", ".join(tables))


if __name__ == "__main__":
    main()
