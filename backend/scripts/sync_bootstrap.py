"""Tier 1 — Bootstrap sync: competitions, venues, teams, players, player season stats.

Run once to cold-start the DB, then weekly as a refresh.
Total API calls per full run: ~224.

Usage:
    python backend/scripts/sync_bootstrap.py [--dry-run] [--table-name NAME] [--team-id ID]

Options:
    --table-name NAME   Run only one step: competitions, venues, teams, or players
                        (players always syncs both players and their season stats)
    --team-id ID        API-Football team ID — with --table-name players, sync
                        only this team's players and stats
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

LEAGUES = {
    # National team competitions
    1: "World Cup",
    4: "Euro Championship",
    5: "UEFA Nations League",
    6: "Africa Cup of Nations",
    7: "Asian Cup",
    9: "Copa America",
    10: "Friendlies",
    29: "WC Qualifiers - Asia",
    30: "WC Qualifiers - Europe",
    31: "WC Qualifiers - South America",
    32: "WC Qualifiers - CONCACAF",
    33: "WC Qualifiers - Oceania",
    34: "WC Qualifiers - Africa",
    # FIFA club competitions
    15: "FIFA Club World Cup",
    # UEFA club competitions
    2: "UEFA Champions League",
    3: "UEFA Europa League",
    848: "UEFA Conference League",
    # Top European leagues
    39: "Premier League",
    140: "La Liga",
    135: "Serie A",
    78: "Bundesliga",
    61: "Ligue 1",
    94: "Primeira Liga",
    88: "Eredivisie",
    179: "Scottish Premiership",
    144: "Belgian Pro League",
    203: "Super Lig",
    197: "Super League 1",
    # European domestic cups
    45: "FA Cup",
    48: "League Cup",
    143: "Copa del Rey",
    137: "Coppa Italia",
    81: "DFB Pokal",
    66: "Coupe de France",
    96: "Taca de Portugal",
    90: "KNVB Beker",
    147: "Belgian Cup",
    # CONCACAF & North America
    253: "MLS",
    262: "Liga MX",
    # Continental club cups
    12: "CAF Champions League",
    13: "Copa Libertadores",
    11: "Copa Sudamericana",
    # South American leagues
    71: "Serie A (Brazil)",
    128: "Liga Profesional (Argentina)",
    130: "Copa Argentina",
    265: "Primera Division (Chile)",
    239: "Primera A (Colombia)",
    268: "Primera Division - Apertura (Uruguay)",
    270: "Primera Division - Clausura (Uruguay)",
}

STEPS = ("competitions", "venues", "teams", "players")


def _get_team_api_ids(cur: Any) -> list[int]:
    """Return api_football_id values for national teams in the DB."""
    cur.execute("SELECT api_football_id FROM teams WHERE national = TRUE ORDER BY api_football_id")
    return [row[0] for row in cur.fetchall()]


# ------------------------------------------------------------------
# Competitions
# ------------------------------------------------------------------

def sync_competitions(*, dry_run: bool = False) -> None:
    log.info("Syncing competitions for %d leagues …", len(LEAGUES))
    total = 0

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            for league_id, label in LEAGUES.items():
                data = api.get("leagues", {"id": league_id, "season": SEASON}, dry_run=dry_run)
                if not data:
                    log.debug("No data for league %d (%s) — skipping", league_id, label)
                    continue

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
                    total += 1
        conn.commit()
    log.info("Competitions synced (%d items from %d leagues)", total, len(LEAGUES))


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
# Players + player season stats (delegates to sync_daily helpers)
# ------------------------------------------------------------------

def sync_players_and_stats(*, dry_run: bool = False, team_id: int | None = None) -> None:
    """Sync player rosters and full season stats across all competitions.

    Delegates to ``sync_daily.sync_players`` and
    ``sync_daily.sync_player_season_stats`` so the upsert logic is not
    duplicated.
    """
    from backend.scripts import sync_daily  # local import to avoid circular deps

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            if team_id:
                team_api_ids = [team_id]
                log.info("Filtering to team_id=%d", team_id)
            else:
                team_api_ids = _get_team_api_ids(cur)

        if not team_api_ids:
            log.warning("No teams in DB — run sync_bootstrap --table-name teams first")
            return

        log.info("Syncing players and season stats for %d teams …", len(team_api_ids))

        with conn.cursor() as cur:
            sync_daily.sync_players(cur, team_api_ids, dry_run=dry_run)
            conn.commit()

        with conn.cursor() as cur:
            sync_daily.sync_player_season_stats(cur, team_api_ids, dry_run=dry_run)
            conn.commit()


# ------------------------------------------------------------------
# Orchestrator
# ------------------------------------------------------------------

def run(
    *,
    dry_run: bool = False,
    table_name: str | None = None,
    team_id: int | None = None,
) -> None:
    """Run bootstrap sync steps in FK order.

    When *table_name* is given, only that step runs.  The ``players``
    step always syncs both player rosters and their season stats.
    *team_id* narrows the ``players`` step to a single team.
    """
    steps = [table_name] if table_name else list(STEPS)

    if "competitions" in steps:
        sync_competitions(dry_run=dry_run)
    if "venues" in steps:
        sync_venues(dry_run=dry_run)
    if "teams" in steps:
        sync_teams(dry_run=dry_run)
    if "players" in steps:
        sync_players_and_stats(dry_run=dry_run, team_id=team_id)

    log.info("Bootstrap sync complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log API calls without writing to DB")
    parser.add_argument(
        "--table-name",
        choices=STEPS,
        default=None,
        help="Run only this step (players always includes season stats)",
    )
    parser.add_argument(
        "--team-id",
        type=int,
        default=None,
        help="API-Football team ID — with --table-name players, sync only this team",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    run(dry_run=args.dry_run, table_name=args.table_name, team_id=args.team_id)


if __name__ == "__main__":
    main()
