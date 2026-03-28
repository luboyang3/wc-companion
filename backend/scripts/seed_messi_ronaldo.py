"""Upsert Lionel Messi and Cristiano Ronaldo into players (no external API).

Uses API-Football-style player ids (154, 874) so rows align with that ecosystem later.
Requires DATABASE_URL in project root .env.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

# Public profile-style fields; api_football_id matches common API-Football ids.
SAMPLE_PLAYERS: tuple[tuple, ...] = (
    (
        154,
        "Lionel Messi",
        "Lionel",
        "Messi",
        "Argentina",
        "Attacker",
        "1987-06-24",
        "170 cm",
        "72 kg",
        "https://media.api-sports.io/football/players/154.png",
        None,
    ),
    (
        874,
        "Cristiano Ronaldo",
        "Cristiano",
        "Ronaldo",
        "Portugal",
        "Attacker",
        "1985-02-05",
        "187 cm",
        "83 kg",
        "https://media.api-sports.io/football/players/874.png",
        None,
    ),
)

SQL = """
INSERT INTO players (
    api_football_id, name, firstname, lastname, nationality,
    position, date_of_birth, height, weight, photo_url, team_id
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (api_football_id) DO UPDATE SET
    name = EXCLUDED.name,
    firstname = EXCLUDED.firstname,
    lastname = EXCLUDED.lastname,
    nationality = EXCLUDED.nationality,
    position = EXCLUDED.position,
    date_of_birth = EXCLUDED.date_of_birth,
    height = EXCLUDED.height,
    weight = EXCLUDED.weight,
    photo_url = EXCLUDED.photo_url,
    team_id = EXCLUDED.team_id,
    updated_at = NOW()
"""


def main() -> None:
    db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not db_url:
        sys.exit("DATABASE_URL missing in .env")

    sslmode = (os.environ.get("DB_SSLMODE") or "require").strip()
    conn = psycopg2.connect(db_url, connect_timeout=15, sslmode=sslmode)
    try:
        cur = conn.cursor()
        for row in SAMPLE_PLAYERS:
            cur.execute(SQL, row)
        conn.commit()
        cur.close()
        print("Upserted 2 players: Lionel Messi (api_football_id=154), Cristiano Ronaldo (874).")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
