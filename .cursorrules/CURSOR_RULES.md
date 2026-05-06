# ⚽ World Cup Companion App — Coding Rules & Conventions
> Stack: React Native (Expo) · AWS Amplify · Python Lambda · PostgreSQL · Anthropic Claude API

---

## 🧠 Project Context

You are building **World Cup Companion** — an AI-powered mobile app for the 2026 FIFA Men's World Cup.
It is a **React Native app (Expo SDK 51+)** targeting iOS first, Android later.
The backend is **AWS Amplify** (Auth via Cognito, REST API via API Gateway + Python Lambda).
Sports data is stored in **PostgreSQL** (Render managed, ~$7/mo), synced nightly from API-Football by a Phase 2 cron job. The AI Lambda queries PostgreSQL directly using `psycopg2`.
The AI layer uses the **Anthropic Claude API (claude-sonnet-4)**.
The app is **freemium**: free tier includes AI Q&A + visualizations; paid tier unlocks Broadcast Mode.

When generating code, always follow these principles:
- Use **TypeScript** for all React Native files. No plain `.js` files.
- Use **functional components** and **React hooks** only. No class components.
- Use **async/await** for all async operations. No raw `.then()` chains.
- Follow **Expo managed workflow** conventions. Do not eject unless explicitly asked.
- Backend Lambda functions are written in **Python 3.12**. Use `boto3`, `psycopg2`, and `anthropic` SDK.
- All API keys and secrets are stored in **AWS Secrets Manager** or **Amplify environment variables**. Never hardcode them.
- All screens must support **English, Spanish, and Simplified Chinese** via `i18next`.
- UI must be responsive for both **iPhone and Android** screen sizes from day one.

---

## 📁 Full Project Folder Structure

Scaffold the project with this exact folder structure:

```
world-cup-companion/
├── .cursorrules                  ← this file
├── .env.example                  ← env var template (no real secrets)
├── app.json                      ← Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
│
├── /src
│   ├── /app                      ← Expo Router file-based navigation
│   │   ├── _layout.tsx           ← Root layout, auth gate, tab navigator
│   │   ├── (auth)/
│   │   │   ├── welcome.tsx       ← SSO + email login entry screen
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         ← Home tab (today's matches, AI prompts)
│   │   │   ├── teams.tsx         ← Teams browser
│   │   │   ├── players.tsx       ← Players search + profiles
│   │   │   ├── chat.tsx          ← AI Q&A chat interface
│   │   │   └── profile.tsx       ← User profile + subscription
│   │   └── broadcast/
│   │       └── [matchId].tsx     ← Broadcast Mode live screen
│   │
│   ├── /components
│   │   ├── /auth
│   │   │   ├── AuthScaffold.tsx  ← Brand, tab toggle, social buttons, divider
│   │   │   └── AuthField.tsx     ← Dark-themed labeled text input
│   │   ├── /onboarding
│   │   │   ├── ProfileCard.tsx   ← Single progressive onboarding step card
│   │   │   └── PersonalizationBar.tsx ← Animated score bar
│   │   ├── /chat
│   │   │   ├── ChatBubble.tsx    ← AI and user message bubbles
│   │   │   ├── ChatInput.tsx     ← Input bar with send button
│   │   │   └── SuggestedPrompts.tsx ← Tappable prompt chips
│   │   ├── /visualizations
│   │   │   ├── VisualizationWebView.tsx ← WKWebView/WebView wrapper for JS charts
│   │   │   ├── FormationDiagram.tsx
│   │   │   ├── PlayerRadarChart.tsx
│   │   │   ├── HeadToHeadCard.tsx
│   │   │   ├── StandingsTable.tsx
│   │   │   ├── TournamentBracket.tsx
│   │   │   ├── GoalTimeline.tsx
│   │   │   ├── HeatMap.tsx
│   │   │   ├── TopScorersChart.tsx
│   │   │   ├── xGChart.tsx
│   │   │   ├── PossessionDonut.tsx
│   │   │   └── SquadAgePyramid.tsx
│   │   ├── /broadcast
│   │   │   ├── BroadcastFeed.tsx ← Scrolling live event card stream
│   │   │   ├── EventCard.tsx     ← Goal / card / sub event card
│   │   │   ├── ScoreTicker.tsx   ← Persistent top banner (score + clock)
│   │   │   └── BroadcastPaywall.tsx ← Upgrade CTA modal
│   │   ├── /shared
│   │   │   ├── AppButton.tsx
│   │   │   ├── AppText.tsx       ← Localized text wrapper
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── TeamCrest.tsx     ← Cached team crest image
│   │
│   ├── /hooks
│   │   ├── useAuth.ts            ← Amplify Auth wrapper hook
│   │   ├── useUserProfile.ts     ← Fetch/update user profile from DynamoDB
│   │   ├── useAIChat.ts          ← Claude API call + message history state
│   │   ├── useLiveMatch.ts       ← WebSocket hook for Sportradar live feed
│   │   ├── useMatchData.ts       ← Fetch match/team/player data from backend
│   │   └── useBroadcast.ts       ← Broadcast Mode state orchestration
│   │
│   ├── /services
│   │   ├── amplify.ts            ← Amplify.configure() setup
│   │   ├── api.ts                ← Typed API Gateway client (GET/POST helpers)
│   │   ├── notifications.ts      ← APNs/FCM push notification registration
│   │   ├── analytics.ts          ← Mixpanel event tracking wrapper
│   │   └── storage.ts            ← AsyncStorage helpers for local cache
│   │
│   ├── /store
│   │   ├── index.ts              ← Zustand store root
│   │   ├── authStore.ts          ← Auth state (user, session, loading)
│   │   ├── profileStore.ts       ← User profile + personalization score
│   │   ├── matchStore.ts         ← Today's matches, live scores
│   │   └── broadcastStore.ts     ← Active broadcast match state + event queue
│   │
│   ├── /types
│   │   ├── user.ts               ← UserProfile, AuthUser interfaces
│   │   ├── match.ts              ← Match, Team, Player, MatchEvent interfaces
│   │   ├── ai.ts                 ← ChatMessage, AIResponse interfaces
│   │   └── api.ts                ← API request/response type contracts
│   │
│   ├── /constants
│   │   ├── colors.ts             ← Color tokens (TBD — pending frontend redesign; do not populate yet)
│   │   ├── fonts.ts              ← Font tokens (TBD — pending frontend redesign)
│   │   └── config.ts             ← API base URLs, feature flags, limits
│   │
│   ├── /i18n
│   │   ├── index.ts              ← i18next configuration
│   │   └── /locales
│   │       ├── en.json
│   │       ├── es.json
│   │       └── zh-Hans.json
│   │
│   └── /assets
│       ├── /images
│       ├── /fonts
│       └── /charts               ← JS chart template HTML files (loaded by WebView)
│           ├── radar.html
│           ├── formation.html
│           ├── timeline.html
│           ├── bracket.html
│           ├── heatmap.html
│           ├── xg.html
│           ├── donut.html
│           └── bar.html
│
├── /backend
│   ├── /lambdas
│   │   ├── /auth                 ← Cognito post-confirmation trigger
│   │   │   └── handler.py
│   │   ├── /profile
│   │   │   └── handler.py        ← GET/PUT user profile (DynamoDB)
│   │   ├── /ai
│   │   │   └── handler.py        ← Claude API orchestration + RAG context injection
│   │   ├── /matches
│   │   │   └── handler.py        ← Proxy + cache Sportradar match/team/player data
│   │   ├── /broadcast
│   │   │   └── handler.py        ← Sportradar WebSocket consumer → SQS → Claude commentary
│   │   └── /notifications
│   │       └── handler.py        ← SNS push notification dispatcher
│   │
│   ├── /shared
│   │   ├── db.py                 ← psycopg2 connection pool + fetch_all / fetch_one helpers
│   │   └── __init__.py
│   │
│   ├── /db
│   │   └── schema.sql            ← Full PostgreSQL schema (Phase 1)
│   │
│   ├── requirements.txt          ← anthropic, psycopg2-binary, boto3, flask, flask-cors, python-dotenv
│   └── template.yaml             ← AWS SAM template (API Gateway + all Lambdas)
│
└── /amplify
    ├── /auth                     ← Amplify-generated Cognito config
    ├── /api                      ← Amplify-generated API Gateway config
    └── /backend-config.json
```

---

## 🎨 Design System (Pending)

> **⚠️ Pending full redesign.** The frontend visual design — colors, typography, spacing, radii, dark mode — has not been finalized. **Do not invent or commit to design tokens** (no fixed color palette, no fixed font, no fixed spacing scale). Build screens with minimal placeholder styling and wait for the new design direction before introducing a `Colors`, `fonts`, or spacing module. Any older references to a "FIFA green" palette, `Inter` font, or specific spacing/radius values elsewhere in this repo are stale and should be ignored.

---

## ⚙️ Environment Variables

Create `.env.example` with these keys (no real values):

```bash
# AWS
EXPO_PUBLIC_AWS_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=
EXPO_PUBLIC_COGNITO_CLIENT_ID=
EXPO_PUBLIC_API_GATEWAY_URL=

# PostgreSQL (Phase 1 — backend only)
DATABASE_URL=postgresql://user:password@host:5432/dbname   # Backend only — never expose to client
DB_POOL_MIN=1
DB_POOL_MAX=5

# Anthropic
ANTHROPIC_API_KEY=                # Backend only — never expose to client

# WeChat OAuth
WECHAT_APP_ID=                    # Client-safe
WECHAT_APP_SECRET=                # Backend only

# Feature Flags
EXPO_PUBLIC_BROADCAST_ENABLED=true
EXPO_PUBLIC_FREE_QUERY_LIMIT=20
USE_MOCK_CHART_DATA=true          # Backend only — set false when DATABASE_URL is configured

# API-Football (Phase 2 — cron job only)
# API_FOOTBALL_KEY=               # Uncomment when Phase 2 cron job is built
```

**Rule:** Any variable prefixed `EXPO_PUBLIC_` is safe to include in the React Native bundle. All others are Lambda environment variables only — never import them in frontend code.

---

## 🗄️ Database Schema (Phase 2 — expanded)

The schema in `backend/db/schema.sql` has been expanded to 15 tables, all sourced from API-Football v3. Key additions beyond the original Phase 1 tables:

- **`venues`** — WC host stadiums (capacity, city, surface, image)
- **`coaches`** — head coaches per team
- **`fixture_events`** — live match timeline (goals, cards, subs, VAR)
- **`fixture_lineups`** + **`fixture_lineup_players`** — formation, starting XI grid, bench
- **`injuries`** — player injury/suspension status per fixture
- **`predictions`** — pre-match win probabilities and comparison data
- **`fixtures`** now includes: `status_short/long/elapsed/extra`, `round_label`, `group_label`, `kickoff_timestamp`, `ht/et/pen` scores, `venue_id` FK
- **`standings`** now includes: `group_label`, `home_*/away_*` breakdowns, `status`, `description`
- **`player_match_stats`** now includes: `captain`, `substitute`, `shirt_number` (stat columns are nullable, not DEFAULT 0)

See `.cursorrules/API_FOOTBALL_POLLING_PLAN.md` for the full polling implementation plan (cadence tiers, endpoints, field mappings, rate-limit budgets).

---

## 🚀 Initial Setup Commands

When starting the project, run these in order:

```bash
# 1. Create Expo app
npx create-expo-app world-cup-companion --template tabs
cd world-cup-companion

# 2. Install core dependencies
npx expo install expo-router expo-font expo-localization expo-notifications
npm install @aws-amplify/auth @aws-amplify/api aws-amplify
npm install react-native-webview
npm install zustand
npm install react-native-markdown-display
npm install i18next react-i18next
npm install react-native-safe-area-context react-native-screens

# 3. Install Amplify CLI and initialize
npm install -g @aws-amplify/cli
amplify init
amplify add auth    # Choose: Email + Social providers
amplify add api     # Choose: REST API
amplify push

# 4. Backend Python setup
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 5. Apply PostgreSQL schema (requires DATABASE_URL in .env)
psql "$DATABASE_URL" -f backend/db/schema.sql
```

---

## ▶️ Running the Project

This project requires two servers running simultaneously in separate terminals.

**Terminal 1 — Backend API server:**
```bash
cd backend
python dev_server.py
```

**Terminal 2 — Expo web app:**
```bash
npx expo start --web
```

---

## 📋 Cursor Workflow Instructions

When using Cursor to build this project:

1. **Start with Feature 1 (Auth)** — nothing else works without it.
2. **Generate one feature at a time.** After each feature, run the app and verify before moving to the next.
3. **Always ask Cursor to write tests** alongside each feature. Use Jest + React Native Testing Library.
4. When adding a new screen, always ask Cursor: *"Add this screen to the Expo Router navigation and include a TypeScript interface for all props and state."*
5. When adding a Lambda, always ask Cursor: *"Include error handling, structured JSON logging, and a docstring describing the input/output contract."*
6. For detailed feature specifications, see `FEATURE_PLANS.md` in this same directory.
