"""Tier 2 — Daily sync: fixtures, coaches, players, player_season_stats, injuries.

Run once per day (06:00 UTC).  Total API calls per run: ~242.

Usage:
    python backend/scripts/sync_daily.py [--dry-run] [--team-id ID] [--fixture-id ID]

Options:
    --team-id ID      API-Football team ID — sync only this team's data
    --fixture-id ID   API-Football fixture ID — sync only this fixture
"""

from __future__ import annotations

import argparse
import logging
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

sys.path.insert(0, str(ROOT))

from backend.shared import db  # noqa: E402
from backend.shared import api_football_client as api  # noqa: E402

log = logging.getLogger("sync_daily")

WORLD_CUP_LEAGUE_ID = 1
SEASON = 2026


def _safe_int(val: Any) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _safe_decimal(val: Any) -> Decimal | None:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _resolve_team_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM teams WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _ensure_team(
    cur: Any,
    team_info: dict[str, Any],
    cache: dict[int, int],
) -> int | None:
    """Return teams.id for an API-Football team, auto-inserting if absent.

    Uses *cache* (api_football_id -> PK) to skip the DB entirely for
    teams already seen in this sync run.
    """
    api_id = team_info.get("id")
    if not api_id:
        return None
    if api_id in cache:
        return cache[api_id]
    cur.execute(
        """
        INSERT INTO teams (api_football_id, name, logo_url, national)
        VALUES (%s, %s, %s, FALSE)
        ON CONFLICT (api_football_id) DO UPDATE SET updated_at = NOW()
        RETURNING id
        """,
        (api_id, team_info.get("name"), team_info.get("logo")),
    )
    pk = cur.fetchone()[0]
    cache[api_id] = pk
    return pk


def _resolve_player_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM players WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_competition_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM competitions WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_fixture_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM fixtures WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_venue_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM venues WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _get_team_api_ids(cur: Any) -> list[int]:
    """Return api_football_id values for national teams in the DB."""
    cur.execute("SELECT api_football_id FROM teams WHERE national = TRUE ORDER BY api_football_id")
    return [row[0] for row in cur.fetchall()]


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

def sync_fixtures(
    cur: Any,
    *,
    dry_run: bool = False,
    team_id: int | None = None,
    fixture_id: int | None = None,
) -> None:
    log.info("Syncing fixtures …")
    if fixture_id:
        params: dict[str, Any] = {"id": fixture_id}
    else:
        params = {"league": WORLD_CUP_LEAGUE_ID, "season": SEASON}
        if team_id:
            params["team"] = team_id
    data = api.get("fixtures", params, dry_run=dry_run)
    count = 0
    for item in data:
        fix = item.get("fixture") or {}
        league = item.get("league") or {}
        teams = item.get("teams") or {}
        goals = item.get("goals") or {}
        score = item.get("score") or {}
        venue = fix.get("venue") or {}
        status = fix.get("status") or {}
        ht = score.get("halftime") or {}
        et = score.get("extratime") or {}
        pen = score.get("penalty") or {}

        home_team = teams.get("home") or {}
        away_team = teams.get("away") or {}

        home_team_pk = _resolve_team_id(cur, home_team.get("id"))
        away_team_pk = _resolve_team_id(cur, away_team.get("id"))
        comp_pk = _resolve_competition_id(cur, league.get("id"))
        venue_pk = _resolve_venue_id(cur, venue.get("id"))

        cur.execute(
            """
            INSERT INTO fixtures
                (api_football_id, competition_id, home_team_id, away_team_id,
                 venue_id, kickoff_time, kickoff_timestamp, round_label,
                 status, status_short, status_long, status_elapsed, status_extra,
                 home_score, away_score,
                 ht_home, ht_away, et_home, et_away, pen_home, pen_away,
                 venue_name, referee)
            VALUES (%s,%s,%s,%s,%s,
                    to_timestamp(%s), %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s)
            ON CONFLICT (api_football_id) DO UPDATE SET
                competition_id   = EXCLUDED.competition_id,
                home_team_id     = EXCLUDED.home_team_id,
                away_team_id     = EXCLUDED.away_team_id,
                venue_id         = EXCLUDED.venue_id,
                kickoff_time     = EXCLUDED.kickoff_time,
                kickoff_timestamp = EXCLUDED.kickoff_timestamp,
                round_label      = EXCLUDED.round_label,
                status           = EXCLUDED.status,
                status_short     = EXCLUDED.status_short,
                status_long      = EXCLUDED.status_long,
                status_elapsed   = EXCLUDED.status_elapsed,
                status_extra     = EXCLUDED.status_extra,
                home_score       = EXCLUDED.home_score,
                away_score       = EXCLUDED.away_score,
                ht_home          = EXCLUDED.ht_home,
                ht_away          = EXCLUDED.ht_away,
                et_home          = EXCLUDED.et_home,
                et_away          = EXCLUDED.et_away,
                pen_home         = EXCLUDED.pen_home,
                pen_away         = EXCLUDED.pen_away,
                venue_name       = EXCLUDED.venue_name,
                referee          = EXCLUDED.referee,
                updated_at       = NOW()
            """,
            (
                fix.get("id"),
                comp_pk,
                home_team_pk,
                away_team_pk,
                venue_pk,
                fix.get("timestamp"),
                fix.get("timestamp"),
                league.get("round"),
                status.get("short"),
                status.get("short"),
                status.get("long"),
                _safe_int(status.get("elapsed")),
                _safe_int(status.get("extra")),
                _safe_int(goals.get("home")),
                _safe_int(goals.get("away")),
                _safe_int(ht.get("home")),
                _safe_int(ht.get("away")),
                _safe_int(et.get("home")),
                _safe_int(et.get("away")),
                _safe_int(pen.get("home")),
                _safe_int(pen.get("away")),
                venue.get("name"),
                fix.get("referee"),
            ),
        )
        count += 1
    log.info("Fixtures synced (%d)", count)


# ------------------------------------------------------------------
# Coaches
# ------------------------------------------------------------------

def sync_coaches(cur: Any, team_api_ids: list[int], *, dry_run: bool = False) -> None:
    log.info("Syncing coaches for %d teams …", len(team_api_ids))
    count = 0
    for team_api_id in team_api_ids:
        data = api.get("coachs", {"team": team_api_id}, dry_run=dry_run)
        for item in data:
            birth = item.get("birth") or {}
            team_info = item.get("team") or {}
            team_pk = _resolve_team_id(cur, team_info.get("id"))

            cur.execute(
                """
                INSERT INTO coaches
                    (api_football_id, name, firstname, lastname,
                     date_of_birth, nationality, photo_url, team_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (api_football_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    firstname = EXCLUDED.firstname,
                    lastname = EXCLUDED.lastname,
                    date_of_birth = EXCLUDED.date_of_birth,
                    nationality = EXCLUDED.nationality,
                    photo_url = EXCLUDED.photo_url,
                    team_id = EXCLUDED.team_id,
                    updated_at = NOW()
                """,
                (
                    item.get("id"),
                    item.get("name"),
                    item.get("firstname"),
                    item.get("lastname"),
                    birth.get("date"),
                    item.get("nationality"),
                    item.get("photo"),
                    team_pk,
                ),
            )
            count += 1
    log.info("Coaches synced (%d)", count)


# ------------------------------------------------------------------
# Players (from /players/squads — roster only, no stats)
# ------------------------------------------------------------------

def sync_players(cur: Any, team_api_ids: list[int], *, dry_run: bool = False) -> None:
    log.info("Syncing player rosters for %d teams …", len(team_api_ids))
    count = 0
    for team_api_id in team_api_ids:
        data = api.get("players/squads", {"team": team_api_id}, dry_run=dry_run)
        for squad_block in data:
            team_info = squad_block.get("team") or {}
            team_pk = _resolve_team_id(cur, team_info.get("id"))
            players = squad_block.get("players") or []
            for p in players:
                cur.execute(
                    """
                    INSERT INTO players
                        (api_football_id, name, position, photo_url, team_id)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (api_football_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        position = COALESCE(EXCLUDED.position, players.position),
                        photo_url = EXCLUDED.photo_url,
                        team_id = EXCLUDED.team_id,
                        updated_at = NOW()
                    """,
                    (
                        p.get("id"),
                        p.get("name"),
                        p.get("position"),
                        p.get("photo"),
                        team_pk,
                    ),
                )
                count += 1
    log.info("Players synced (%d)", count)


# ------------------------------------------------------------------
# Player season stats (from /players — paginated, with full stats)
# ------------------------------------------------------------------

def sync_player_season_stats(
    cur: Any,
    team_api_ids: list[int],
    *,
    dry_run: bool = False,
    league_filter: int | None = None,
) -> None:
    """Sync player season stats.

    When *league_filter* is set, only stat blocks for that league are
    upserted (used by daily sync to restrict to WC).  When ``None``,
    all competitions are upserted (used by bootstrap for full stats).
    """
    log.info("Syncing player season stats for %d teams …", len(team_api_ids))
    team_cache: dict[int, int] = {}
    count = 0
    for team_api_id in team_api_ids:
        data = api.get_all_pages(
            "players",
            {"team": team_api_id, "season": SEASON},
            dry_run=dry_run,
        )
        for item in data:
            player_blob = item.get("player") or {}
            player_api_id = player_blob.get("id")
            player_pk = _resolve_player_id(cur, player_api_id)
            if not player_pk:
                continue

            for stat_block in item.get("statistics") or []:
                league_info = stat_block.get("league") or {}
                if league_filter is not None and league_info.get("id") != league_filter:
                    continue
                team_info = stat_block.get("team") or {}
                comp_pk = _resolve_competition_id(cur, league_info.get("id"))
                stat_team_pk = _ensure_team(cur, team_info, team_cache)

                games = stat_block.get("games") or {}
                subs = stat_block.get("substitutes") or {}
                shots = stat_block.get("shots") or {}
                goals = stat_block.get("goals") or {}
                passes = stat_block.get("passes") or {}
                tackles = stat_block.get("tackles") or {}
                duels = stat_block.get("duels") or {}
                dribbles = stat_block.get("dribbles") or {}
                fouls = stat_block.get("fouls") or {}
                cards = stat_block.get("cards") or {}
                penalty = stat_block.get("penalty") or {}

                cur.execute(
                    """
                    INSERT INTO player_season_stats
                        (player_id, competition_id, team_id, season,
                         appearances, lineups, minutes_played, position, rating, captain,
                         subs_in, subs_out, bench,
                         shots_total, shots_on_target,
                         goals_total, goals_conceded, goal_assists, goal_saves,
                         passes_total, passes_key, passes_accuracy,
                         tackles_total, tackles_blocks, interceptions,
                         duels_total, duels_won,
                         dribbles_attempts, dribbles_success,
                         fouls_drawn, fouls_committed,
                         yellow_cards, yellow_red_cards, red_cards,
                         penalty_won, penalty_committed, penalty_scored,
                         penalty_missed, penalty_saved,
                         last_synced_at)
                    VALUES (
                        %s,%s,%s,%s,
                        %s,%s,%s,%s,%s,%s,
                        %s,%s,%s,
                        %s,%s,
                        %s,%s,%s,%s,
                        %s,%s,%s,
                        %s,%s,%s,
                        %s,%s,
                        %s,%s,
                        %s,%s,
                        %s,%s,%s,
                        %s,%s,%s,%s,%s,
                        NOW())
                    ON CONFLICT (player_id, competition_id, team_id, season) DO UPDATE SET
                        appearances      = EXCLUDED.appearances,
                        lineups          = EXCLUDED.lineups,
                        minutes_played   = EXCLUDED.minutes_played,
                        position         = EXCLUDED.position,
                        rating           = EXCLUDED.rating,
                        captain          = EXCLUDED.captain,
                        subs_in          = EXCLUDED.subs_in,
                        subs_out         = EXCLUDED.subs_out,
                        bench            = EXCLUDED.bench,
                        shots_total      = EXCLUDED.shots_total,
                        shots_on_target  = EXCLUDED.shots_on_target,
                        goals_total      = EXCLUDED.goals_total,
                        goals_conceded   = EXCLUDED.goals_conceded,
                        goal_assists     = EXCLUDED.goal_assists,
                        goal_saves       = EXCLUDED.goal_saves,
                        passes_total     = EXCLUDED.passes_total,
                        passes_key       = EXCLUDED.passes_key,
                        passes_accuracy  = EXCLUDED.passes_accuracy,
                        tackles_total    = EXCLUDED.tackles_total,
                        tackles_blocks   = EXCLUDED.tackles_blocks,
                        interceptions    = EXCLUDED.interceptions,
                        duels_total      = EXCLUDED.duels_total,
                        duels_won        = EXCLUDED.duels_won,
                        dribbles_attempts = EXCLUDED.dribbles_attempts,
                        dribbles_success = EXCLUDED.dribbles_success,
                        fouls_drawn      = EXCLUDED.fouls_drawn,
                        fouls_committed  = EXCLUDED.fouls_committed,
                        yellow_cards     = EXCLUDED.yellow_cards,
                        yellow_red_cards = EXCLUDED.yellow_red_cards,
                        red_cards        = EXCLUDED.red_cards,
                        penalty_won      = EXCLUDED.penalty_won,
                        penalty_committed = EXCLUDED.penalty_committed,
                        penalty_scored   = EXCLUDED.penalty_scored,
                        penalty_missed   = EXCLUDED.penalty_missed,
                        penalty_saved    = EXCLUDED.penalty_saved,
                        last_synced_at   = NOW()
                    """,
                    (
                        player_pk, comp_pk, stat_team_pk, SEASON,
                        # Note: API typo "appearences"
                        _safe_int(games.get("appearences")),
                        _safe_int(games.get("lineups")),
                        _safe_int(games.get("minutes")),
                        games.get("position"),
                        _safe_decimal(games.get("rating")),
                        games.get("captain"),
                        _safe_int(subs.get("in")),
                        _safe_int(subs.get("out")),
                        _safe_int(subs.get("bench")),
                        _safe_int(shots.get("total")),
                        _safe_int(shots.get("on")),
                        _safe_int(goals.get("total")),
                        _safe_int(goals.get("conceded")),
                        _safe_int(goals.get("assists")),
                        _safe_int(goals.get("saves")),
                        _safe_int(passes.get("total")),
                        _safe_int(passes.get("key")),
                        _safe_int(passes.get("accuracy")),
                        _safe_int(tackles.get("total")),
                        _safe_int(tackles.get("blocks")),
                        _safe_int(tackles.get("interceptions")),
                        _safe_int(duels.get("total")),
                        _safe_int(duels.get("won")),
                        _safe_int(dribbles.get("attempts")),
                        _safe_int(dribbles.get("success")),
                        _safe_int(fouls.get("drawn")),
                        _safe_int(fouls.get("committed")),
                        _safe_int(cards.get("yellow")),
                        _safe_int(cards.get("yellowred")),
                        _safe_int(cards.get("red")),
                        _safe_int(penalty.get("won")),
                        # Note: API typo "commited"
                        _safe_int(penalty.get("commited")),
                        _safe_int(penalty.get("scored")),
                        _safe_int(penalty.get("missed")),
                        _safe_int(penalty.get("saved")),
                    ),
                )
                count += 1
    log.info("Player season stats synced (%d rows)", count)


# ------------------------------------------------------------------
# Injuries (delete-and-replace)
# ------------------------------------------------------------------

def sync_injuries(cur: Any, *, dry_run: bool = False, team_id: int | None = None) -> None:
    log.info("Syncing injuries …")
    params: dict[str, Any] = {"league": WORLD_CUP_LEAGUE_ID, "season": SEASON}
    if team_id:
        params["team"] = team_id
    data = api.get("injuries", params, dry_run=dry_run)

    comp_pk = _resolve_competition_id(cur, WORLD_CUP_LEAGUE_ID)
    if team_id:
        team_pk = _resolve_team_id(cur, team_id)
        cur.execute(
            "DELETE FROM injuries WHERE competition_id = %s AND season = %s AND team_id = %s",
            (comp_pk, SEASON, team_pk),
        )
        log.info("Cleared old injuries for comp_id=%s season=%d team_id=%s", comp_pk, SEASON, team_pk)
    else:
        cur.execute(
            "DELETE FROM injuries WHERE competition_id = %s AND season = %s",
            (comp_pk, SEASON),
        )
        log.info("Cleared old injuries for comp_id=%s season=%d", comp_pk, SEASON)

    count = 0
    for item in data:
        player_info = item.get("player") or {}
        team_info = item.get("team") or {}
        fixture_info = item.get("fixture") or {}
        league_info = item.get("league") or {}

        player_pk = _resolve_player_id(cur, player_info.get("id"))
        if not player_pk:
            continue
        team_pk = _resolve_team_id(cur, team_info.get("id"))
        fixture_pk = _resolve_fixture_id(cur, fixture_info.get("id"))

        cur.execute(
            """
            INSERT INTO injuries
                (player_id, team_id, fixture_id, competition_id, season, type, reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                player_pk,
                team_pk,
                fixture_pk,
                comp_pk,
                league_info.get("season") or SEASON,
                player_info.get("type"),
                player_info.get("reason"),
            ),
        )
        count += 1
    log.info("Injuries synced (%d)", count)


# ------------------------------------------------------------------
# Orchestrator
# ------------------------------------------------------------------

def run(
    *,
    dry_run: bool = False,
    team_id: int | None = None,
    fixture_id: int | None = None,
) -> None:
    """Run all daily sync steps in FK order.

    When *team_id* (API-Football ID) is given, only that team's data is
    synced.  When *fixture_id* (API-Football ID) is given, only that
    fixture is fetched.
    """
    with db.get_db_connection() as conn:
        if team_id:
            team_api_ids = [team_id]
            log.info("Filtering to team_id=%d", team_id)
        else:
            with conn.cursor() as cur:
                team_api_ids = _get_team_api_ids(cur)

        if not team_api_ids:
            log.warning("No teams in DB — run sync_bootstrap first")
            return

        with conn.cursor() as cur:
            sync_fixtures(cur, dry_run=dry_run, team_id=team_id, fixture_id=fixture_id)
            conn.commit()

        with conn.cursor() as cur:
            sync_coaches(cur, team_api_ids, dry_run=dry_run)
            conn.commit()

        with conn.cursor() as cur:
            sync_players(cur, team_api_ids, dry_run=dry_run)
            conn.commit()

        with conn.cursor() as cur:
            sync_player_season_stats(
                cur, team_api_ids, dry_run=dry_run,
                league_filter=WORLD_CUP_LEAGUE_ID,
            )
            conn.commit()

        with conn.cursor() as cur:
            sync_injuries(cur, dry_run=dry_run, team_id=team_id)
            conn.commit()

    log.info("Daily sync complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log API calls without writing to DB")
    parser.add_argument("--team-id", type=int, default=None,
                        help="API-Football team ID — sync only this team")
    parser.add_argument("--fixture-id", type=int, default=None,
                        help="API-Football fixture ID — sync only this fixture")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    run(dry_run=args.dry_run, team_id=args.team_id, fixture_id=args.fixture_id)


if __name__ == "__main__":
    main()
