"""Chart data providers for AI chat visualizations.

Current implementation uses mock datasets so frontend rendering and tool
plumbing can be developed before Sportradar-backed endpoints are available.
"""

from __future__ import annotations

import os
from typing import Any


def _use_mock_data() -> bool:
    raw = os.environ.get("USE_MOCK_CHART_DATA", "true").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def fetch_formation_data(team_name: str) -> dict[str, Any]:
    """Return formation data for a team."""
    # Real data wiring can replace this branch while keeping output contract.
    if not _use_mock_data():
        return {
            "formation": "4-3-3",
            "players": [],
        }

    squad_by_team: dict[str, list[dict[str, Any]]] = {
        "brazil": [
            {"name": "Alisson", "position": "GK", "x": 50, "y": 92},
            {"name": "Danilo", "position": "RB", "x": 82, "y": 74},
            {"name": "Marquinhos", "position": "CB", "x": 62, "y": 76},
            {"name": "Gabriel", "position": "CB", "x": 38, "y": 76},
            {"name": "Guilherme Arana", "position": "LB", "x": 18, "y": 74},
            {"name": "Bruno Guimaraes", "position": "CM", "x": 50, "y": 58},
            {"name": "Paqueta", "position": "CM", "x": 35, "y": 56},
            {"name": "Douglas Luiz", "position": "CM", "x": 65, "y": 56},
            {"name": "Raphinha", "position": "RW", "x": 80, "y": 36},
            {"name": "Vinicius Jr.", "position": "LW", "x": 20, "y": 36},
            {"name": "Rodrygo", "position": "ST", "x": 50, "y": 24},
        ],
        "argentina": [
            {"name": "Martinez", "position": "GK", "x": 50, "y": 92},
            {"name": "Molina", "position": "RB", "x": 82, "y": 74},
            {"name": "Romero", "position": "CB", "x": 62, "y": 76},
            {"name": "Lisandro Martinez", "position": "CB", "x": 38, "y": 76},
            {"name": "Tagliafico", "position": "LB", "x": 18, "y": 74},
            {"name": "De Paul", "position": "CM", "x": 62, "y": 56},
            {"name": "Enzo Fernandez", "position": "CM", "x": 50, "y": 58},
            {"name": "Mac Allister", "position": "CM", "x": 38, "y": 56},
            {"name": "Messi", "position": "RW", "x": 74, "y": 36},
            {"name": "Julian Alvarez", "position": "ST", "x": 50, "y": 24},
            {"name": "Nico Gonzalez", "position": "LW", "x": 26, "y": 36},
        ],
    }

    players = squad_by_team.get(team_name.strip().lower()) or squad_by_team["brazil"]
    return {
        "formation": "4-3-3",
        "players": players,
    }


def fetch_player_radar_data(player_name: str) -> dict[str, Any]:
    """Return player radar attributes on a 0-100 scale."""
    if not _use_mock_data():
        return {
            "playerName": player_name or "Unknown player",
            "attributes": {
                "pace": 0,
                "shooting": 0,
                "passing": 0,
                "dribbling": 0,
                "defending": 0,
                "physical": 0,
            },
        }

    radar_by_player = {
        "vinicius jr.": {
            "pace": 95,
            "shooting": 83,
            "passing": 78,
            "dribbling": 92,
            "defending": 33,
            "physical": 71,
        },
        "messi": {
            "pace": 80,
            "shooting": 88,
            "passing": 92,
            "dribbling": 91,
            "defending": 38,
            "physical": 66,
        },
        "mbappe": {
            "pace": 97,
            "shooting": 89,
            "passing": 81,
            "dribbling": 90,
            "defending": 40,
            "physical": 78,
        },
    }
    key = player_name.strip().lower()
    attributes = radar_by_player.get(key) or radar_by_player["vinicius jr."]
    return {
        "playerName": player_name or "Vinicius Jr.",
        "attributes": attributes,
    }


def fetch_bar_chart_data(title: str, metric: str) -> dict[str, Any]:
    """Return leaderboard-like bar chart data."""
    normalized_metric = metric.strip().lower()
    if not _use_mock_data():
        return {"items": [], "unit": ""}

    data_by_metric: dict[str, dict[str, Any]] = {
        "goals": {
            "unit": "goals",
            "items": [
                {"label": "Mbappe", "value": 8},
                {"label": "Messi", "value": 7},
                {"label": "Alvarez", "value": 4},
                {"label": "Giroud", "value": 4},
                {"label": "Saka", "value": 3},
            ],
        },
        "assists": {
            "unit": "assists",
            "items": [
                {"label": "Griezmann", "value": 4},
                {"label": "Messi", "value": 3},
                {"label": "Perisic", "value": 3},
                {"label": "Bruno Fernandes", "value": 3},
                {"label": "Kane", "value": 3},
            ],
        },
        "passes": {
            "unit": "passes",
            "items": [
                {"label": "Rodri", "value": 612},
                {"label": "Stones", "value": 576},
                {"label": "Otamendi", "value": 544},
                {"label": "Ake", "value": 533},
                {"label": "De Jong", "value": 507},
            ],
        },
        "clean_sheets": {
            "unit": "clean sheets",
            "items": [
                {"label": "Emi Martinez", "value": 3},
                {"label": "Livakovic", "value": 3},
                {"label": "Bounou", "value": 3},
                {"label": "Pickford", "value": 3},
                {"label": "Lloris", "value": 2},
            ],
        },
        "tackles": {
            "unit": "tackles",
            "items": [
                {"label": "Amrabat", "value": 22},
                {"label": "Bellingham", "value": 19},
                {"label": "Enzo Fernandez", "value": 18},
                {"label": "Gvardiol", "value": 16},
                {"label": "Theo Hernandez", "value": 15},
            ],
        },
    }
    selected = data_by_metric.get(normalized_metric) or data_by_metric["goals"]
    return {
        "title": title or "Top players",
        "items": selected["items"],
        "unit": selected["unit"],
    }
