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

Environment variables are loaded from `.env` in the project root.

## PostgreSQL setup (Phase 1)

The AI Lambda now reads match/chart data directly from PostgreSQL.

1. Configure `DATABASE_URL` in `.env`.
2. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

3. Apply the schema:

```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```

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
