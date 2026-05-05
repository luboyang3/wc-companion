# API-Football Polling and Cron Jobs

> Implementation plan for syncing all 15 database tables from API-Football v3, organized into cadence tiers (bootstrap, daily, hourly, live match), with a shared HTTP client, rate limiting, and a local scheduler.

## 1. Architecture overview

The system is split into **four cadence tiers**, a **shared API-Football client** with rate limiting, and a **scheduler daemon** for local dev. Each tier is a standalone Python module that can be invoked independently (as a script) or orchestrated by the scheduler.

```
                    ┌─────────────────────────┐
                    │   poll_daemon.py         │
                    │   (APScheduler)          │
                    └────┬───┬───┬───┬────────┘
                         │   │   │   │
          ┌──────────────┘   │   │   └──────────────┐
          ▼                  ▼   ▼                  ▼
  sync_bootstrap.py   sync_daily.py  sync_hourly.py  sync_live.py
  (once / weekly)     (every 24h)    (every 1h)      (every 15-60s)
          │                  │            │               │
          └──────────┬───────┴────────────┴───────────────┘
                     ▼
          api_football_client.py  ──►  API-Football v3
          (HTTP + rate limit)          (x-apisports-key)
                     │
                     ▼
                   db.py  ──►  PostgreSQL / Supabase
```

For production (post-Amplify migration), each tier becomes a Lambda triggered by an EventBridge schedule rule -- but we don't build that now.

---

## 2. Shared API-Football client

Create `backend/shared/api_football_client.py`.

**Responsibilities:**
- Single `get(endpoint, params)` method wrapping `requests.get`
- Reads `API_FOOTBALL_KEY` and `API_FOOTBALL_BASE_URL` from env
- **Per-minute rate limiter:** track calls in a sliding window, sleep when approaching the limit. Read `X-RateLimit-Remaining` and `x-ratelimit-requests-remaining` from every response header.
- **Retry with backoff:** on HTTP 429 (rate limit) and 500/499 (server error), retry up to 3 times with exponential backoff (1s, 2s, 4s).
- **Daily quota guard:** read `x-ratelimit-requests-remaining` from response headers; log a warning at 20% remaining, raise `QuotaExhaustedError` at 0.
- **Error extraction:** check `response["errors"]` (can be a non-empty list or dict) before returning `response["response"]`.
- **Pagination helper:** `get_all_pages(endpoint, params)` that follows `paging.total` and yields all pages, sleeping between pages.
- Logging with `logging.getLogger("api_football")`.

This replaces the inline `requests.get` calls in the existing seed scripts. The existing seed scripts (`seed_real_madrid_from_api.py`, `seed_rm_trio_season_2026.py`) should be refactored to import from this client, but that's a follow-up -- the new sync scripts use it from the start.

---

## 3. Per-table detail: endpoint, cadence, upsert strategy

### Tier 1: Bootstrap (run once, then weekly) -- `sync_bootstrap.py`

These are reference/static entities that rarely change. Run once to cold-start the DB, then weekly as a refresh.

| Table | API Endpoint | Params | Calls | Upsert Key |
|-------|-------------|--------|-------|------------|
| `competitions` | `GET /leagues` | `id=1&season=2026` | 1 | `ON CONFLICT (api_football_id)` |
| `venues` | `GET /venues` | `country=USA`, `country=Canada`, `country=Mexico` (3 calls) | 3 | `ON CONFLICT (api_football_id)` |
| `teams` | `GET /teams` | `league=1&season=2026` | 1 | `ON CONFLICT (api_football_id)`. Also upsert `home_venue_id` from the inline `venue.id` on response. |

**Total calls per run: ~5**

Field mappings:
- **`competitions`**: `league.id` -> `api_football_id`, `league.name` -> `name`, `league.type` -> `type`, `country.name` -> `country`, `league.logo` -> `logo_url`, `seasons[0].start` -> `start_date`, `seasons[0].end` -> `end_date`, `seasons[0].coverage` -> `coverage_json`. `season` param -> `season`.
- **`venues`**: Direct 1:1 mapping (`id`, `name`, `address`, `city`, `country`, `capacity`, `surface`, `image` -> `image_url`).
- **`teams`**: `team.id` -> `api_football_id`, `team.name` -> `name`, `team.code` -> `short_name`, `team.logo` -> `logo_url`, `team.country` -> `country`, `team.founded` -> `founded`, `team.national` -> `national`. After upsert, resolve `venue.id` from the inline venue to set `home_venue_id` FK.

---

### Tier 2: Daily (every 24h, 06:00 UTC) -- `sync_daily.py`

Entities that change at most daily. Run at a fixed time each day.

| Table | API Endpoint | Params | Calls | Upsert Key |
|-------|-------------|--------|-------|------------|
| `coaches` | `GET /coachs` | `team={team_id}` for each of 48 WC teams | 48 | `ON CONFLICT (api_football_id)` |
| `players` | `GET /players/squads` | `team={team_id}` x48 (roster only, no stats) | 48 | `ON CONFLICT (api_football_id)` |
| `player_season_stats` | `GET /players` | `team={team_id}&season=2026` x48 (paginated, ~2-3 pages each) | ~144 | `ON CONFLICT (player_id, competition_id, team_id, season)` |
| `fixtures` | `GET /fixtures` | `league=1&season=2026` (all 104 fixtures in one call) | 1 | `ON CONFLICT (api_football_id)`. Populates all score/status/round/venue fields. Also back-fills `group_label` from standings. |
| `injuries` | `GET /injuries` | `league=1&season=2026` | 1 | Delete-and-replace for the league+season (injuries are a snapshot, not append-only). |

**Total calls per run: ~242** (fits comfortably in Pro-tier 7,500/day)

Field mappings for new tables:
- **`coaches`**: `id` -> `api_football_id`, `name`, `firstname`, `lastname`, `birth.date` -> `date_of_birth`, `nationality`, `photo` -> `photo_url`. `team.id` -> resolve to internal `team_id` via `teams.api_football_id`.
- **`players`** (from `/players/squads`): `id` -> `api_football_id`, `name`, `age`, `number`, `position`, `photo` -> `photo_url`. Update `team_id` FK.
- **`player_season_stats`** (from `/players`): `player.id` -> resolve to `player_id`; each `statistics[]` block maps to one row keyed by `(player_id, competition_id, team_id, season)`. Map `games.appearences` -> `appearances` (note API typo), `games.lineups` -> `lineups`, `games.minutes` -> `minutes_played`, `games.rating` -> `rating` (parse string to numeric), `substitutes.in/out/bench` -> `subs_in/subs_out/bench`, `shots.total/on` -> `shots_total/shots_on_target`, `goals.total/conceded/assists/saves` -> `goals_total/goals_conceded/goal_assists/goal_saves`, `passes.total/key/accuracy` -> `passes_total/passes_key/passes_accuracy` (accuracy may be string or int), `tackles.total/blocks/interceptions` -> `tackles_total/tackles_blocks/interceptions`, `duels.total/won`, `dribbles.attempts/success`, `fouls.drawn/committed`, `cards.yellow/yellowred/red` -> `yellow_cards/yellow_red_cards/red_cards`, `penalty.won/commited/scored/missed/saved` (note API typo `commited`) -> `penalty_won/penalty_committed/penalty_scored/penalty_missed/penalty_saved`.
- **`injuries`**: `player.id` -> resolve `player_id`; `team.id` -> resolve `team_id`; `fixture.id` -> resolve `fixture_id` (nullable); `league.id` -> resolve `competition_id`; `league.season` -> `season`; `player.type` -> `type`; `player.reason` -> `reason`.
- **`fixtures`** daily refresh writes all columns including new ones: `fixture.venue.id` -> resolve `venue_id`; `league.round` -> `round_label`; `fixture.status.short/long/elapsed/extra` -> `status_short/status_long/status_elapsed/status_extra`; `fixture.timestamp` -> `kickoff_timestamp`; `score.halftime.home/away` -> `ht_home/ht_away`; `score.extratime.home/away` -> `et_home/et_away`; `score.penalty.home/away` -> `pen_home/pen_away`; `goals.home/away` -> `home_score/away_score`; `fixture.referee` -> `referee`; `fixture.venue.name` -> `venue_name` (backcompat).

---

### Tier 3: Hourly (every 60 min during tournament) -- `sync_hourly.py`

| Table | API Endpoint | Params | Calls | Upsert Key |
|-------|-------------|--------|-------|------------|
| `standings` | `GET /standings` | `league=1&season=2026` | 1 | `ON CONFLICT` on the unique index `uq_standings_comp_team_season_group`. |
| `predictions` | `GET /predictions` | `fixture={id}` for each upcoming fixture (`status_short = 'NS'`) | up to ~10 at a time | `ON CONFLICT (fixture_id)` |

**Total calls per run: ~11** (1 standings + up to ~10 upcoming fixtures)

Field mappings:
- **`standings`**: For each group in `response[0].league.standings[][]`: `team.id` -> resolve `team_id`; `rank`, `points`, `goalsDiff` -> `goal_difference`, `group` -> `group_label`, `form`, `status`, `description`, `all.played/win/draw/lose` -> `played/wins/draws/losses`, `all.goals.for/against` -> `goals_for/goals_against`, `home.played/win/draw/lose/goals.for/goals.against` -> `home_played/home_wins/home_draws/home_losses/home_goals_for/home_goals_against`, same for `away.*`, `update` -> `last_update`. After standings sync, back-fill `fixtures.group_label` by joining standings group labels to fixture team IDs for group-stage rounds.
- **`predictions`**: `predictions.winner.id` -> resolve `winner_team_id`; `predictions.winner.comment` -> `winner_comment`; `predictions.win_or_draw`, `predictions.under_over`, `predictions.advice`; `predictions.percent.home/draw/away` -> parse `"45%"` to `45.00`; `comparison` -> `comparison_json` (store verbatim JSONB).

---

### Tier 4: Live match polling (15-60s during matches) -- `sync_live.py`

This is the hot loop. It runs only when there are active matches (any fixture with `status_short IN ('1H','HT','2H','ET','BT','P','SUSP','INT','LIVE')`).

**Orchestration logic:**
1. Check `fixtures` table for today's matches. If none have a status indicating they are live or about to start within 30 minutes, sleep and re-check every 5 minutes.
2. Once a match enters the "pre-match window" (30 min before `kickoff_timestamp`), start the lineup poll.
3. Once a match goes live (`status_short` changes from `NS`), start the 15s/60s polling loop.
4. Once all of today's matches reach a terminal status (`FT`, `AET`, `PEN`, `AWD`, `WO`, `PST`, `CANC`, `ABD`), do a final sync and go back to the 5-minute sleep.

| Table | API Endpoint | Cadence | Calls/match/hour | Upsert Strategy |
|-------|-------------|---------|-----------------|-----------------|
| `fixtures` (score/status) | `GET /fixtures?live=1` (league filter) | Every 15s | ~240 (1 call returns all live WC matches) | `ON CONFLICT (api_football_id)` -- update `status_*`, scores, `ht_*`/`et_*`/`pen_*`, `updated_at` |
| `fixture_events` | `GET /fixtures/events?fixture={id}` | Every 15s per match | ~240 per match | Insert new events only. Deduplicate by checking `(fixture_id, minute, extra_minute, type, detail, player_id)` before insert. |
| `fixture_team_stats` | `GET /fixtures/statistics?fixture={id}` | Every 60s per match | ~60 per match | `ON CONFLICT (fixture_id, team_id)` -- full row overwrite |
| `player_match_stats` | `GET /fixtures/players?fixture={id}` | Every 60s per match | ~60 per match | `ON CONFLICT (player_id, fixture_id)` -- full row overwrite |
| `fixture_lineups` + `fixture_lineup_players` | `GET /fixtures/lineups?fixture={id}` | Once, ~30 min pre-kickoff (retry every 10 min if empty) | 3-6 per match | `ON CONFLICT (fixture_id, team_id)` for lineups. Delete + re-insert players per lineup (idempotent via CASCADE). |

**Calls per match (full 90 min + stoppage):**
- `/fixtures?live=1`: ~240 calls (shared across all concurrent matches)
- `/fixtures/events`: ~240 per match
- `/fixtures/statistics`: ~60 per match
- `/fixtures/players`: ~60 per match
- `/fixtures/lineups`: ~3-6 per match

**For a single concurrent match: ~600 calls over ~2 hours.** With up to 4 concurrent matches on a busy WC day: ~1,500 calls for live polling. Fits in Pro tier (300/min, 7,500/day) if live polling uses the bulk of the daily budget.

Field mappings for live tables:
- **`fixture_events`**: `time.elapsed` -> `minute`, `time.extra` -> `extra_minute`, `team.id` -> resolve `team_id`, `player.id` -> resolve `player_id`, `assist.id` -> resolve `assist_player_id`, `type` -> `type`, `detail` -> `detail`, `comments` -> `comments`.
- **`fixture_team_stats`**: The statistics array is `[{type: "Shots on Goal", value: 5}, ...]`. Parse by `type` string into columns: `"Shots on Goal"` -> `shots_on_goal`, `"Shots off Goal"` -> `shots_off_goal`, `"Total Shots"` -> `total_shots`, `"Blocked Shots"` -> `blocked_shots`, `"Shots insidebox"` -> `shots_inside_box`, `"Shots outsidebox"` -> `shots_outside_box`, `"Fouls"` -> `fouls`, `"Corner Kicks"` -> `corner_kicks`, `"Offsides"` -> `offsides`, `"Ball Possession"` -> `ball_possession` (strip `"%"`, parse int), `"Yellow Cards"` -> `yellow_cards`, `"Red Cards"` -> `red_cards`, `"Goalkeeper Saves"` -> `goalkeeper_saves`, `"Total passes"` -> `total_passes`, `"Passes accurate"` -> `passes_accurate`, `"Passes %"` -> `passes_pct` (strip `"%"`), `"expected_goals"` -> `expected_goals` (parse string to numeric).
- **`player_match_stats`**: From `statistics[0]`: `games.minutes` -> `minutes_played`, `games.position` -> `position`, `games.rating` -> `rating` (string to numeric), `games.captain` -> `captain`, `games.substitute` -> `substitute`, `games.number` -> `shirt_number`, `offsides` -> `offsides`, `shots.total/on` -> `shots_total/shots_on_target`, `goals.total/conceded/assists/saves` -> `goals/goal_assists/goals_conceded/goal_saves`, `passes.total/accuracy/key` -> `passes_total/passes_accuracy/key_passes`, `tackles.total/blocks/interceptions` -> `tackles/tackles_blocks/interceptions`, `duels.total/won`, `dribbles.attempts/success/past` -> `dribbles_attempts/dribbles_success/dribbles_past`, `fouls.drawn/committed`, `cards.yellow/red`, `penalty.won/commited/scored/missed/saved` -> `penalty_won/penalty_committed/penalty_scored/penalty_missed/penalty_saved`.
- **`fixture_lineups`**: `formation` -> `formation`, `coach.id` -> resolve `coach_id`. For `fixture_lineup_players`: iterate `startXI[]` (set `is_starting=true`) and `substitutes[]` (set `is_starting=false`). Each: `player.id` -> resolve `player_id`, `player.number` -> `shirt_number`, `player.pos` -> `position`, `player.grid` -> `grid`.

---

## 4. Scheduler daemon -- `poll_daemon.py`

For local development, create `backend/scripts/poll_daemon.py` using `APScheduler` (add `apscheduler>=3.10` to requirements).

**Jobs:**
- `sync_bootstrap` -- `CronTrigger(day_of_week='mon', hour=4)` (weekly Monday 4am UTC)
- `sync_daily` -- `CronTrigger(hour=6)` (daily 6am UTC)
- `sync_hourly` -- `IntervalTrigger(hours=1)`
- `sync_live` -- `IntervalTrigger(seconds=15)` but the function itself is a no-op when no matches are live (checks `fixtures.status_short`)

The daemon also accepts CLI flags:
- `--run-once bootstrap|daily|hourly|live` for manual one-shot execution
- `--dry-run` to log API calls without writing to DB

---

## 5. Rate-limit budget by tier

Based on the **Pro plan** (7,500 calls/day, 300/min):

| Tier | Calls per run | Runs per day | Daily total |
|------|--------------|-------------|-------------|
| Bootstrap | 5 | 0 (weekly) | ~1 |
| Daily | 242 | 1 | 242 |
| Hourly | 11 | 24 | 264 |
| Live (per match) | ~600 | 1-4 matches | 600-2,400 |
| **Worst-case daily total** | | | **~2,907** |

This leaves a comfortable buffer under the 7,500 daily cap even on the busiest match days (4 concurrent fixtures).

---

## 6. File structure

```
backend/
  shared/
    db.py                        # existing -- no changes needed
    api_football_client.py       # NEW: shared HTTP client + rate limiter
  scripts/
    apply_schema.py              # existing
    seed_messi_ronaldo.py        # existing
    seed_real_madrid_from_api.py # existing
    sync_bootstrap.py            # NEW: competitions, venues, teams
    sync_daily.py                # NEW: coaches, players, player_season_stats, fixtures, injuries
    sync_hourly.py               # NEW: standings, predictions
    sync_live.py                 # NEW: live scores, events, lineups, team stats, player stats
    poll_daemon.py               # NEW: APScheduler orchestrator
```

---

## 7. Implementation order

The sync modules depend on each other in a specific order because of FK relationships (e.g., `fixtures` references `teams` and `venues`, `fixture_events` references `fixtures` and `players`). Within each tier, the function should call sub-tasks in the right order:

1. `sync_bootstrap`: competitions -> venues -> teams (teams needs venues for `home_venue_id`)
2. `sync_daily`: fixtures -> coaches -> players -> player_season_stats -> injuries (fixtures needs teams; coaches needs teams; players needs teams; season stats needs players + competitions; injuries needs players + fixtures)
3. `sync_hourly`: standings -> predictions -> back-fill `fixtures.group_label` from standings (standings needs teams + competitions; predictions needs fixtures)
4. `sync_live`: fixture status -> events -> lineups -> team stats -> player match stats (all need fixtures; events/stats need players)

---

## 8. Implementation TODOs

- [ ] Create `backend/shared/api_football_client.py` with rate limiting, retry, pagination, error handling
- [ ] Create `backend/scripts/sync_bootstrap.py` (competitions, venues, teams) -- weekly cadence
- [ ] Create `backend/scripts/sync_daily.py` (coaches, players, player_season_stats, fixtures, injuries) -- daily cadence
- [ ] Create `backend/scripts/sync_hourly.py` (standings, predictions, fixtures.group_label backfill) -- hourly cadence
- [ ] Create `backend/scripts/sync_live.py` (live scores, events, lineups, team stats, player match stats) -- 15-60s cadence
- [ ] Create `backend/scripts/poll_daemon.py` APScheduler orchestrator with CLI flags
- [ ] Add `apscheduler>=3.10` to requirements / dependency list
