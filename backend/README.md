# Backend – Local Development

## Running the dev server

```bash
cd backend
pip install -r requirements.txt
python dev_server.py
```

The server starts at `http://localhost:3000` and exposes:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai/chat` | AI chat — supports both JSON and SSE streaming (`Accept: text/event-stream`) |
| `GET`  | `/health`  | Health check |
| `GET`  | `/debug/player/<name>` | Inspect player + season stats linkage (dev only) |

### Log level

Pass `--log-level` to control verbosity:

```bash
python dev_server.py --log-level DEBUG    # all logs, including raw stats dumps
python dev_server.py --log-level INFO     # default — key events only
python dev_server.py --log-level WARNING  # problems only
```

You can also set the `LOG_LEVEL` environment variable in `.env` instead of passing the flag every time.

Environment variables are loaded from `.env` in the project root.

---

## Debug endpoints

### `GET /debug/player/<name>`

Inspects whether a player has correctly linked season stats in the database. Useful for diagnosing all-zero radar charts.

**Example:**

```
GET http://localhost:3000/debug/player/T. Kroos
```

**Response fields:**

| Field | Description |
|-------|-------------|
| `player` | The matched `players` row (`id`, `api_football_id`, `name`, `position`) |
| `stats_by_id` | `player_season_stats` rows where `player_id = players.id` — this is what the radar chart uses |
| `stats_by_api_football_id` | `player_season_stats` rows where `player_id = players.api_football_id` — populated if test data was inserted with the wrong FK |

**Diagnosing a zero radar chart:**

- If `player` is `null` → the name doesn't match any row in the `players` table. Check the exact spelling used in your seed data.
- If `stats_by_id` is empty but `stats_by_api_football_id` has rows → stats were inserted using `api_football_id` as the foreign key instead of `players.id`. Re-seed using `players.id`, or update the existing rows:

```sql
UPDATE player_season_stats pss
SET player_id = p.id
FROM players p
WHERE pss.player_id = p.api_football_id
  AND pss.player_id != p.id;
```

- If both are empty → no stats rows exist at all for this player. Seed `player_season_stats` with the correct `player_id` (the serial `id` from the `players` table).

## PostgreSQL setup (Phase 1)

The AI Lambda now reads match/chart data directly from PostgreSQL (including [Supabase](https://supabase.com), which is standard Postgres).

1. Configure `DATABASE_URL` in `.env`. For hosted Supabase, use **Project Settings → Database → URI** (direct connection on port `5432` is a good default for this dev server). Set `DB_SSLMODE=require` for cloud.
2. If your database password contains `@` or other URI-reserved characters, URL-encode them in the connection string (for example `@` → `%40`).
3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Apply the schema (pick one):

```bash
# From repo root — works on Windows without psql
python backend/scripts/apply_schema.py
```

```bash
# If you have psql installed (Unix-style; on PowerShell quote the URL)
psql "$DATABASE_URL" -f backend/db/schema.sql
```

### Seed sample players (Messi & Ronaldo)

Inserts two rows into `players` using API-Football-style ids (`154`, `874`). No API key; safe to re-run (upsert).

```bash
python backend/scripts/seed_messi_ronaldo.py
```

### Fetch Real Madrid squad (API-Football)

Requires `API_FOOTBALL_KEY` and `DATABASE_URL` in `.env`. Upserts Real Madrid into `teams` (default API team id `541`) and all returned squad players into `players` with `team_id` set. Idempotent.

```bash
python backend/scripts/seed_real_madrid_from_api.py
```

Use `--season 2023` if the current season returns no rows. Override club with `--team <api_football_team_id>`.

---

## Debugging the dev server in Cursor / VS Code

A `debugpy` launch configuration is already set up in `.vscode/launch.json`.

> **Important:** Flask's auto-reloader spawns a child process that prevents the debugger from attaching. The launch config disables the reloader (`FLASK_DEBUG=0`) automatically, so you do not need to change anything.

### Steps

1. **Stop any terminal instance** of the dev server first (`Ctrl+C` in the terminal where `python dev_server.py` is running), so port 3000 is free.

2. **Open the Run & Debug panel** — press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS).

3. **Select the configuration** — use the dropdown at the top of the panel and choose **"Python: Dev Server"**.

4. **Start debugging** — press `F5` or click the green play button. The integrated terminal will show the Flask startup banner when the server is ready.

5. **Set breakpoints** — click in the gutter (left margin) of any `.py` file to add a breakpoint, or add `breakpoint()` directly in the source code. A `breakpoint()` is already placed at the entry of `_invoke_claude_stream` in `handler.py` — remove it when you no longer need it.

6. **Trigger the code** — send a message from the `/chat` screen. Cursor will pause at the breakpoint and open the Debug toolbar.

### Debug toolbar reference

| Button | Shortcut | Action |
|--------|----------|--------|
| Continue | `F5` | Resume until the next breakpoint |
| Step Over | `F10` | Execute the current line, stay in this function |
| Step Into | `F11` | Step into the called function |
| Step Out | `Shift+F11` | Run until the current function returns |
| Restart | `Ctrl+Shift+F5` | Restart the server and debugger |
| Stop | `Shift+F5` | Stop the debugger and server |

### Inspecting variables at a breakpoint

- **Variables panel** (left sidebar) — shows all locals and globals in the current frame.
- **Watch panel** — add any expression (e.g. `len(history)`, `anthropic_api_key[:8]`) to evaluate it on every pause.
- **Debug Console** — type any Python expression and press `Enter` to evaluate it live in the paused frame.
- **Hover** — hover over any variable in the editor to see its current value inline.

### Returning to normal (non-debug) mode

Once debugging is done:

1. Remove the `breakpoint()` line from `handler.py` (or comment it out).
2. Stop the debug session (`Shift+F5`).
3. Start the server normally from the terminal:

```bash
cd backend
python dev_server.py
```
