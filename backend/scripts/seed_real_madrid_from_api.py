"""Fetch Real Madrid's squad from API-Sports (API-Football) and upsert teams + players.

Default team id is 541 (Real Madrid in La Liga on api-football). Override with --team if needed.

Requires in project root .env:
  API_FOOTBALL_KEY
  DATABASE_URL
Optional: API_FOOTBALL_BASE_URL, DB_SSLMODE, API_FOOTBALL_MAX_PAGE (default 3 — free API tier page limit)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

import psycopg2
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DEFAULT_BASE = "https://v3.football.api-sports.io"
# Real Madrid CF — La Liga; verify at https://dashboard.api-football.com/ if this ever drifts
REAL_MADRID_API_TEAM_ID = 541
DEFAULT_SEASON = 2024
# API-Football free tier allows page 1–3 only; raise via env for paid plans.
DEFAULT_MAX_PAGES = int(os.environ.get("API_FOOTBALL_MAX_PAGE", "3"))


def _clip(s: str | None, max_len: int) -> str | None:
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    return s[:max_len] if len(s) > max_len else s


def _parse_dob(raw: Any) -> str | None:
    if not raw or not isinstance(raw, dict):
        return None
    d = raw.get("date")
    if not d or not isinstance(d, str):
        return None
    return d[:10] if len(d) >= 10 else None


def fetch_squad(
    base_url: str,
    api_key: str,
    team_id: int,
    season: int,
    max_pages: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    headers = {"x-apisports-key": api_key}
    base = base_url.rstrip("/")
    url = f"{base}/players"
    all_rows: list[dict[str, Any]] = []
    team_meta: dict[str, Any] | None = None
    page = 1
    while True:
        r = requests.get(
            url,
            headers=headers,
            params={"team": team_id, "season": season, "page": page},
            timeout=45,
        )
        r.raise_for_status()
        payload = r.json()

        errs = payload.get("errors")
        if errs:
            raise RuntimeError(f"API errors: {errs}")

        paging = payload.get("paging") or {}
        try:
            total_pages = int(paging.get("total") or 1)
        except (TypeError, ValueError):
            total_pages = 1

        batch = payload.get("response") or []
        if not batch and page == 1:
            raise RuntimeError(
                f"No players for team={team_id} season={season}. "
                "Try --season 2023 or check your API plan / team id."
            )

        for row in batch:
            if team_meta is None:
                stats = row.get("statistics") or []
                if stats and isinstance(stats[0], dict):
                    t = stats[0].get("team")
                    if isinstance(t, dict) and t.get("id"):
                        team_meta = t
            all_rows.append(row)

        if not batch:
            break
        last_page = min(total_pages, max_pages)
        if page >= last_page:
            break
        page += 1

    if team_meta is None:
        raise RuntimeError("Could not read team from API response.")

    tid = int(team_meta["id"])
    tr = requests.get(
        f"{base}/teams",
        headers=headers,
        params={"id": tid},
        timeout=30,
    )
    if tr.ok:
        tj = tr.json()
        trows = tj.get("response") or []
        if trows and isinstance(trows[0], dict):
            detail = trows[0].get("team")
            if isinstance(detail, dict):
                team_meta = {**team_meta, **detail}

    return team_meta, all_rows


def upsert_team(cur: Any, team: dict[str, Any]) -> int:
    tid = int(team["id"])
    name = _clip(team.get("name"), 100) or f"Team {tid}"
    short = _clip(team.get("code"), 20)
    logo = _clip(team.get("logo"), 2000)
    country = _clip(team.get("country"), 100)
    founded = team.get("founded")
    try:
        founded_i = int(founded) if founded is not None else None
    except (TypeError, ValueError):
        founded_i = None

    cur.execute(
        """
        INSERT INTO teams (api_football_id, name, short_name, logo_url, country, founded)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (api_football_id) DO UPDATE SET
            name = EXCLUDED.name,
            short_name = EXCLUDED.short_name,
            logo_url = EXCLUDED.logo_url,
            country = EXCLUDED.country,
            founded = EXCLUDED.founded,
            updated_at = NOW()
        RETURNING id
        """,
        (tid, name, short, logo, country, founded_i),
    )
    return int(cur.fetchone()[0])


def upsert_player(
    cur: Any,
    player_blob: dict[str, Any],
    statistics: list[dict[str, Any]],
    team_pk: int,
) -> None:
    p = player_blob
    pid = int(p["id"])
    name = _clip(p.get("name"), 100) or f"Player {pid}"
    first = _clip(p.get("firstname"), 100)
    last = _clip(p.get("lastname"), 100)
    nationality = _clip(p.get("nationality"), 100)
    height = _clip(p.get("height"), 10)
    weight = _clip(p.get("weight"), 10)
    photo = _clip(p.get("photo"), 2000)
    dob = _parse_dob(p.get("birth"))

    position = None
    if statistics:
        g = statistics[0].get("games") if isinstance(statistics[0], dict) else None
        if isinstance(g, dict):
            position = _clip(g.get("position"), 50)

    cur.execute(
        """
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
        """,
        (pid, name, first, last, nationality, position, dob, height, weight, photo, team_pk),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--team",
        type=int,
        default=REAL_MADRID_API_TEAM_ID,
        help="API-Football team id (default: Real Madrid)",
    )
    parser.add_argument("--season", type=int, default=DEFAULT_SEASON)
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Max API page to fetch (default: API_FOOTBALL_MAX_PAGE env or 3; free tier allows up to 3)",
    )
    args = parser.parse_args()

    api_key = (os.environ.get("API_FOOTBALL_KEY") or "").strip()
    if not api_key:
        sys.exit("Set API_FOOTBALL_KEY in .env (https://www.api-football.com/).")

    db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not db_url:
        sys.exit("DATABASE_URL missing in .env")

    sslmode = (os.environ.get("DB_SSLMODE") or "require").strip()
    base = (os.environ.get("API_FOOTBALL_BASE_URL") or DEFAULT_BASE).strip()

    max_pages = args.max_pages if args.max_pages is not None else DEFAULT_MAX_PAGES
    team_meta, rows = fetch_squad(base, api_key, args.team, args.season, max_pages)

    conn = psycopg2.connect(db_url, connect_timeout=15, sslmode=sslmode)
    try:
        cur = conn.cursor()
        team_pk = upsert_team(cur, team_meta)
        n = 0
        for row in rows:
            p = row.get("player")
            stats = row.get("statistics") or []
            if not isinstance(p, dict) or "id" not in p:
                continue
            upsert_player(cur, p, stats if isinstance(stats, list) else [], team_pk)
            n += 1
        conn.commit()
        cur.close()
        print(
            f"Upserted team {team_meta.get('name')} (api_football_id={team_meta.get('id')}) "
            f"and {n} players for season {args.season}."
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
