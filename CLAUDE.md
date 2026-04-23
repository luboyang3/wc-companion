# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**World Cup Companion** — an AI-powered React Native (Expo SDK 51, iOS-first) app for the 2026 FIFA Men's World Cup. Backend is a Python Flask dev server that mirrors the eventual AWS Lambda handlers, fronted by PostgreSQL (Supabase-compatible) and the Anthropic Claude API. Freemium model: free tier = AI Q&A + visualizations, paid tier = Broadcast Mode.

The repo is mid-migration toward AWS Amplify (Cognito + API Gateway + Lambda) — currently only the local Flask `dev_server.py` is wired up, and only the `ai`, `auth`, and `profile` Lambda folders exist under `backend/lambdas/`.

## Commands

Two processes run in parallel during development:

```bash
# Terminal 1 — backend (Flask, port 3000)
cd backend && python dev_server.py
# optional: --log-level DEBUG | INFO | WARNING   (also LOG_LEVEL in .env)

# Terminal 2 — Expo (web target is the primary dev target)
npx expo start --web
# or: npm run ios | npm run android
```

**Tests** (Jest + jest-expo, RNTL):
```bash
npm test                                 # all tests
npm test -- __tests__/useAIChat.test.tsx # single file
npm test -- -t "streams chat"            # by name pattern
```

The `@/` import alias maps to `src/` (see `jest.config.js` and `tsconfig.json`).

**Database setup** (Phase 1, PostgreSQL — Supabase or local):
```bash
python backend/scripts/apply_schema.py     # cross-platform; no psql needed
python backend/scripts/seed_messi_ronaldo.py
python backend/scripts/seed_real_madrid_from_api.py   # needs API_FOOTBALL_KEY
```

**Debug a player's radar data** (when a chart shows all zeros):
```
GET http://localhost:3000/debug/player/<name>
```
See `backend/README.md` for interpreting the `stats_by_id` vs `stats_by_api_football_id` fields — the most common bug is `player_season_stats.player_id` being seeded with `api_football_id` instead of the serial `players.id`.

**VS Code debugger:** `.vscode/launch.json` defines "Python: Dev Server" with the Flask reloader disabled (the reloader's child process breaks `debugpy` attach). Stop the terminal server before launching.

## Architecture

### Frontend (`src/`)
- **Routing:** Expo Router file-based, with `(auth)` and `(tabs)` route groups under `src/app/`. Root layout (`_layout.tsx`) is the auth gate.
- **State:** Zustand stores in `src/store/` (`authStore`, `profileStore`, `matchStore`, `broadcastStore`). No Redux, no Context for app state.
- **API client:** `src/services/api.ts` is the single typed entry point to the backend, including the SSE streaming helper used by `useAIChat`. Don't bypass it.
- **Auth:** `@aws-amplify/auth` via `src/services/amplify.ts` and the `useAuth` hook. Even before Amplify is fully provisioned, frontend code should go through these wrappers.
- **i18n:** All user-facing strings flow through `i18next` (`en`, `es`, `zh-Hans`). Wrap text in the `AppText` component rather than raw `<Text>`.
- **Visualizations:** Chart components in `src/components/visualizations/` render via a `WebView` loading static HTML templates from `src/assets/charts/`. Data is injected from the AI handler — chart templates are dumb renderers.

### Backend (`backend/`)
- **`dev_server.py`** is a Flask app that dispatches to the same `handler.py` modules under `backend/lambdas/` that will eventually run on Lambda. Treat the handlers as the source of truth — `dev_server.py` just provides routing, CORS, and SSE streaming locally.
- **`backend/shared/db.py`** owns the psycopg2 connection pool. All DB access goes through its `fetch_all` / `fetch_one` helpers. Don't open raw connections in handlers.
- **AI handler** (`backend/lambdas/ai/handler.py`) is the most complex piece: it pulls structured chart/stat context from PostgreSQL, injects it into a Claude prompt, and streams the response back as SSE. The `USE_MOCK_CHART_DATA` env var lets the handler run without a live DB.
- **Schema:** `backend/db/schema.sql` is the canonical Postgres schema. Use the `apply_schema.py` script to (re)apply — it's idempotent.

### Conventions (from `.cursorrules/CURSOR_RULES.md`)
- TypeScript only on the frontend. Functional components + hooks. `async/await`, no `.then()` chains.
- Python 3.12 on the backend. Use `boto3`, `psycopg2`, `anthropic` SDK.
- Env vars prefixed `EXPO_PUBLIC_` are bundled into the RN app. Anything else (`ANTHROPIC_API_KEY`, `DATABASE_URL`, `WECHAT_APP_SECRET`, etc.) is backend-only — never import in frontend code.
- **Frontend design is pending a full redesign.** Do not lock in colors, fonts, spacing scales, or radii. Ignore any design tokens (FIFA green palette, `Inter` font, fixed spacing/radius values) referenced in older docs under `.cursorrules/` or `.cursor/plans/` — those are stale and will be replaced. When building UI, leave styling minimal/placeholder unless the user provides new design direction.
- Stay on Expo managed workflow. Don't eject without being asked.

### Reference docs
- `.cursorrules/CURSOR_RULES.md` — full conventions, folder layout, design system, env vars
- `.cursorrules/FEATURE_PLANS.md` — per-feature specs
- `.cursorrules/DATA_STORAGE_PLAN.md` — data layer design (Phase 1 = Postgres, Phase 2 = nightly API-Football sync)
- `backend/README.md` — dev server flags, debug endpoints, debugger setup
