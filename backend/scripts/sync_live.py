"""Tier 4 — Live match sync: scores, events, lineups, team stats, player stats.

Runs every 15s during live matches.  The main ``run()`` function is a no-op
when no matches are live or imminent.

Usage:
    python backend/scripts/sync_live.py [--dry-run] [--once]
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

sys.path.insert(0, str(ROOT))

from backend.shared import db  # noqa: E402
from backend.shared import api_football_client as api  # noqa: E402

log = logging.getLogger("sync_live")

WORLD_CUP_LEAGUE_ID = 1
SEASON = 2026

LIVE_STATUSES = frozenset({"1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"})
TERMINAL_STATUSES = frozenset({"FT", "AET", "PEN", "AWD", "WO", "PST", "CANC", "ABD"})

STAT_TYPE_TO_COLUMN = {
    "Shots on Goal": "shots_on_goal",
    "Shots off Goal": "shots_off_goal",
    "Total Shots": "total_shots",
    "Blocked Shots": "blocked_shots",
    "Shots insidebox": "shots_inside_box",
    "Shots outsidebox": "shots_outside_box",
    "Fouls": "fouls",
    "Corner Kicks": "corner_kicks",
    "Offsides": "offsides",
    "Ball Possession": "ball_possession",
    "Yellow Cards": "yellow_cards",
    "Red Cards": "red_cards",
    "Goalkeeper Saves": "goalkeeper_saves",
    "Total passes": "total_passes",
    "Passes accurate": "passes_accurate",
    "Passes %": "passes_pct",
    "expected_goals": "expected_goals",
}


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


def _strip_pct_int(val: Any) -> int | None:
    if val is None:
        return None
    s = str(val).strip().rstrip("%")
    return _safe_int(s)


def _resolve_team_id(cur: Any, api_id: int | None) -> int | None:
    if not api_id:
        return None
    cur.execute("SELECT id FROM teams WHERE api_football_id = %s", (api_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_player_id(cur: Any, api_id: int | None) -> int | None:
    if not api_id:
        return None
    cur.execute("SELECT id FROM players WHERE api_football_id = %s", (api_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_coach_id(cur: Any, api_id: int | None) -> int | None:
    if not api_id:
        return None
    cur.execute("SELECT id FROM coaches WHERE api_football_id = %s", (api_id,))
    row = cur.fetchone()
    return row[0] if row else None


def _resolve_fixture_id(cur: Any, api_id: int | None) -> int | None:
    if not api_id:
        return None
    cur.execute("SELECT id FROM fixtures WHERE api_football_id = %s", (api_id,))
    row = cur.fetchone()
    return row[0] if row else None


# ------------------------------------------------------------------
# Determine which fixtures need live polling
# ------------------------------------------------------------------

def get_live_fixtures(cur: Any) -> list[dict[str, Any]]:
    """Return fixtures that are currently live."""
    cur.execute(
        """
        SELECT id, api_football_id, status_short
        FROM fixtures
        WHERE status_short = ANY(%s)
        """,
        (list(LIVE_STATUSES),),
    )
    return [{"id": r[0], "api_football_id": r[1], "status_short": r[2]} for r in cur.fetchall()]


def get_prematch_fixtures(cur: Any) -> list[dict[str, Any]]:
    """Return fixtures starting within 30 minutes that haven't had lineups fetched."""
    cur.execute(
        """
        SELECT f.id, f.api_football_id
        FROM fixtures f
        LEFT JOIN fixture_lineups fl ON fl.fixture_id = f.id
        WHERE f.status_short = 'NS'
          AND f.kickoff_timestamp IS NOT NULL
          AND f.kickoff_timestamp <= EXTRACT(EPOCH FROM NOW()) + 1800
          AND f.kickoff_timestamp >= EXTRACT(EPOCH FROM NOW()) - 300
          AND fl.id IS NULL
        """,
    )
    return [{"id": r[0], "api_football_id": r[1]} for r in cur.fetchall()]


# ------------------------------------------------------------------
# Live fixture scores / status  (GET /fixtures?live=1)
# ------------------------------------------------------------------

def sync_live_scores(cur: Any, *, dry_run: bool = False) -> None:
    log.info("Polling live fixture scores …")
    data = api.get("fixtures", {"live": "all", "league": WORLD_CUP_LEAGUE_ID}, dry_run=dry_run)

    for item in data:
        fix = item.get("fixture") or {}
        goals = item.get("goals") or {}
        score = item.get("score") or {}
        status = fix.get("status") or {}
        ht = score.get("halftime") or {}
        et = score.get("extratime") or {}
        pen = score.get("penalty") or {}

        cur.execute(
            """
            UPDATE fixtures SET
                status           = %s,
                status_short     = %s,
                status_long      = %s,
                status_elapsed   = %s,
                status_extra     = %s,
                home_score       = %s,
                away_score       = %s,
                ht_home          = %s,
                ht_away          = %s,
                et_home          = %s,
                et_away          = %s,
                pen_home         = %s,
                pen_away         = %s,
                updated_at       = NOW()
            WHERE api_football_id = %s
            """,
            (
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
                fix.get("id"),
            ),
        )
    log.info("Live scores updated (%d fixtures)", len(data))


# ------------------------------------------------------------------
# Fixture events  (GET /fixtures/events)
# ------------------------------------------------------------------

def sync_fixture_events(cur: Any, fixture_api_id: int, fixture_pk: int, *, dry_run: bool = False) -> None:
    data = api.get("fixtures/events", {"fixture": fixture_api_id}, dry_run=dry_run)

    for ev in data:
        time_info = ev.get("time") or {}
        team_info = ev.get("team") or {}
        player_info = ev.get("player") or {}
        assist_info = ev.get("assist") or {}

        minute = _safe_int(time_info.get("elapsed"))
        if minute is None:
            continue

        extra_minute = _safe_int(time_info.get("extra"))
        team_pk = _resolve_team_id(cur, team_info.get("id"))
        player_pk = _resolve_player_id(cur, player_info.get("id"))
        assist_pk = _resolve_player_id(cur, assist_info.get("id"))
        ev_type = ev.get("type")
        ev_detail = ev.get("detail")
        ev_comments = ev.get("comments")

        # Deduplicate: skip if an identical event already exists
        cur.execute(
            """
            SELECT 1 FROM fixture_events
            WHERE fixture_id = %s AND minute = %s
              AND COALESCE(extra_minute, -1) = COALESCE(%s, -1)
              AND type = %s
              AND COALESCE(detail, '') = COALESCE(%s, '')
              AND COALESCE(player_id, -1) = COALESCE(%s, -1)
            LIMIT 1
            """,
            (fixture_pk, minute, extra_minute, ev_type, ev_detail, player_pk),
        )
        if cur.fetchone():
            continue

        cur.execute(
            """
            INSERT INTO fixture_events
                (fixture_id, team_id, player_id, assist_player_id,
                 minute, extra_minute, type, detail, comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (fixture_pk, team_pk, player_pk, assist_pk,
             minute, extra_minute, ev_type, ev_detail, ev_comments),
        )


# ------------------------------------------------------------------
# Fixture team stats  (GET /fixtures/statistics)
# ------------------------------------------------------------------

def sync_fixture_team_stats(cur: Any, fixture_api_id: int, fixture_pk: int, *, dry_run: bool = False) -> None:
    data = api.get("fixtures/statistics", {"fixture": fixture_api_id}, dry_run=dry_run)

    for team_block in data:
        team_info = team_block.get("team") or {}
        team_pk = _resolve_team_id(cur, team_info.get("id"))
        if not team_pk:
            continue

        stats_list = team_block.get("statistics") or []
        parsed: dict[str, Any] = {}
        for s in stats_list:
            col = STAT_TYPE_TO_COLUMN.get(s.get("type"))
            if not col:
                continue
            val = s.get("value")
            if col in ("ball_possession", "passes_pct"):
                parsed[col] = _strip_pct_int(val)
            elif col == "expected_goals":
                parsed[col] = _safe_decimal(val)
            else:
                parsed[col] = _safe_int(val)

        cur.execute(
            """
            INSERT INTO fixture_team_stats
                (fixture_id, team_id,
                 shots_on_goal, shots_off_goal, total_shots, blocked_shots,
                 shots_inside_box, shots_outside_box,
                 fouls, corner_kicks, offsides, ball_possession,
                 yellow_cards, red_cards, goalkeeper_saves,
                 total_passes, passes_accurate, passes_pct, expected_goals)
            VALUES (%s,%s, %s,%s,%s,%s, %s,%s, %s,%s,%s,%s, %s,%s,%s, %s,%s,%s,%s)
            ON CONFLICT (fixture_id, team_id) DO UPDATE SET
                shots_on_goal    = EXCLUDED.shots_on_goal,
                shots_off_goal   = EXCLUDED.shots_off_goal,
                total_shots      = EXCLUDED.total_shots,
                blocked_shots    = EXCLUDED.blocked_shots,
                shots_inside_box = EXCLUDED.shots_inside_box,
                shots_outside_box = EXCLUDED.shots_outside_box,
                fouls            = EXCLUDED.fouls,
                corner_kicks     = EXCLUDED.corner_kicks,
                offsides         = EXCLUDED.offsides,
                ball_possession  = EXCLUDED.ball_possession,
                yellow_cards     = EXCLUDED.yellow_cards,
                red_cards        = EXCLUDED.red_cards,
                goalkeeper_saves = EXCLUDED.goalkeeper_saves,
                total_passes     = EXCLUDED.total_passes,
                passes_accurate  = EXCLUDED.passes_accurate,
                passes_pct       = EXCLUDED.passes_pct,
                expected_goals   = EXCLUDED.expected_goals
            """,
            (
                fixture_pk, team_pk,
                parsed.get("shots_on_goal"),
                parsed.get("shots_off_goal"),
                parsed.get("total_shots"),
                parsed.get("blocked_shots"),
                parsed.get("shots_inside_box"),
                parsed.get("shots_outside_box"),
                parsed.get("fouls"),
                parsed.get("corner_kicks"),
                parsed.get("offsides"),
                parsed.get("ball_possession"),
                parsed.get("yellow_cards"),
                parsed.get("red_cards"),
                parsed.get("goalkeeper_saves"),
                parsed.get("total_passes"),
                parsed.get("passes_accurate"),
                parsed.get("passes_pct"),
                parsed.get("expected_goals"),
            ),
        )


# ------------------------------------------------------------------
# Player match stats  (GET /fixtures/players)
# ------------------------------------------------------------------

def sync_player_match_stats(cur: Any, fixture_api_id: int, fixture_pk: int, *, dry_run: bool = False) -> None:
    data = api.get("fixtures/players", {"fixture": fixture_api_id}, dry_run=dry_run)

    for team_block in data:
        team_info = team_block.get("team") or {}
        team_pk = _resolve_team_id(cur, team_info.get("id"))

        for player_entry in team_block.get("players") or []:
            p_info = player_entry.get("player") or {}
            stats_list = player_entry.get("statistics") or []
            if not stats_list:
                continue
            s = stats_list[0]

            player_pk = _resolve_player_id(cur, p_info.get("id"))
            if not player_pk:
                continue

            games = s.get("games") or {}
            shots = s.get("shots") or {}
            goals_b = s.get("goals") or {}
            passes = s.get("passes") or {}
            tackles_b = s.get("tackles") or {}
            duels = s.get("duels") or {}
            dribbles = s.get("dribbles") or {}
            fouls = s.get("fouls") or {}
            cards = s.get("cards") or {}
            penalty = s.get("penalty") or {}

            cur.execute(
                """
                INSERT INTO player_match_stats
                    (player_id, fixture_id, team_id,
                     minutes_played, position, rating, captain, substitute, shirt_number,
                     offsides, shots_total, shots_on_target,
                     goals, goal_assists, goals_conceded, goal_saves,
                     passes_total, passes_accuracy, key_passes,
                     tackles, tackles_blocks, interceptions,
                     duels_total, duels_won,
                     dribbles_attempts, dribbles_success, dribbles_past,
                     fouls_drawn, fouls_committed,
                     yellow_cards, red_cards,
                     penalty_won, penalty_committed, penalty_scored,
                     penalty_missed, penalty_saved)
                VALUES (
                    %s,%s,%s,
                    %s,%s,%s,%s,%s,%s,
                    %s,%s,%s,
                    %s,%s,%s,%s,
                    %s,%s,%s,
                    %s,%s,%s,
                    %s,%s,
                    %s,%s,%s,
                    %s,%s,
                    %s,%s,
                    %s,%s,%s,%s,%s)
                ON CONFLICT (player_id, fixture_id) DO UPDATE SET
                    team_id          = EXCLUDED.team_id,
                    minutes_played   = EXCLUDED.minutes_played,
                    position         = EXCLUDED.position,
                    rating           = EXCLUDED.rating,
                    captain          = EXCLUDED.captain,
                    substitute       = EXCLUDED.substitute,
                    shirt_number     = EXCLUDED.shirt_number,
                    offsides         = EXCLUDED.offsides,
                    shots_total      = EXCLUDED.shots_total,
                    shots_on_target  = EXCLUDED.shots_on_target,
                    goals            = EXCLUDED.goals,
                    goal_assists     = EXCLUDED.goal_assists,
                    goals_conceded   = EXCLUDED.goals_conceded,
                    goal_saves       = EXCLUDED.goal_saves,
                    passes_total     = EXCLUDED.passes_total,
                    passes_accuracy  = EXCLUDED.passes_accuracy,
                    key_passes       = EXCLUDED.key_passes,
                    tackles          = EXCLUDED.tackles,
                    tackles_blocks   = EXCLUDED.tackles_blocks,
                    interceptions    = EXCLUDED.interceptions,
                    duels_total      = EXCLUDED.duels_total,
                    duels_won        = EXCLUDED.duels_won,
                    dribbles_attempts = EXCLUDED.dribbles_attempts,
                    dribbles_success = EXCLUDED.dribbles_success,
                    dribbles_past    = EXCLUDED.dribbles_past,
                    fouls_drawn      = EXCLUDED.fouls_drawn,
                    fouls_committed  = EXCLUDED.fouls_committed,
                    yellow_cards     = EXCLUDED.yellow_cards,
                    red_cards        = EXCLUDED.red_cards,
                    penalty_won      = EXCLUDED.penalty_won,
                    penalty_committed = EXCLUDED.penalty_committed,
                    penalty_scored   = EXCLUDED.penalty_scored,
                    penalty_missed   = EXCLUDED.penalty_missed,
                    penalty_saved    = EXCLUDED.penalty_saved
                """,
                (
                    player_pk, fixture_pk, team_pk,
                    _safe_int(games.get("minutes")),
                    games.get("position"),
                    _safe_decimal(games.get("rating")),
                    games.get("captain"),
                    games.get("substitute"),
                    _safe_int(games.get("number")),
                    _safe_int(s.get("offsides")),
                    _safe_int(shots.get("total")),
                    _safe_int(shots.get("on")),
                    _safe_int(goals_b.get("total")),
                    _safe_int(goals_b.get("assists")),
                    _safe_int(goals_b.get("conceded")),
                    _safe_int(goals_b.get("saves")),
                    _safe_int(passes.get("total")),
                    _safe_int(passes.get("accuracy")),
                    _safe_int(passes.get("key")),
                    _safe_int(tackles_b.get("total")),
                    _safe_int(tackles_b.get("blocks")),
                    _safe_int(tackles_b.get("interceptions")),
                    _safe_int(duels.get("total")),
                    _safe_int(duels.get("won")),
                    _safe_int(dribbles.get("attempts")),
                    _safe_int(dribbles.get("success")),
                    _safe_int(dribbles.get("past")),
                    _safe_int(fouls.get("drawn")),
                    _safe_int(fouls.get("committed")),
                    _safe_int(cards.get("yellow")),
                    _safe_int(cards.get("red")),
                    _safe_int(penalty.get("won")),
                    _safe_int(penalty.get("commited")),  # API typo
                    _safe_int(penalty.get("scored")),
                    _safe_int(penalty.get("missed")),
                    _safe_int(penalty.get("saved")),
                ),
            )


# ------------------------------------------------------------------
# Fixture lineups  (GET /fixtures/lineups)
# ------------------------------------------------------------------

def sync_fixture_lineups(cur: Any, fixture_api_id: int, fixture_pk: int, *, dry_run: bool = False) -> None:
    data = api.get("fixtures/lineups", {"fixture": fixture_api_id}, dry_run=dry_run)
    if not data:
        return

    for lineup in data:
        team_info = lineup.get("team") or {}
        team_pk = _resolve_team_id(cur, team_info.get("id"))
        if not team_pk:
            continue

        coach = lineup.get("coach") or {}
        coach_pk = _resolve_coach_id(cur, coach.get("id"))

        cur.execute(
            """
            INSERT INTO fixture_lineups (fixture_id, team_id, formation, coach_id, last_synced_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (fixture_id, team_id) DO UPDATE SET
                formation = EXCLUDED.formation,
                coach_id = EXCLUDED.coach_id,
                last_synced_at = NOW()
            RETURNING id
            """,
            (fixture_pk, team_pk, lineup.get("formation"), coach_pk),
        )
        lineup_pk = cur.fetchone()[0]

        # Delete + re-insert players for this lineup (CASCADE-safe)
        cur.execute("DELETE FROM fixture_lineup_players WHERE fixture_lineup_id = %s", (lineup_pk,))

        for player_entry in lineup.get("startXI") or []:
            p = player_entry.get("player") or {}
            _insert_lineup_player(cur, lineup_pk, p, is_starting=True)

        for player_entry in lineup.get("substitutes") or []:
            p = player_entry.get("player") or {}
            _insert_lineup_player(cur, lineup_pk, p, is_starting=False)


def _insert_lineup_player(cur: Any, lineup_pk: int, p: dict[str, Any], *, is_starting: bool) -> None:
    player_pk = _resolve_player_id(cur, p.get("id"))
    if not player_pk:
        return
    cur.execute(
        """
        INSERT INTO fixture_lineup_players
            (fixture_lineup_id, player_id, shirt_number, position, grid, is_starting)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (fixture_lineup_id, player_id) DO UPDATE SET
            shirt_number = EXCLUDED.shirt_number,
            position = EXCLUDED.position,
            grid = EXCLUDED.grid,
            is_starting = EXCLUDED.is_starting
        """,
        (lineup_pk, player_pk, _safe_int(p.get("number")), p.get("pos"), p.get("grid"), is_starting),
    )


# ------------------------------------------------------------------
# Orchestrator
# ------------------------------------------------------------------

_last_stats_poll: float = 0


def run(*, dry_run: bool = False) -> bool:
    """Run one live-polling cycle.  Returns True if any work was done."""
    global _last_stats_poll

    with db.get_db_connection() as conn:
        with conn.cursor() as cur:
            live = get_live_fixtures(cur)
            prematch = get_prematch_fixtures(cur)

        if not live and not prematch:
            return False

        # --- Pre-match lineups ---
        if prematch:
            log.info("Fetching lineups for %d pre-match fixtures", len(prematch))
            with conn.cursor() as cur:
                for f in prematch:
                    sync_fixture_lineups(cur, f["api_football_id"], f["id"], dry_run=dry_run)
                conn.commit()

        if not live:
            return bool(prematch)

        # --- Live scores (every call) ---
        with conn.cursor() as cur:
            sync_live_scores(cur, dry_run=dry_run)
            conn.commit()

        # --- Events (every call, per match) ---
        with conn.cursor() as cur:
            for f in live:
                sync_fixture_events(cur, f["api_football_id"], f["id"], dry_run=dry_run)
            conn.commit()

        # --- Team stats + player stats (every 60s) ---
        now = time.monotonic()
        if now - _last_stats_poll >= 55:
            _last_stats_poll = now
            with conn.cursor() as cur:
                for f in live:
                    sync_fixture_team_stats(cur, f["api_football_id"], f["id"], dry_run=dry_run)
                    sync_player_match_stats(cur, f["api_football_id"], f["id"], dry_run=dry_run)
                conn.commit()

    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Log API calls without writing to DB")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

    if args.once:
        did_work = run(dry_run=args.dry_run)
        log.info("Single cycle complete (did_work=%s)", did_work)
        return

    log.info("Starting live polling loop (Ctrl-C to stop) …")
    while True:
        try:
            did_work = run(dry_run=args.dry_run)
            if not did_work:
                log.debug("No live/prematch fixtures — sleeping 5 min")
                time.sleep(300)
            else:
                time.sleep(15)
        except KeyboardInterrupt:
            log.info("Stopped.")
            break
        except Exception:
            log.exception("Error in live polling cycle — retrying in 30s")
            time.sleep(30)


if __name__ == "__main__":
    main()
