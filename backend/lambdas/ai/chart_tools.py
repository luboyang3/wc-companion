"""Chart tool definitions and dispatch helpers for Claude tool use."""

from __future__ import annotations

from typing import Any

from chart_data import (
    fetch_bar_chart_data,
    fetch_formation_data,
    fetch_player_radar_data,
)

CHART_TOOLS: list[dict[str, Any]] = [
    {
        "name": "show_formation",
        "description": "Display a team formation diagram with player positions on the pitch.",
        "input_schema": {
            "type": "object",
            "properties": {
                "team_name": {"type": "string"},
            },
            "required": ["team_name"],
        },
    },
    {
        "name": "show_player_radar",
        "description": (
            "Display a player attribute radar chart with pace, shooting, passing, "
            "dribbling, defending, and physical."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "player_name": {"type": "string"},
            },
            "required": ["player_name"],
        },
    },
    {
        "name": "show_bar_chart",
        "description": "Display a bar chart comparing players or teams on a statistic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "metric": {
                    "type": "string",
                    "enum": [
                        "goals",
                        "assists",
                        "passes",
                        "tackles",
                        "goals_total",
                        "goal_assists",
                        "passes_total",
                        "tackles_total",
                        "interceptions",
                        "shots_on_target",
                        "minutes_played",
                    ],
                },
            },
            "required": ["title", "metric"],
        },
    },
]


def _formation_tool_payload(input_data: dict[str, Any]) -> dict[str, Any]:
    team_name = str(input_data.get("team_name", "Brazil"))
    data = fetch_formation_data(team_name)
    return {
        "chartType": "formation",
        "title": f"{team_name} Formation ({data.get('formation', '4-3-3')})",
        "data": data,
    }


def _player_radar_tool_payload(input_data: dict[str, Any]) -> dict[str, Any]:
    player_name = str(input_data.get("player_name", "Vinicius Jr."))
    data = fetch_player_radar_data(player_name)
    return {
        "chartType": "player_radar",
        "title": f"{data.get('playerName', player_name)} Attribute Radar",
        "data": data,
    }


def _bar_tool_payload(input_data: dict[str, Any]) -> dict[str, Any]:
    title = str(input_data.get("title", "Top players"))
    metric = str(input_data.get("metric", "goals"))
    data = fetch_bar_chart_data(title=title, metric=metric)
    return {
        "chartType": "bar",
        "title": title,
        "data": data,
    }


TOOL_HANDLERS: dict[str, Any] = {
    "show_formation": _formation_tool_payload,
    "show_player_radar": _player_radar_tool_payload,
    "show_bar_chart": _bar_tool_payload,
}


def resolve_chart_from_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any] | None:
    """Map a tool call to a chart payload consumable by the frontend."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return None
    return handler(tool_input)
