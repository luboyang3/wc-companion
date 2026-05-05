"""Tier 3 — Hourly sync: standings, predictions, fixtures.group_label backfill.

Run every 60 minutes during the tournament.  Total API calls per run: ~11.

Usage:
    python backend/scripts/sync_hourly.py [--dry-run] [--team-id ID] [--fixture-id ID]

Options:
    --team-id ID      API-Football team ID — sync only this team's standings/predictions
    --fixture-id ID   API-Football fixture ID — sync predictions for this fixture only
"""

from __future__ import annotations

import argparse
import json
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

log = logging.getLogger("sync_hourly")

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


def _parse_percent(val: Any) -> Decimal | None:
    """Parse ``"45%"`` -> ``Decimal('45.00')``."""
    if val is None:
        return None
    s = str(val).strip().rstrip("%")
    return _safe_decimal(s)


def _resolve_team_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM teams WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_competition_id(cur: Any, api_football_id: int | None) -> int | None:
    if not api_football_id:
        return None
    cur.execute("SELECT id FROM competitions WHERE api_football_id = %s", (api_football_id,))
    row = cur.fetchone()
    return row[0] if row else None


# ------------------------------------------------------------------
# Standings
# ------------------------------------------------------------------

def sync_standings(cur: Any, *, dry_run: bool = False, team_id: int | None = None) -> int | None:
    """Sync standings and return the internal competition_id.

    When *team_id* is set, only the row for that team is upserted (the
    API call still returns the full standings — there's no team filter on
    the standings endpoint).
    """
    log.info("Syncing standings …")
    data = api.get("standings", {"league": WORLD_CUP_LEAGUE_ID, "season": SEASON}, dry_run=dry_run)
    if not data:
        return None

    league_block = data[0].get("league") or {} if data else {}
    comp_pk = _resolve_competition_id(cur, league_block.get("id"))
    groups = league_block.get("standings") or []

    count = 0
    for group in groups:
        for entry in group:
            team_info = entry.get("team") or {}
            if team_id and team_info.get("id") != team_id:
                continue
            team_pk = _resolve_team_id(cur, team_info.get("id"))
            if not team_pk:
                continue

            all_stats = entry.get("all") or {}
            all_goals = all_stats.get("goals") or {}
            home = entry.get("home") or {}
            home_goals = home.get("goals") or {}
            away = entry.get("away") or {}
            away_goals = away.get("goals") or {}

            cur.execute(
                """
                INSERT INTO standings
                    (competition_id, team_id, season, group_label,
                     rank, points, goal_difference, form, status, description,
                     played, wins, draws, losses, goals_for, goals_against,
                     home_played, home_wins, home_draws, home_losses,
                     home_goals_for, home_goals_against,
                     away_played, away_wins, away_draws, away_losses,
                     away_goals_for, away_goals_against,
                     last_update, last_synced_at)
                VALUES (
                    %s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,
                    %s, NOW())
                ON CONFLICT (competition_id, team_id, season, COALESCE(group_label, ''))
                DO UPDATE SET
                    rank             = EXCLUDED.rank,
                    points           = EXCLUDED.points,
                    goal_difference  = EXCLUDED.goal_difference,
                    form             = EXCLUDED.form,
                    status           = EXCLUDED.status,
                    description      = EXCLUDED.description,
                    played           = EXCLUDED.played,
                    wins             = EXCLUDED.wins,
                    draws            = EXCLUDED.draws,
                    losses           = EXCLUDED.losses,
                    goals_for        = EXCLUDED.goals_for,
                    goals_against    = EXCLUDED.goals_against,
                    home_played      = EXCLUDED.home_played,
                    home_wins        = EXCLUDED.home_wins,
                    home_draws       = EXCLUDED.home_draws,
                    home_losses      = EXCLUDED.home_losses,
                    home_goals_for   = EXCLUDED.home_goals_for,
                    home_goals_against = EXCLUDED.home_goals_against,
                    away_played      = EXCLUDED.away_played,
                    away_wins        = EXCLUDED.away_wins,
                    away_draws       = EXCLUDED.away_draws,
                    away_losses      = EXCLUDED.away_losses,
                    away_goals_for   = EXCLUDED.away_goals_for,
                    away_goals_against = EXCLUDED.away_goals_against,
                    last_update      = EXCLUDED.last_update,
                    last_synced_at   = NOW()
                """,
                (
                    comp_pk, team_pk, SEASON, entry.get("group"),
                    _safe_int(entry.get("rank")),
                    _safe_int(entry.get("points")),
                    _safe_int(entry.get("goalsDiff")),
                    entry.get("form"),
                    entry.get("status"),
                    entry.get("description"),
                    _safe_int(all_stats.get("played")),
                    _safe_int(all_stats.get("win")),
                    _safe_int(all_stats.get("draw")),
                    _safe_int(all_stats.get("lose")),
                    _safe_int(all_goals.get("for")),
                    _safe_int(all_goals.get("against")),
                    _safe_int(home.get("played")),
                    _safe_int(home.get("win")),
                    _safe_int(home.get("draw")),
                    _safe_int(home.get("lose")),
                    _safe_int(home_goals.get("for")),
                    _safe_int(home_goals.get("against")),
                    _safe_int(away.get("played")),
                    _safe_int(away.get("win")),
                    _safe_int(away.get("draw")),
                    _safe_int(away.get("lose")),
                    _safe_int(away_goals.get("for")),
                    _safe_int(away_goals.get("against")),
                    entry.get("update"),
                ),
            )
            count += 1
    log.info("Standings synced (%d rows)", count)
    return comp_pk


# ------------------------------------------------------------------
# Backfill fixtures.group_label from standings
# ------------------------------------------------------------------

def backfill_fixture_group_labels(
    cur: Any,
    comp_pk: int | None,
    *,
    team_id: int | None = None,
    fixture_id: int | None = None,
) -> None:
    """Set fixtures.group_label for group-stage matches using standings data."""
    if comp_pk is None:
        return
    log.info("Backfilling fixture group labels …")

    query = """
        UPDATE fixtures f
        SET group_label = s.group_label
        FROM standings s
        WHERE f.competition_id = %s
          AND f.group_label IS NULL
          AND f.round_label LIKE '%%Group%%'
          AND s.competition_id = f.competition_id
          AND s.season = %s
          AND (s.team_id = f.home_team_id OR s.team_id = f.away_team_id)
          AND s.group_label IS NOT NULL
    """
    params: list[Any] = [comp_pk, SEASON]

    if fixture_id:
        query += " AND f.api_football_id = %s"
        params.append(fixture_id)
    elif team_id:
        team_pk = _resolve_team_id(cur, team_id)
        if team_pk:
            query += " AND (f.home_team_id = %s OR f.away_team_id = %s)"
            params.extend([team_pk, team_pk])

    cur.execute(query, tuple(params))
    log.info("Group labels backfilled")


# ------------------------------------------------------------------
# Predictions
# ------------------------------------------------------------------

def sync_predictions(
    cur: Any,
    *,
    dry_run: bool = False,
    team_id: int | None = None,
    fixture_id: int | None = None,
) -> None:
    log.info("Syncing predictions for upcoming fixtures …")
    if fixture_id:
        cur.execute(
            "SELECT api_football_id, id FROM fixtures WHERE api_football_id = %s AND competition_id IS NOT NULL",
            (fixture_id,),
        )
    elif team_id:
        team_pk = _resolve_team_id(cur, team_id)
        cur.execute(
            """SELECT api_football_id, id FROM fixtures
               WHERE status_short = 'NS' AND competition_id IS NOT NULL
                 AND (home_team_id = %s OR away_team_id = %s)""",
            (team_pk, team_pk),
        )
    else:
        cur.execute(
            "SELECT api_football_id, id FROM fixtures WHERE status_short = 'NS' AND competition_id IS NOT NULL"
        )
    upcoming = cur.fetchall()
    if not upcoming:
        log.info("No upcoming fixtures — skipping predictions")
        return

    count = 0
    for api_fix_id, fix_pk in upcoming:
        data = api.get("predictions", {"fixture": api_fix_id}, dry_run=dry_run)
        if not data:
            continue
        pred = data[0]
        preds = pred.get("predictions") or {}
        winner = preds.get("winner") or {}
        percent = preds.get("percent") or {}
        comparison = pred.get("comparison")
        winner_team_pk = _resolve_team_id(cur, winner.get("id"))

        cur.execute(
            """
            INSERT INTO predictions
                (fixture_id, winner_team_id, winner_comment,
                 win_or_draw, under_over, advice,
                 percent_home, percent_draw, percent_away,
                 comparison_json, last_synced_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (fixture_id) DO UPDATE SET
                winner_team_id  = EXCLUDED.winner_team_id,
                winner_comment  = EXCLUDED.winner_comment,
                win_or_draw     = EXCLUDED.win_or_draw,
                under_over      = EXCLUDED.under_over,
                advice          = EXCLUDED.advice,
                percent_home    = EXCLUDED.percent_home,
                percent_draw    = EXCLUDED.percent_draw,
                percent_away    = EXCLUDED.percent_away,
                comparison_json = EXCLUDED.comparison_json,
                last_synced_at  = NOW()
            """,
            (
                fix_pk,
                winner_team_pk,
                winner.get("comment"),
                preds.get("win_or_draw"),
                preds.get("under_over"),
                preds.get("advice"),
                _parse_percent(percent.get("home")),
                _parse_percent(percent.get("draw")),
                _parse_percent(percent.get("away")),
                json.dumps(comparison) if comparison else None,
            ),
        )
        count += 1
    log.info("Predictions synced (%d)", count)


# ------------------------------------------------------------------
# Orchestrator
# ------------------------------------------------------------------

def run(
    *,
    dry_run: bool = False,
    team_id: int | None = None,
    fixture_id: int | None = None,
) -> None:
    """Run all hourly sync steps.

    When *team_id* (API-Football ID) is given, standings are filtered to
    that team and predictions are limited to fixtures involving the team.
    When *fixture_id* (API-Football ID) is given, only the prediction for
    that fixture is fetched.
    """
    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            comp_pk = sync_standings(cur, dry_run=dry_run, team_id=team_id)
            conn.commit()

        with conn.cursor() as cur:
            sync_predictions(cur, dry_run=dry_run, team_id=team_id, fixture_id=fixture_id)
            conn.commit()

        with conn.cursor() as cur:
            backfill_fixture_group_labels(cur, comp_pk, team_id=team_id, fixture_id=fixture_id)
            conn.commit()

    log.info("Hourly sync complete.")


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
