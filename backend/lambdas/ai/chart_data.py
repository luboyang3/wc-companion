"""Chart data providers backed by PostgreSQL (Phase 1)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from shared.db import fetch_all, fetch_one

FORMATION_TEMPLATE = [
    ("GK", 50, 92),
    ("RB", 82, 74),
    ("CB", 62, 76),
    ("CB", 38, 76),
    ("LB", 18, 74),
    ("CM", 65, 56),
    ("CM", 50, 58),
    ("CM", 35, 56),
    ("RW", 80, 36),
    ("ST", 50, 24),
    ("LW", 20, 36),
]

METRIC_ALIASES: dict[str, str] = {
    "goals": "goals_total",
    "goals_total": "goals_total",
    "assists": "goal_assists",
    "goal_assists": "goal_assists",
    "passes": "passes_total",
    "passes_total": "passes_total",
    "tackles": "tackles_total",
    "tackles_total": "tackles_total",
    "interceptions": "interceptions",
    "shots_on_target": "shots_on_target",
    "minutes_played": "minutes_played",
}

METRIC_UNITS: dict[str, str] = {
    "goals_total": "goals",
    "goal_assists": "assists",
    "passes_total": "passes",
    "tackles_total": "tackles",
    "interceptions": "interceptions",
    "shots_on_target": "shots on target",
    "minutes_played": "minutes",
}


def _use_mock_data() -> bool:
    raw = os.environ.get("USE_MOCK_CHART_DATA", "true").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _mock_formation_data(team_name: str) -> dict[str, Any]:
    squad_by_team: dict[str, list[dict[str, Any]]] = {
        "brazil": [
            {"name": "Alisson", "position": "GK", "x": 50, "y": 92},
            {"name": "Danilo", "position": "RB", "x": 82, "y": 74},
            {"name": "Marquinhos", "position": "CB", "x": 62, "y": 76},
            {"name": "Gabriel", "position": "CB", "x": 38, "y": 76},
            {"name": "Guilherme Arana", "position": "LB", "x": 18, "y": 74},
            {"name": "Bruno Guimaraes", "position": "CM", "x": 65, "y": 56},
            {"name": "Paqueta", "position": "CM", "x": 50, "y": 58},
            {"name": "Douglas Luiz", "position": "CM", "x": 35, "y": 56},
            {"name": "Raphinha", "position": "RW", "x": 80, "y": 36},
            {"name": "Rodrygo", "position": "ST", "x": 50, "y": 24},
            {"name": "Vinicius Jr.", "position": "LW", "x": 20, "y": 36},
        ],
        "argentina": [
            {"name": "Martinez", "position": "GK", "x": 50, "y": 92},
            {"name": "Molina", "position": "RB", "x": 82, "y": 74},
            {"name": "Romero", "position": "CB", "x": 62, "y": 76},
            {"name": "Lisandro Martinez", "position": "CB", "x": 38, "y": 76},
            {"name": "Tagliafico", "position": "LB", "x": 18, "y": 74},
            {"name": "De Paul", "position": "CM", "x": 65, "y": 56},
            {"name": "Enzo Fernandez", "position": "CM", "x": 50, "y": 58},
            {"name": "Mac Allister", "position": "CM", "x": 35, "y": 56},
            {"name": "Messi", "position": "RW", "x": 80, "y": 36},
            {"name": "Julian Alvarez", "position": "ST", "x": 50, "y": 24},
            {"name": "Nico Gonzalez", "position": "LW", "x": 20, "y": 36},
        ],
    }
    players = squad_by_team.get(team_name.strip().lower()) or squad_by_team["brazil"]
    return {"formation": "4-3-3", "players": players}


def _mock_radar_data(player_name: str) -> dict[str, Any]:
    radar_by_player = {
        "vinicius jr.": {"pace": 95, "shooting": 83, "passing": 78, "dribbling": 92, "defending": 33, "physical": 71},
        "messi": {"pace": 80, "shooting": 88, "passing": 92, "dribbling": 91, "defending": 38, "physical": 66},
        "mbappe": {"pace": 97, "shooting": 89, "passing": 81, "dribbling": 90, "defending": 40, "physical": 78},
    }
    key = player_name.strip().lower()
    attributes = radar_by_player.get(key) or radar_by_player["vinicius jr."]
    return {"playerName": player_name or "Vinicius Jr.", "attributes": attributes}


def _mock_bar_data(title: str, metric: str) -> dict[str, Any]:
    data_by_metric: dict[str, dict[str, Any]] = {
        "goals": {"unit": "goals", "items": [{"label": "Mbappe", "value": 8}, {"label": "Messi", "value": 7}, {"label": "Alvarez", "value": 4}]},
        "assists": {"unit": "assists", "items": [{"label": "Griezmann", "value": 4}, {"label": "Messi", "value": 3}, {"label": "Perisic", "value": 3}]},
        "passes": {"unit": "passes", "items": [{"label": "Rodri", "value": 612}, {"label": "Stones", "value": 576}, {"label": "Otamendi", "value": 544}]},
        "tackles": {"unit": "tackles", "items": [{"label": "Amrabat", "value": 22}, {"label": "Bellingham", "value": 19}, {"label": "Enzo Fernandez", "value": 18}]},
    }
    normalized_metric = metric.strip().lower()
    selected = data_by_metric.get(normalized_metric) or data_by_metric["goals"]
    return {"title": title or "Top players", "items": selected["items"], "unit": selected["unit"]}


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _clamp_0_100(value: float) -> int:
    return max(0, min(100, int(round(value))))


def _pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return (numerator / denominator) * 100.0


def _infer_group(position_raw: str) -> str:
    normalized = (position_raw or "").strip().lower()
    if any(token in normalized for token in ("goalkeeper", "gk")):
        return "gk"
    if any(token in normalized for token in ("defender", "back", "centre-back", "center-back", "cb", "rb", "lb", "rwb", "lwb")):
        return "def"
    if any(token in normalized for token in ("midfielder", "dm", "cm", "am", "lm", "rm", "wing-back")):
        return "mid"
    if any(token in normalized for token in ("forward", "striker", "winger", "st", "rw", "lw", "cf", "attacker")):
        return "fwd"
    return "mid"


def _slot_group(slot: str) -> str:
    if slot == "GK":
        return "gk"
    if slot in {"RB", "CB", "LB"}:
        return "def"
    if slot == "CM":
        return "mid"
    return "fwd"


def _slot_player_name(players: list[dict[str, Any]], group: str, used: set[int]) -> str:
    for idx, player in enumerate(players):
        if idx in used:
            continue
        if _infer_group(str(player.get("position", ""))) == group:
            used.add(idx)
            return str(player.get("name") or "Unknown")

    for idx, player in enumerate(players):
        if idx in used:
            continue
        used.add(idx)
        return str(player.get("name") or "Unknown")

    return "TBD"


def fetch_formation_data(team_name: str) -> dict[str, Any]:
    """Return formation data for a team from PostgreSQL-backed squad data."""
    if _use_mock_data():
        return _mock_formation_data(team_name)

    query = """
        SELECT
            p.name,
            COALESCE(pss.position, p.position, '') AS position,
            COALESCE(pss.minutes_played, 0) AS minutes_played
        FROM teams t
        JOIN players p ON p.team_id = t.id
        LEFT JOIN LATERAL (
            SELECT position, minutes_played
            FROM player_season_stats s
            WHERE s.player_id = p.id AND s.team_id = t.id
            ORDER BY s.season DESC, s.minutes_played DESC
            LIMIT 1
        ) pss ON TRUE
        WHERE t.name ILIKE %s OR t.short_name ILIKE %s
        ORDER BY COALESCE(pss.minutes_played, 0) DESC, p.name ASC
        LIMIT 30
    """
    team_lookup = team_name.strip()
    pattern = f"%{team_lookup}%"
    try:
        squad = fetch_all(query, (pattern, pattern))
    except Exception:
        squad = []

    selected_players = squad[:20]
    used_indices: set[int] = set()
    formation_players: list[dict[str, Any]] = []

    for slot, x, y in FORMATION_TEMPLATE:
        player_name = _slot_player_name(selected_players, _slot_group(slot), used_indices)
        formation_players.append({"name": player_name, "position": slot, "x": x, "y": y})

    return {"formation": "4-3-3", "players": formation_players}


def fetch_player_radar_data(player_name: str) -> dict[str, Any]:
    """Return player radar attributes on a 0-100 scale from season stats."""
    if _use_mock_data():
        return _mock_radar_data(player_name)

    query = """
        SELECT
            p.name,
            COALESCE(pss.position, p.position, '') AS position,
            COALESCE(pss.goals_total, 0) AS goals_total,
            COALESCE(pss.shots_total, 0) AS shots_total,
            COALESCE(pss.shots_on_target, 0) AS shots_on_target,
            COALESCE(pss.passes_key, 0) AS passes_key,
            COALESCE(pss.passes_accuracy, 0) AS passes_accuracy,
            COALESCE(pss.dribbles_success, 0) AS dribbles_success,
            COALESCE(pss.dribbles_attempts, 0) AS dribbles_attempts,
            COALESCE(pss.tackles_total, 0) AS tackles_total,
            COALESCE(pss.interceptions, 0) AS interceptions,
            COALESCE(pss.duels_won, 0) AS duels_won,
            COALESCE(pss.duels_total, 0) AS duels_total
        FROM players p
        LEFT JOIN LATERAL (
            SELECT *
            FROM player_season_stats s
            WHERE s.player_id = p.id
            ORDER BY s.season DESC, s.minutes_played DESC
            LIMIT 1
        ) pss ON TRUE
        WHERE p.name ILIKE %s
        ORDER BY p.id DESC
        LIMIT 1
    """
    pattern = f"%{player_name.strip()}%"
    try:
        row = fetch_one(query, (pattern,))
    except Exception:
        row = None

    display_name = (row or {}).get("name") or player_name or "Unknown player"
    stats = row or {}

    goals_total = _safe_int(stats.get("goals_total"))
    shots_total = _safe_int(stats.get("shots_total"))
    shots_on_target = _safe_int(stats.get("shots_on_target"))
    passes_key = _safe_int(stats.get("passes_key"))
    passes_accuracy = _safe_int(stats.get("passes_accuracy"))
    dribbles_success = _safe_int(stats.get("dribbles_success"))
    dribbles_attempts = _safe_int(stats.get("dribbles_attempts"))
    tackles_total = _safe_int(stats.get("tackles_total"))
    interceptions = _safe_int(stats.get("interceptions"))
    duels_won = _safe_int(stats.get("duels_won"))
    duels_total = _safe_int(stats.get("duels_total"))

    shooting = 0.55 * min(100.0, goals_total * 8.0) + 0.45 * _pct(shots_on_target, shots_total)
    passing = 0.7 * min(100.0, float(passes_accuracy)) + 0.3 * min(100.0, passes_key * 4.0)
    dribbling = _pct(dribbles_success, dribbles_attempts) if dribbles_attempts >= 5 else min(100.0, dribbles_success * 6.0)
    defending = min(100.0, (tackles_total * 3.5) + (interceptions * 4.0))
    physical = _pct(duels_won, duels_total)

    position_group = _infer_group(str(stats.get("position", "")))
    pace = {"gk": 35, "def": 62, "mid": 74, "fwd": 85}.get(position_group, 70)

    return {
        "playerName": display_name,
        "attributes": {
            "pace": _clamp_0_100(float(pace)),
            "shooting": _clamp_0_100(shooting),
            "passing": _clamp_0_100(passing),
            "dribbling": _clamp_0_100(dribbling),
            "defending": _clamp_0_100(defending),
            "physical": _clamp_0_100(physical),
        },
    }


def fetch_bar_chart_data(title: str, metric: str) -> dict[str, Any]:
    """Return top players leaderboard from season stats."""
    if _use_mock_data():
        return _mock_bar_data(title, metric)

    normalized_metric = METRIC_ALIASES.get(metric.strip().lower(), "goals_total")

    query = f"""
        WITH latest AS (
            SELECT COALESCE(MAX(season), EXTRACT(YEAR FROM NOW())::INT) AS season
            FROM player_season_stats
        )
        SELECT
            p.name AS label,
            SUM(COALESCE(pss.{normalized_metric}, 0))::INT AS value
        FROM player_season_stats pss
        JOIN players p ON p.id = pss.player_id
        WHERE pss.season = (SELECT season FROM latest)
        GROUP BY p.id, p.name
        HAVING SUM(COALESCE(pss.{normalized_metric}, 0)) > 0
        ORDER BY value DESC, p.name ASC
        LIMIT 5
    """

    try:
        rows = fetch_all(query)
    except Exception:
        rows = []

    return {
        "title": title or "Top players",
        "items": [{"label": str(row["label"]), "value": _safe_int(row["value"])} for row in rows],
        "unit": METRIC_UNITS.get(normalized_metric, normalized_metric.replace("_", " ")),
    }
