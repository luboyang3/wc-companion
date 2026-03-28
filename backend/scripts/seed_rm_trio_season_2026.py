"""Fetch API-Football season stats for Vinícius Júnior, Courtois, Tchouaméni; upsert players + player_season_stats.

Tries season 2026 first, then 2025 / 2024 / 2023 until the API returns data (free tiers often cap at 2024).
Override API season with env API_FOOTBALL_SEASON.

Uses Real Madrid (api team 541) and prefers La Liga (league 140) when multiple stat rows exist.
Env: API_FOOTBALL_KEY, DATABASE_URL, optional API_FOOTBALL_BASE_URL, DB_SSLMODE.
"""
from __future__ import annotations

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
REAL_MADRID_API_TEAM_ID = 541
LA_LIGA_API_LEAGUE_ID = 140
# First API season to request (free tier may fall back; see fetch_player).
PREFERRED_SEASON = 2026
# Season value stored in Postgres (player_season_stats.season / competitions.season).
DB_SEASON = int(os.environ.get("STATS_DB_SEASON", "2026"))
# api_football_id from API-Sports (matches rows seeded for Real Madrid)
PLAYER_API_IDS = (
    762,  # Vinícius Júnior
    730,  # T. Courtois
    1271,  # A. Tchouaméni
)


def _clip(s: str | None, max_len: int) -> str | None:
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    return s[:max_len] if len(s) > max_len else s


def _as_int(v: Any, default: int = 0) -> int:
    if v is None:
        return default
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    s = str(v).strip().replace("%", "")
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return default


def _as_float(v: Any) -> float | None:
    if v is None or v is False or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _parse_dob(raw: Any) -> str | None:
    if not raw or not isinstance(raw, dict):
        return None
    d = raw.get("date")
    if not d or not isinstance(d, str):
        return None
    return d[:10] if len(d) >= 10 else None


def _pick_stat(
    statistics: list[dict[str, Any]], team_id: int, prefer_league: int
) -> dict[str, Any] | None:
    for row in statistics:
        if not isinstance(row, dict):
            continue
        t = row.get("team") or {}
        if _as_int(t.get("id"), -1) != team_id:
            continue
        lg = row.get("league") or {}
        if _as_int(lg.get("id"), -1) == prefer_league:
            return row
    for row in statistics:
        if not isinstance(row, dict):
            continue
        t = row.get("team") or {}
        if _as_int(t.get("id"), -1) == team_id:
            return row
    return None


def _season_candidates(preferred: int) -> list[int]:
    forced = os.environ.get("API_FOOTBALL_SEASON")
    if forced and forced.strip().isdigit():
        return [int(forced.strip())]
    seen: set[int] = set()
    out: list[int] = []
    for s in (preferred, 2025, 2024, 2023):
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


def fetch_player(
    base: str, api_key: str, player_api_id: int, preferred_season: int
) -> tuple[dict[str, Any], dict[str, Any] | None, int]:
    last_err: str | None = None
    for season in _season_candidates(preferred_season):
        r = requests.get(
            f"{base.rstrip('/')}/players",
            headers={"x-apisports-key": api_key},
            params={"id": player_api_id, "season": season},
            timeout=45,
        )
        r.raise_for_status()
        payload = r.json()
        errs = payload.get("errors")
        if errs:
            last_err = str(errs)
            continue
        rows = payload.get("response") or []
        if not rows or not isinstance(rows[0], dict):
            last_err = f"empty response season={season}"
            continue
        block = rows[0]
        p = block.get("player")
        stats = block.get("statistics") or []
        if not isinstance(p, dict):
            last_err = f"invalid player season={season}"
            continue
        stat_row = _pick_stat(
            stats if isinstance(stats, list) else [],
            REAL_MADRID_API_TEAM_ID,
            LA_LIGA_API_LEAGUE_ID,
        )
        if stat_row is None:
            last_err = f"no Real Madrid stat row season={season}"
            continue
        return p, stat_row, season

    raise RuntimeError(
        f"No usable data for player id={player_api_id} (tried seasons {_season_candidates(preferred_season)}). "
        f"Last issue: {last_err}"
    )


def upsert_competition(cur: Any, league: dict[str, Any], season: int) -> int:
    lid = _as_int(league.get("id"), 0)
    if not lid:
        raise RuntimeError("League id missing in API statistics")
    name = _clip(league.get("name"), 100) or f"League {lid}"
    country = _clip(league.get("country"), 100)
    logo = _clip(league.get("logo"), 2000)
    cur.execute(
        """
        INSERT INTO competitions (api_football_id, name, country, logo_url, season)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (api_football_id) DO UPDATE SET
            name = EXCLUDED.name,
            country = EXCLUDED.country,
            logo_url = EXCLUDED.logo_url,
            season = EXCLUDED.season,
            updated_at = NOW()
        RETURNING id
        """,
        (lid, name, country, logo, season),
    )
    return int(cur.fetchone()[0])


def get_team_pk(cur: Any) -> int:
    cur.execute("SELECT id FROM teams WHERE api_football_id = %s", (REAL_MADRID_API_TEAM_ID,))
    row = cur.fetchone()
    if not row:
        raise RuntimeError("Real Madrid not in teams; run seed_real_madrid_from_api.py first.")
    return int(row[0])


def upsert_player_row(
    cur: Any,
    p: dict[str, Any],
    team_pk: int,
    stat_row: dict[str, Any] | None,
) -> int:
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
    if stat_row:
        g = stat_row.get("games") or {}
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
        RETURNING id
        """,
        (pid, name, first, last, nationality, position, dob, height, weight, photo, team_pk),
    )
    return int(cur.fetchone()[0])


def upsert_season_stats(
    cur: Any,
    player_pk: int,
    competition_pk: int,
    team_pk: int,
    season: int,
    stat_row: dict[str, Any],
) -> None:
    g = stat_row.get("games") or {}
    sub = stat_row.get("substitutes") or {}
    shots = stat_row.get("shots") or {}
    goals = stat_row.get("goals") or {}
    passes = stat_row.get("passes") or {}
    tackles = stat_row.get("tackles") or {}
    duels = stat_row.get("duels") or {}
    dribbles = stat_row.get("dribbles") or {}
    fouls = stat_row.get("fouls") or {}
    cards = stat_row.get("cards") or {}
    pen = stat_row.get("penalty") or {}

    apps = _as_int(g.get("appearences") or g.get("appearances"))
    lineups = _as_int(g.get("lineups"))
    minutes = _as_int(g.get("minutes"))
    pos = _clip(g.get("position"), 50)
    rating = _as_float(g.get("rating"))
    captain = bool(g.get("captain"))

    cur.execute(
        """
        INSERT INTO player_season_stats (
            player_id, competition_id, team_id, season,
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
            penalty_won, penalty_committed, penalty_scored, penalty_missed, penalty_saved,
            last_synced_at
        )
        VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s, %s,
            NOW()
        )
        ON CONFLICT (player_id, competition_id, team_id, season) DO UPDATE SET
            appearances = EXCLUDED.appearances,
            lineups = EXCLUDED.lineups,
            minutes_played = EXCLUDED.minutes_played,
            position = EXCLUDED.position,
            rating = EXCLUDED.rating,
            captain = EXCLUDED.captain,
            subs_in = EXCLUDED.subs_in,
            subs_out = EXCLUDED.subs_out,
            bench = EXCLUDED.bench,
            shots_total = EXCLUDED.shots_total,
            shots_on_target = EXCLUDED.shots_on_target,
            goals_total = EXCLUDED.goals_total,
            goals_conceded = EXCLUDED.goals_conceded,
            goal_assists = EXCLUDED.goal_assists,
            goal_saves = EXCLUDED.goal_saves,
            passes_total = EXCLUDED.passes_total,
            passes_key = EXCLUDED.passes_key,
            passes_accuracy = EXCLUDED.passes_accuracy,
            tackles_total = EXCLUDED.tackles_total,
            tackles_blocks = EXCLUDED.tackles_blocks,
            interceptions = EXCLUDED.interceptions,
            duels_total = EXCLUDED.duels_total,
            duels_won = EXCLUDED.duels_won,
            dribbles_attempts = EXCLUDED.dribbles_attempts,
            dribbles_success = EXCLUDED.dribbles_success,
            fouls_drawn = EXCLUDED.fouls_drawn,
            fouls_committed = EXCLUDED.fouls_committed,
            yellow_cards = EXCLUDED.yellow_cards,
            yellow_red_cards = EXCLUDED.yellow_red_cards,
            red_cards = EXCLUDED.red_cards,
            penalty_won = EXCLUDED.penalty_won,
            penalty_committed = EXCLUDED.penalty_committed,
            penalty_scored = EXCLUDED.penalty_scored,
            penalty_missed = EXCLUDED.penalty_missed,
            penalty_saved = EXCLUDED.penalty_saved,
            last_synced_at = NOW()
        """,
        (
            player_pk,
            competition_pk,
            team_pk,
            season,
            apps,
            lineups,
            minutes,
            pos,
            rating,
            captain,
            _as_int(sub.get("in")),
            _as_int(sub.get("out")),
            _as_int(sub.get("bench")),
            _as_int(shots.get("total")),
            _as_int(shots.get("on")),
            _as_int(goals.get("total")),
            _as_int(goals.get("conceded")),
            _as_int(goals.get("assists")),
            _as_int(goals.get("saves")) or None,
            _as_int(passes.get("total")),
            _as_int(passes.get("key")),
            _as_int(passes.get("accuracy")) or None,
            _as_int(tackles.get("total")),
            _as_int(tackles.get("blocks")),
            _as_int(tackles.get("interceptions")),
            _as_int(duels.get("total")),
            _as_int(duels.get("won")),
            _as_int(dribbles.get("attempts")),
            _as_int(dribbles.get("success")),
            _as_int(fouls.get("drawn")),
            _as_int(fouls.get("committed")),
            _as_int(cards.get("yellow")),
            _as_int(cards.get("yellowred")),
            _as_int(cards.get("red")),
            _as_int(pen.get("won")),
            _as_int(pen.get("commited") or pen.get("committed")),
            _as_int(pen.get("scored")),
            _as_int(pen.get("missed")),
            _as_int(pen.get("saved")),
        ),
    )


def main() -> None:
    api_key = (os.environ.get("API_FOOTBALL_KEY") or "").strip()
    if not api_key:
        sys.exit("Set API_FOOTBALL_KEY in .env")

    db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not db_url:
        sys.exit("DATABASE_URL missing in .env")

    sslmode = (os.environ.get("DB_SSLMODE") or "require").strip()
    base = (os.environ.get("API_FOOTBALL_BASE_URL") or DEFAULT_BASE).strip()

    conn = psycopg2.connect(db_url, connect_timeout=15, sslmode=sslmode)
    try:
        cur = conn.cursor()
        team_pk = get_team_pk(cur)
        done: list[str] = []
        seasons_used: set[int] = set()
        for pid in PLAYER_API_IDS:
            p, stat_row, api_season = fetch_player(base, api_key, pid, PREFERRED_SEASON)
            seasons_used.add(api_season)
            league = stat_row.get("league") or {}
            comp_pk = upsert_competition(cur, league, DB_SEASON)
            player_pk = upsert_player_row(cur, p, team_pk, stat_row)
            upsert_season_stats(cur, player_pk, comp_pk, team_pk, DB_SEASON, stat_row)
            done.append(_clip(p.get("name"), 100) or str(pid))

        conn.commit()
        cur.close()
        su = sorted(seasons_used)
        print(
            f"Updated {len(done)} players; stored as season {DB_SEASON} in DB "
            f"(API data from season(s) {su}): {', '.join(done)}"
        )
        if su != [DB_SEASON]:
            print(
                f"Note: Numbers come from API season(s) {su}; label in DB is {DB_SEASON}. "
                f"Override with STATS_DB_SEASON. For API access to {PREFERRED_SEASON}+, upgrade API-Football."
            )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
