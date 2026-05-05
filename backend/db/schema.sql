-- Football data schema (Phase 1 + Phase 2: match-detail, live data, preview entities)
-- All fields sourced from API-Football v3 — see plan for endpoint-to-column mapping.
-- Idempotent: safe to re-run via apply_schema.py.

-- ============================================================
-- Core tables (original + inline additions for new columns)
-- ============================================================

CREATE TABLE IF NOT EXISTS competitions (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    country          VARCHAR(100),
    logo_url         TEXT,
    season           INTEGER NOT NULL,
    type             VARCHAR(10),
    start_date       DATE,
    end_date         DATE,
    coverage_json    JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(150) NOT NULL,
    address          TEXT,
    city             VARCHAR(100),
    country          VARCHAR(100),
    capacity         INTEGER,
    surface          VARCHAR(50),
    image_url        TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    short_name       VARCHAR(20),
    logo_url         TEXT,
    country          VARCHAR(100),
    founded          INTEGER,
    national         BOOLEAN DEFAULT FALSE,
    home_venue_id    INTEGER REFERENCES venues(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coaches (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    firstname        VARCHAR(100),
    lastname         VARCHAR(100),
    date_of_birth    DATE,
    nationality      VARCHAR(100),
    photo_url        TEXT,
    team_id          INTEGER REFERENCES teams(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    firstname        VARCHAR(100),
    lastname         VARCHAR(100),
    nationality      VARCHAR(100),
    position         VARCHAR(50),
    date_of_birth    DATE,
    height           VARCHAR(10),
    weight           VARCHAR(10),
    photo_url        TEXT,
    team_id          INTEGER REFERENCES teams(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standings (
    id               SERIAL PRIMARY KEY,
    competition_id   INTEGER REFERENCES competitions(id),
    team_id          INTEGER REFERENCES teams(id),
    season           INTEGER NOT NULL,
    group_label      VARCHAR(10),
    rank             INTEGER,
    played           INTEGER DEFAULT 0,
    wins             INTEGER DEFAULT 0,
    draws            INTEGER DEFAULT 0,
    losses           INTEGER DEFAULT 0,
    goals_for        INTEGER DEFAULT 0,
    goals_against    INTEGER DEFAULT 0,
    goal_difference  INTEGER DEFAULT 0,
    points           INTEGER DEFAULT 0,
    form             VARCHAR(20),
    status           VARCHAR(8),
    description      TEXT,
    home_played      INTEGER DEFAULT 0,
    home_wins        INTEGER DEFAULT 0,
    home_draws       INTEGER DEFAULT 0,
    home_losses      INTEGER DEFAULT 0,
    home_goals_for   INTEGER DEFAULT 0,
    home_goals_against INTEGER DEFAULT 0,
    away_played      INTEGER DEFAULT 0,
    away_wins        INTEGER DEFAULT 0,
    away_draws       INTEGER DEFAULT 0,
    away_losses      INTEGER DEFAULT 0,
    away_goals_for   INTEGER DEFAULT 0,
    away_goals_against INTEGER DEFAULT 0,
    last_update      TIMESTAMPTZ,
    last_synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixtures (
    id               SERIAL PRIMARY KEY,
    api_football_id  INTEGER UNIQUE NOT NULL,
    competition_id   INTEGER REFERENCES competitions(id),
    home_team_id     INTEGER REFERENCES teams(id),
    away_team_id     INTEGER REFERENCES teams(id),
    venue_id         INTEGER REFERENCES venues(id),
    kickoff_time     TIMESTAMPTZ,
    kickoff_timestamp BIGINT,
    matchday         INTEGER,
    round_label      VARCHAR(50),
    group_label      VARCHAR(10),
    status           VARCHAR(20),
    status_short     VARCHAR(8),
    status_long      VARCHAR(40),
    status_elapsed   INTEGER,
    status_extra     INTEGER,
    home_score       INTEGER,
    away_score       INTEGER,
    ht_home          INTEGER,
    ht_away          INTEGER,
    et_home          INTEGER,
    et_away          INTEGER,
    pen_home         INTEGER,
    pen_away         INTEGER,
    venue_name       VARCHAR(100),
    referee          VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_season_stats (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER REFERENCES players(id),
    competition_id      INTEGER REFERENCES competitions(id),
    team_id             INTEGER REFERENCES teams(id),
    season              INTEGER NOT NULL,
    appearances         INTEGER DEFAULT 0,
    lineups             INTEGER DEFAULT 0,
    minutes_played      INTEGER DEFAULT 0,
    position            VARCHAR(50),
    rating              NUMERIC(4,2),
    captain             BOOLEAN DEFAULT FALSE,
    subs_in             INTEGER DEFAULT 0,
    subs_out            INTEGER DEFAULT 0,
    bench               INTEGER DEFAULT 0,
    shots_total         INTEGER DEFAULT 0,
    shots_on_target     INTEGER DEFAULT 0,
    goals_total         INTEGER DEFAULT 0,
    goals_conceded      INTEGER DEFAULT 0,
    goal_assists        INTEGER DEFAULT 0,
    goal_saves          INTEGER,
    passes_total        INTEGER DEFAULT 0,
    passes_key          INTEGER DEFAULT 0,
    passes_accuracy     INTEGER,
    tackles_total       INTEGER DEFAULT 0,
    tackles_blocks      INTEGER DEFAULT 0,
    interceptions       INTEGER DEFAULT 0,
    duels_total         INTEGER DEFAULT 0,
    duels_won           INTEGER DEFAULT 0,
    dribbles_attempts   INTEGER DEFAULT 0,
    dribbles_success    INTEGER DEFAULT 0,
    fouls_drawn         INTEGER DEFAULT 0,
    fouls_committed     INTEGER DEFAULT 0,
    yellow_cards        INTEGER DEFAULT 0,
    yellow_red_cards    INTEGER DEFAULT 0,
    red_cards           INTEGER DEFAULT 0,
    penalty_won         INTEGER DEFAULT 0,
    penalty_committed   INTEGER DEFAULT 0,
    penalty_scored      INTEGER DEFAULT 0,
    penalty_missed      INTEGER DEFAULT 0,
    penalty_saved       INTEGER DEFAULT 0,
    last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, competition_id, team_id, season)
);

CREATE TABLE IF NOT EXISTS player_match_stats (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER REFERENCES players(id),
    fixture_id          INTEGER REFERENCES fixtures(id),
    team_id             INTEGER REFERENCES teams(id),
    minutes_played      INTEGER,
    position            VARCHAR(50),
    rating              NUMERIC(4,2),
    captain             BOOLEAN,
    substitute          BOOLEAN,
    shirt_number        INTEGER,
    offsides            INTEGER,
    shots_total         INTEGER,
    shots_on_target     INTEGER,
    goals               INTEGER,
    goal_assists        INTEGER,
    goals_conceded      INTEGER,
    goal_saves          INTEGER,
    passes_total        INTEGER,
    passes_accuracy     INTEGER,
    key_passes          INTEGER,
    tackles             INTEGER,
    tackles_blocks      INTEGER,
    interceptions       INTEGER,
    duels_total         INTEGER,
    duels_won           INTEGER,
    dribbles_attempts   INTEGER,
    dribbles_success    INTEGER,
    dribbles_past       INTEGER,
    fouls_drawn         INTEGER,
    fouls_committed     INTEGER,
    yellow_cards        INTEGER,
    red_cards           INTEGER,
    penalty_won         INTEGER,
    penalty_committed   INTEGER,
    penalty_scored      INTEGER,
    penalty_missed      INTEGER,
    penalty_saved       INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, fixture_id)
);

CREATE TABLE IF NOT EXISTS fixture_team_stats (
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
    ball_possession     INTEGER,
    yellow_cards        INTEGER,
    red_cards           INTEGER,
    goalkeeper_saves    INTEGER,
    total_passes        INTEGER,
    passes_accurate     INTEGER,
    passes_pct          INTEGER,
    expected_goals      NUMERIC(4,2),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fixture_id, team_id)
);

-- ============================================================
-- New tables: match events, lineups, injuries, predictions
-- ============================================================

CREATE TABLE IF NOT EXISTS fixture_events (
    id                  SERIAL PRIMARY KEY,
    fixture_id          INTEGER NOT NULL REFERENCES fixtures(id),
    team_id             INTEGER REFERENCES teams(id),
    player_id           INTEGER REFERENCES players(id),
    assist_player_id    INTEGER REFERENCES players(id),
    minute              INTEGER NOT NULL,
    extra_minute        INTEGER,
    type                VARCHAR(10) NOT NULL,
    detail              VARCHAR(40),
    comments            TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixture_lineups (
    id                  SERIAL PRIMARY KEY,
    fixture_id          INTEGER NOT NULL REFERENCES fixtures(id),
    team_id             INTEGER NOT NULL REFERENCES teams(id),
    formation           VARCHAR(10),
    coach_id            INTEGER REFERENCES coaches(id),
    last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fixture_id, team_id)
);

CREATE TABLE IF NOT EXISTS fixture_lineup_players (
    id                  SERIAL PRIMARY KEY,
    fixture_lineup_id   INTEGER NOT NULL REFERENCES fixture_lineups(id) ON DELETE CASCADE,
    player_id           INTEGER NOT NULL REFERENCES players(id),
    shirt_number        INTEGER,
    position            CHAR(1),
    grid                VARCHAR(5),
    is_starting         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (fixture_lineup_id, player_id)
);

CREATE TABLE IF NOT EXISTS injuries (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER NOT NULL REFERENCES players(id),
    team_id             INTEGER REFERENCES teams(id),
    fixture_id          INTEGER REFERENCES fixtures(id),
    competition_id      INTEGER REFERENCES competitions(id),
    season              INTEGER,
    type                VARCHAR(32),
    reason              TEXT,
    last_synced_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
    id                  SERIAL PRIMARY KEY,
    fixture_id          INTEGER NOT NULL REFERENCES fixtures(id) UNIQUE,
    winner_team_id      INTEGER REFERENCES teams(id),
    winner_comment      TEXT,
    win_or_draw         BOOLEAN,
    under_over          VARCHAR(8),
    advice              TEXT,
    percent_home        NUMERIC(5,2),
    percent_draw        NUMERIC(5,2),
    percent_away        NUMERIC(5,2),
    comparison_json     JSONB,
    last_synced_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALTER TABLE additions for existing databases
-- These are idempotent (ADD COLUMN IF NOT EXISTS, Postgres 9.6+)
-- so re-running apply_schema.py on an already-migrated DB is safe.
-- ============================================================

-- competitions
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS type VARCHAR(10);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS coverage_json JSONB;

-- teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS national BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_venue_id INTEGER REFERENCES venues(id);

-- fixtures
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS venue_id INTEGER REFERENCES venues(id);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS kickoff_timestamp BIGINT;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS round_label VARCHAR(50);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS group_label VARCHAR(10);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS status_short VARCHAR(8);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS status_long VARCHAR(40);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS status_elapsed INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS status_extra INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS ht_home INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS ht_away INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS et_home INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS et_away INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS pen_home INTEGER;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS pen_away INTEGER;

-- standings
ALTER TABLE standings ADD COLUMN IF NOT EXISTS group_label VARCHAR(10);
ALTER TABLE standings ADD COLUMN IF NOT EXISTS status VARCHAR(8);
ALTER TABLE standings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_played INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_wins INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_draws INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_losses INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_goals_for INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS home_goals_against INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_played INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_wins INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_draws INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_losses INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_goals_for INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS away_goals_against INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS last_update TIMESTAMPTZ;

-- player_match_stats
ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS captain BOOLEAN;
ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS substitute BOOLEAN;
ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS shirt_number INTEGER;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff_timestamp
    ON fixtures (kickoff_timestamp);

CREATE INDEX IF NOT EXISTS idx_fixtures_status_short
    ON fixtures (status_short);

CREATE INDEX IF NOT EXISTS idx_fixture_events_timeline
    ON fixture_events (fixture_id, minute, extra_minute);

CREATE INDEX IF NOT EXISTS idx_injuries_fixture
    ON injuries (fixture_id);

CREATE INDEX IF NOT EXISTS idx_standings_group_rank
    ON standings (competition_id, season, group_label, rank);

CREATE UNIQUE INDEX IF NOT EXISTS uq_standings_comp_team_season_group
    ON standings (competition_id, team_id, season, COALESCE(group_label, ''));
