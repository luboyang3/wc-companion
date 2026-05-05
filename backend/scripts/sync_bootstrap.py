"""Tier 1 — Bootstrap sync: competitions, venues, teams.

Run once to cold-start the DB, then weekly as a refresh.
Total API calls per run: ~5.

Usage:
    python backend/scripts/sync_bootstrap.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

sys.path.insert(0, str(ROOT))

from backend.shared import db  # noqa: E402
from backend.shared import api_football_client as api  # noqa: E402

log = logging.getLogger("sync_bootstrap")

WORLD_CUP_LEAGUE_ID = 1
SEASON = 2026
HOST_COUNTRIES = ("USA", "Canada", "Mexico")


# ------------------------------------------------------------------
# Competitions
# ------------------------------------------------------------------

def sync_competitions(*, dry_run: bool = False) -> None:
    log.info("Syncing competitions …")
    data = api.get("leagues", {"id": WORLD_CUP_LEAGUE_ID, "season": SEASON}, dry_run=dry_run)
    if not data:
        return

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            for item in data:
                league = item.get("league") or {}
                country = item.get("country") or {}
                seasons = item.get("seasons") or []
                season_info = seasons[0] if seasons else {}

                cur.execute(
                    """
                    INSERT INTO competitions
                        (api_football_id, name, type, country, logo_url,
                         season, start_date, end_date, coverage_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (api_football_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        type = EXCLUDED.type,
                        country = EXCLUDED.country,
                        logo_url = EXCLUDED.logo_url,
                        season = EXCLUDED.season,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        coverage_json = EXCLUDED.coverage_json,
                        updated_at = NOW()
                    """,
                    (
                        league.get("id"),
                        league.get("name"),
                        league.get("type"),
                        country.get("name"),
                        league.get("logo"),
                        SEASON,
                        season_info.get("start"),
                        season_info.get("end"),
                        json.dumps(season_info.get("coverage")) if season_info.get("coverage") else None,
                    ),
                )
        conn.commit()
    log.info("Competitions synced (%d items)", len(data))


# ------------------------------------------------------------------
# Venues
# ------------------------------------------------------------------

def sync_venues(*, dry_run: bool = False) -> None:
    log.info("Syncing venues for host countries: %s …", HOST_COUNTRIES)
    all_venues: list[dict[str, Any]] = []
    for country in HOST_COUNTRIES:
        batch = api.get("venues", {"country": country}, dry_run=dry_run)
        all_venues.extend(batch)

    if not all_venues:
        return

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            for v in all_venues:
                cur.execute(
                    """
                    INSERT INTO venues
                        (api_football_id, name, address, city, country,
                         capacity, surface, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (api_football_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        country = EXCLUDED.country,
                        capacity = EXCLUDED.capacity,
                        surface = EXCLUDED.surface,
                        image_url = EXCLUDED.image_url,
                        updated_at = NOW()
                    """,
                    (
                        v.get("id"),
                        v.get("name"),
                        v.get("address"),
                        v.get("city"),
                        v.get("country"),
                        v.get("capacity"),
                        v.get("surface"),
                        v.get("image"),
                    ),
                )
        conn.commit()
    log.info("Venues synced (%d items)", len(all_venues))


# ------------------------------------------------------------------
# Teams
# ------------------------------------------------------------------

def sync_teams(*, dry_run: bool = False) -> None:
    log.info("Syncing teams for league=%d season=%d …", WORLD_CUP_LEAGUE_ID, SEASON)
    data = api.get("teams", {"league": WORLD_CUP_LEAGUE_ID, "season": SEASON}, dry_run=dry_run)
    if not data:
        return

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            for item in data:
                team = item.get("team") or {}
                venue = item.get("venue") or {}

                cur.execute(
                    """
                    INSERT INTO teams
                        (api_football_id, name, short_name, logo_url,
                         country, founded, national)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (api_football_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        short_name = EXCLUDED.short_name,
                        logo_url = EXCLUDED.logo_url,
                        country = EXCLUDED.country,
                        founded = EXCLUDED.founded,
                        national = EXCLUDED.national,
                        updated_at = NOW()
                    RETURNING id
                    """,
                    (
                        team.get("id"),
                        team.get("name"),
                        team.get("code"),
                        team.get("logo"),
                        team.get("country"),
                        team.get("founded"),
                        team.get("national"),
                    ),
                )
                team_pk = cur.fetchone()[0]

                venue_api_id = venue.get("id")
                if venue_api_id:
                    cur.execute(
                        """
                        UPDATE teams SET home_venue_id = v.id
                        FROM venues v
                        WHERE v.api_football_id = %s AND teams.id = %s
                        """,
                        (venue_api_id, team_pk),
                    )
        conn.commit()
    log.info("Teams synced (%d items)", len(data))


# ------------------------------------------------------------------
# Orchestrator
# ------------------------------------------------------------------

def run(*, dry_run: bool = False) -> None:
    """Run all bootstrap sync steps in FK order."""
    sync_competitions(dry_run=dry_run)
    sync_venues(dry_run=dry_run)
    sync_teams(dry_run=dry_run)
    log.info("Bootstrap sync complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log API calls without writing to DB")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
