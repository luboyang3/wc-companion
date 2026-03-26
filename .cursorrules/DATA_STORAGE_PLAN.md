# Football Data Storage — Design Document

## Project Overview

This document describes the data storage layer for a **mobile football chatbot app** that
displays player profiles, team standings, fixture schedules, and AI-generated visualizations.
The app targets a small but growing user base (up to 10,000 users at launch) and is designed
to be lean, cost-effective, and easy to maintain.

**Goal:** Replace the current approach where chat tools fetch data directly from the
SportRadar API with a PostgreSQL database that serves as the single source of truth.
All backend reads — including AI chat tool data injection — will query PostgreSQL directly.

The project is split into two phases:

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Database schema, `backend/shared/db.py` connection pool, AI chat tools refactored to read from PostgreSQL | ✅ Complete |
| **Phase 2** | Cron job service that syncs data from API-Football into PostgreSQL | Pending |

---

## Architecture

```
Phase 1 (current scope)                    Phase 2 (future)
─────────────────────────                  ─────────────────
                                           [API-Football]
                                                 |
                                                 | (daily cron, ~3:00 AM UTC)
                                                 v
[Mobile App] ──► [REST API]                [Cron Job Service]
                     |                           |
                     | read-only queries         | upsert
                     v                           v
               [PostgreSQL] ◄────────────────────┘
                     ^
                     | direct SQL queries
                     |
               [AI Chat Lambda]
                     |
                     v
               [Mobile App]   (chart + text responses)
```

---

## Tech Stack

| Layer            | Choice                        | Notes                                       |
|------------------|-------------------------------|----------------------------------------------|
| Cloud platform   | Render.com                    | Cheapest managed platform, native cron       |
| Database         | PostgreSQL (Render managed)   | Starter plan (~$7/mo, 1 GB)                  |
| DB driver        | psycopg2-binary               | Python PostgreSQL adapter for Lambda + cron  |
| Data vendor      | API-Football (api-sports.io)  | REST/JSON, self-serve, free tier available   |
| Cron job         | Render Cron Job service       | Phase 2 — separate service from the API      |
| Mobile platform  | TBD                           | iOS / Android / cross-platform               |

---

# Phase 1 — Database & Chat Tools Refactor

## Database Schema

Always store the vendor's ID alongside your internal ID so re-syncing is simple.
Always include `created_at` and `updated_at` (or `last_synced_at`) timestamps on every table.

```sql
-- ──────────────────────────────────────────
-- Competitions / Leagues
-- ──────────────────────────────────────────
CREATE TABLE competitions (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    country          VARCHAR(100),
    logo_url         TEXT,
    season           INTEGER NOT NULL,         -- e.g. 2026
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- Teams
-- ──────────────────────────────────────────
CREATE TABLE teams (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    short_name       VARCHAR(20),
    logo_url         TEXT,
    country          VARCHAR(100),
    founded          INTEGER,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- Players (profile data)
-- ──────────────────────────────────────────
CREATE TABLE players (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    firstname        VARCHAR(100),
    lastname         VARCHAR(100),
    nationality      VARCHAR(100),
    position         VARCHAR(50),               -- Goalkeeper, Defender, Midfielder, Attacker
    date_of_birth    DATE,
    height           VARCHAR(10),               -- e.g. "185 cm"
    weight           VARCHAR(10),               -- e.g. "80 kg"
    photo_url        TEXT,
    team_id          INTEGER REFERENCES teams(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- Standings (one row per team per competition per season)
-- ──────────────────────────────────────────
CREATE TABLE standings (
    id               SERIAL PRIMARY KEY,
    competition_id   INTEGER REFERENCES competitions(id),
    team_id          INTEGER REFERENCES teams(id),
    season           INTEGER NOT NULL,
    rank             INTEGER,
    played           INTEGER DEFAULT 0,
    wins             INTEGER DEFAULT 0,
    draws            INTEGER DEFAULT 0,
    losses           INTEGER DEFAULT 0,
    goals_for        INTEGER DEFAULT 0,
    goals_against    INTEGER DEFAULT 0,
    goal_difference  INTEGER DEFAULT 0,
    points           INTEGER DEFAULT 0,
    form             VARCHAR(20),               -- e.g. "WWDLW"
    last_synced_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (competition_id, team_id, season)
);

-- ──────────────────────────────────────────
-- Fixtures / Schedules
-- ──────────────────────────────────────────
CREATE TABLE fixtures (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    competition_id   INTEGER REFERENCES competitions(id),
    home_team_id     INTEGER REFERENCES teams(id),
    away_team_id     INTEGER REFERENCES teams(id),
    kickoff_time     TIMESTAMPTZ,
    matchday         INTEGER,
    status           VARCHAR(20),               -- NS, 1H, HT, 2H, FT, AET, PEN, PST, CANC
    home_score       INTEGER,
    away_score       INTEGER,
    venue_name       VARCHAR(100),
    referee          VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- Player season stats (aggregated per competition per season)
-- Source: API-Football GET /players?id={id}&season={year}
--
-- One row per player per team per competition per season.
-- A player who transfers mid-season will have two rows
-- (one per team) for the same competition+season.
-- ──────────────────────────────────────────
CREATE TABLE player_season_stats (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER REFERENCES players(id),
    competition_id      INTEGER REFERENCES competitions(id),
    team_id             INTEGER REFERENCES teams(id),
    season              INTEGER NOT NULL,
    -- games
    appearances         INTEGER DEFAULT 0,
    lineups             INTEGER DEFAULT 0,
    minutes_played      INTEGER DEFAULT 0,
    position            VARCHAR(50),
    rating              NUMERIC(4,2),
    captain             BOOLEAN DEFAULT FALSE,
    -- substitutes
    subs_in             INTEGER DEFAULT 0,
    subs_out            INTEGER DEFAULT 0,
    bench               INTEGER DEFAULT 0,
    -- shots
    shots_total         INTEGER DEFAULT 0,
    shots_on_target     INTEGER DEFAULT 0,
    -- goals
    goals_total         INTEGER DEFAULT 0,
    goals_conceded      INTEGER DEFAULT 0,      -- relevant for goalkeepers
    goal_assists        INTEGER DEFAULT 0,
    goal_saves          INTEGER,                 -- NULL for outfield players
    -- passes
    passes_total        INTEGER DEFAULT 0,
    passes_key          INTEGER DEFAULT 0,
    passes_accuracy     INTEGER,                 -- percentage 0-100
    -- tackles
    tackles_total       INTEGER DEFAULT 0,
    tackles_blocks      INTEGER DEFAULT 0,
    interceptions       INTEGER DEFAULT 0,
    -- duels
    duels_total         INTEGER DEFAULT 0,
    duels_won           INTEGER DEFAULT 0,
    -- dribbles
    dribbles_attempts   INTEGER DEFAULT 0,
    dribbles_success    INTEGER DEFAULT 0,
    -- fouls
    fouls_drawn         INTEGER DEFAULT 0,
    fouls_committed     INTEGER DEFAULT 0,
    -- cards
    yellow_cards        INTEGER DEFAULT 0,
    yellow_red_cards    INTEGER DEFAULT 0,
    red_cards           INTEGER DEFAULT 0,
    -- penalty
    penalty_won         INTEGER DEFAULT 0,
    penalty_committed   INTEGER DEFAULT 0,
    penalty_scored      INTEGER DEFAULT 0,
    penalty_missed      INTEGER DEFAULT 0,
    penalty_saved       INTEGER DEFAULT 0,
    -- meta
    last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, competition_id, team_id, season)
);

-- ──────────────────────────────────────────
-- Player match stats (one row per player per fixture)
-- Source: API-Football GET /fixtures/players?fixture={id}
-- ──────────────────────────────────────────
CREATE TABLE player_match_stats (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER REFERENCES players(id),
    fixture_id          INTEGER REFERENCES fixtures(id),
    team_id             INTEGER REFERENCES teams(id),
    minutes_played      INTEGER,
    position            VARCHAR(50),
    rating              NUMERIC(4,2),              -- e.g. 7.40
    offsides            INTEGER DEFAULT 0,
    -- shots
    shots_total         INTEGER DEFAULT 0,
    shots_on_target     INTEGER DEFAULT 0,
    -- goals
    goals              INTEGER DEFAULT 0,
    goal_assists       INTEGER DEFAULT 0,
    goals_conceded     INTEGER DEFAULT 0,
    goal_saves         INTEGER,                    -- NULL for outfield players
    -- passes
    passes_total       INTEGER DEFAULT 0,
    passes_accuracy    INTEGER,                    -- percentage 0-100
    key_passes         INTEGER DEFAULT 0,
    -- tackles
    tackles            INTEGER DEFAULT 0,
    tackles_blocks     INTEGER DEFAULT 0,
    interceptions      INTEGER DEFAULT 0,
    -- duels
    duels_total        INTEGER DEFAULT 0,
    duels_won          INTEGER DEFAULT 0,
    -- dribbles
    dribbles_attempts  INTEGER DEFAULT 0,
    dribbles_success   INTEGER DEFAULT 0,
    dribbles_past      INTEGER DEFAULT 0,
    -- fouls
    fouls_drawn        INTEGER DEFAULT 0,
    fouls_committed    INTEGER DEFAULT 0,
    -- cards
    yellow_cards       INTEGER DEFAULT 0,
    red_cards          INTEGER DEFAULT 0,
    -- penalty
    penalty_won        INTEGER DEFAULT 0,
    penalty_committed  INTEGER DEFAULT 0,
    penalty_scored     INTEGER DEFAULT 0,
    penalty_missed     INTEGER DEFAULT 0,
    penalty_saved      INTEGER DEFAULT 0,
    -- meta
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, fixture_id)
);

-- ──────────────────────────────────────────
-- Fixture team stats (one row per team per fixture = two rows per match)
-- Source: API-Football GET /fixtures/statistics?fixture={id}
-- ──────────────────────────────────────────
CREATE TABLE fixture_team_stats (
    id                  SERIAL PRIMARY KEY,
    fixture_id          INTEGER REFERENCES fixtures(id),
    team_id             INTEGER REFERENCES teams(id),
    shots_on_goal       INTEGER,
    shots_off_goal      INTEGER,
    total_shots         INTEGER,
    blocked_shots       INTEGER,
    shots_inside_box    INTEGER,
    shots_outside_box   INTEGER,
    fouls               INTEGER,
    corner_kicks        INTEGER,
    offsides            INTEGER,
    ball_possession     INTEGER,                   -- percentage 0-100
    yellow_cards        INTEGER,
    red_cards           INTEGER,
    goalkeeper_saves    INTEGER,
    total_passes        INTEGER,
    passes_accurate     INTEGER,
    passes_pct          INTEGER,                   -- percentage 0-100
    expected_goals      NUMERIC(4,2),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fixture_id, team_id)
);
```

---

## Chat Tools Data Injection — Implemented State ✅

All data reads go through PostgreSQL. The AI Lambda connects directly to the database
(no intermediate REST layer) for simplicity and lower latency.

```
[AI Chat Lambda]
      |
      | psycopg2 — direct SQL queries
      v
[PostgreSQL]
```

| Component | Implemented behaviour |
|-----------|----------------------|
| `backend/shared/db.py` | `SimpleConnectionPool` via `DATABASE_URL`; exposes `fetch_all` / `fetch_one` |
| `backend/lambdas/ai/chart_data.py` | Queries PostgreSQL for formation, radar, and bar chart data. Falls back to hardcoded mock data when `USE_MOCK_CHART_DATA=true` (default while DB is unseeded) |
| `backend/lambdas/ai/handler.py` `_build_match_context()` | Queries `fixtures` + `teams` for today's kickoffs; returns `NO_MATCH_DATA_CONTEXT` sentinel when DB is empty or unreachable |
| `backend/lambdas/ai/handler.py` `_resolve_response_source()` | Returns `"football db"` when real match context was found; `"ai_knowledge"` otherwise |
| SportRadar / DynamoDB cache | **Removed** — `_fetch_today_matches()`, `_get_cached_matches()`, `_set_cached_matches()`, `sportradar_api_key`, `sportradar_base_url`, `cache_table_name` all deleted |

### Chart data SQL strategies

| Function | Query strategy |
|----------|---------------|
| `fetch_formation_data(team_name)` | `ILIKE` match on `teams.name / short_name`; joins `players` + latest `player_season_stats` via `LATERAL`; maps rows onto `FORMATION_TEMPLATE` by position group |
| `fetch_player_radar_data(player_name)` | `ILIKE` match on `players.name`; pulls latest season stats via `LATERAL`; derives 6 attributes (pace is position-group default; others computed from stat columns) |
| `fetch_bar_chart_data(title, metric)` | Aggregates `player_season_stats` for the max season; top-5 by the requested `METRIC_ALIASES` column |

### Radar Attribute Derivation

The player radar chart currently uses EA FC-style attributes (pace, shooting, passing,
dribbling, defending, physical). Since API-Football provides real match statistics rather
than video-game ratings, the refactored `fetch_player_radar_data` will derive normalized
0-100 scores from season stats using position-aware scaling:

| Radar axis | Source column(s) | Notes |
|------------|-----------------|-------|
| Shooting | `goals_total`, `shots_on_target` / `shots_total` | Weighted: volume + accuracy |
| Passing | `passes_accuracy`, `passes_key` | Weighted: accuracy + creativity |
| Dribbling | `dribbles_success` / `dribbles_attempts` | Success rate, min attempts threshold |
| Defending | `tackles_total`, `interceptions` | Sum, scaled by position |
| Physical | `duels_won` / `duels_total` | Win rate |
| Pace | Not directly available | Use position-based default or omit; revisit if API-Football adds sprint data |

---

## Environment Variables

```bash
# Database (Phase 1)
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_POOL_MIN=1
DB_POOL_MAX=5

# Chart data mock mode — set false once DATABASE_URL is configured and DB is seeded
USE_MOCK_CHART_DATA=true

# AI
ANTHROPIC_API_KEY=

# API-Football (Phase 2 — cron job only)
# API_FOOTBALL_KEY=           # uncomment when cron job is built
```

---

## Out of Scope (for now)

The following are intentionally excluded from the initial build. Do not implement them
unless explicitly asked:

- Live / real-time match data (WebSockets, push feeds)
- Redis caching layer (revisit at > 10K users)
- User accounts, authentication, or personalisation
- Push notifications
- EA FC / FIFA attribute ratings
- Betting odds or predictions (available in API-Football but not in scope)

---

# Phase 2 — Cron Job Service

The cron job is a **separate service** from the REST API. It runs on Render as its own
deployment, connects directly to PostgreSQL, and is responsible for keeping the database
in sync with API-Football.

Until Phase 2 is built, the database can be seeded manually or via one-off scripts.

## Schedule

```
3:00 AM UTC  →  sync_standings        — upsert standings for all tracked leagues
3:15 AM UTC  →  sync_fixtures         — upsert upcoming fixtures (next 14 days) + update
                                        scores for yesterday's completed matches
3:30 AM UTC  →  sync_match_stats      — fetch player + team stats for fixtures completed yesterday
3:45 AM UTC  →  sync_season_stats     — upsert player season stats for all tracked competitions
4:00 AM UTC  →  sync_player_profiles  — update player profiles (run weekly, not daily)
```

## Key Rules for All Cron Jobs

1. **Always upsert, never plain insert.** Use `INSERT ... ON CONFLICT DO UPDATE` so re-runs
   are safe and idempotent.
2. **Track `last_synced_at`** on every table so you can detect stale data easily.
3. **Respect rate limits.** Add a short delay (e.g. 200 ms) between API calls when looping
   over multiple leagues or fixtures.
4. **Log everything.** Each sync job should log: start time, records fetched, records upserted,
   errors, and end time.
5. **Handle nulls from API-Football.** Many stat fields return `null` — coerce to `0` or
   keep `null` based on the field's meaning (e.g. `goal_saves` should be `null` for outfield
   players, not `0`).
6. **Never delete rows.** Use `status` flags or soft deletes if data becomes irrelevant.

## Example Upsert Pattern (Python / psycopg2)

```python
INSERT INTO standings (
    competition_id, team_id, season, rank, played, wins, draws, losses,
    goals_for, goals_against, goal_difference, points, form, last_synced_at
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
ON CONFLICT (competition_id, team_id, season)
DO UPDATE SET
    rank            = EXCLUDED.rank,
    played          = EXCLUDED.played,
    wins            = EXCLUDED.wins,
    draws           = EXCLUDED.draws,
    losses          = EXCLUDED.losses,
    goals_for       = EXCLUDED.goals_for,
    goals_against   = EXCLUDED.goals_against,
    goal_difference = EXCLUDED.goal_difference,
    points          = EXCLUDED.points,
    form            = EXCLUDED.form,
    last_synced_at  = NOW();
```

## Phase 2 Environment Variables

```bash
# API-Football
API_FOOTBALL_KEY=            # required for cron job
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

# Database (same as Phase 1)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```
