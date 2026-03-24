# ⚽ World Cup Companion App — Cursor Project Prompt
> Paste this file as your Cursor project rules (`/.cursorrules`) or reference it as your master prompt.
> Stack: React Native (Expo) · AWS Amplify · Python Lambda · Sportradar API · Anthropic Claude API

---

## 🧠 Project Context

You are building **World Cup Companion** — an AI-powered mobile app for the 2026 FIFA Men's World Cup.
It is a **React Native app (Expo SDK 51+)** targeting iOS first, Android later.
The backend is **AWS Amplify** (Auth via Cognito, REST API via API Gateway + Python Lambda).
Live sports data comes from **Sportradar Soccer v4 API**.
The AI layer uses the **Anthropic Claude API (claude-sonnet-4)**.
The app is **freemium**: free tier includes AI Q&A + visualizations; paid tier unlocks Broadcast Mode.

When generating code, always follow these principles:
- Use **TypeScript** for all React Native files. No plain `.js` files.
- Use **functional components** and **React hooks** only. No class components.
- Use **async/await** for all async operations. No raw `.then()` chains.
- Follow **Expo managed workflow** conventions. Do not eject unless explicitly asked.
- Backend Lambda functions are written in **Python 3.12**. Use `boto3`, `httpx`, and `anthropic` SDK.
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
│   │   │   ├── SSOButtons.tsx    ← Google, Facebook, WeChat SSO row
│   │   │   └── AuthForm.tsx      ← Email/password form
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
│   │   ├── colors.ts             ← Brand color palette (FIFA green, gold, etc.)
│   │   ├── fonts.ts
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
│   │   ├── sportradar.py         ← Sportradar API client (httpx, retry logic)
│   │   ├── claude.py             ← Anthropic Claude client wrapper
│   │   ├── dynamo.py             ← DynamoDB helper (get_item, put_item, update_item)
│   │   ├── cache.py              ← ElastiCache Redis client wrapper
│   │   └── auth.py               ← JWT verification helper
│   │
│   ├── requirements.txt          ← anthropic, httpx, boto3, redis
│   └── template.yaml             ← AWS SAM template (API Gateway + all Lambdas)
│
└── /amplify
    ├── /auth                     ← Amplify-generated Cognito config
    ├── /api                      ← Amplify-generated API Gateway config
    └── /backend-config.json
```

---

## 🔐 Feature 1 — Authentication

**Goal:** Implement full auth flow using AWS Amplify + Cognito with 4 sign-in methods.

### Instructions for Cursor:

1. Configure `src/services/amplify.ts` to call `Amplify.configure()` with values from `app.json` or `.env`. Use `@aws-amplify/auth` v6.
2. Build `SSOButtons.tsx` with three buttons: **Google**, **Facebook**, **WeChat**. Each calls `signInWithRedirect({ provider })`. WeChat requires a custom OAuth provider configuration in Cognito — scaffold the config with a `TODO: add WeChat client ID` comment.
3. Build `AuthForm.tsx` for email/password with two modes: **login** and **register**. Registration calls `signUp()`, then redirects to an OTP verification screen that calls `confirmSignUp()`.
4. Create `useAuth.ts` hook that exposes: `{ user, isLoading, isAuthenticated, signIn, signOut, signUp, confirmOTP }`.
5. In `_layout.tsx`, wrap all `(tabs)` routes in an auth gate: if `!isAuthenticated`, redirect to `(auth)/welcome`.
6. After successful registration, trigger the `auth` Lambda (Cognito post-confirmation hook) to create a blank user profile in DynamoDB.

**Key libraries:** `@aws-amplify/auth`, `@aws-amplify/ui-react-native`

---

## 👤 Feature 2 — Progressive User Onboarding & Profile

**Goal:** Collect user profile data incrementally and display a Personalization Score.

### Instructions for Cursor:

1. Define the `UserProfile` type in `src/types/user.ts`:
```typescript
interface UserProfile {
  userId: string;
  dateOfBirth?: string;         // ISO date string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;         // ISO 3166-1 alpha-2 country code
  yearsAsFan?: number;          // 0–40
  favoriteNationalTeams?: string[];  // array of FIFA team IDs
  favoriteClubTeams?: string[];      // array of club IDs
  language?: 'en' | 'es' | 'zh-Hans';
  isPaidUser?: boolean;
  dailyAIQueryCount?: number;
  lastQueryReset?: string;
}
```
2. Build `ProfileCard.tsx` — a swipeable card component that presents one profile field at a time (DoB picker, nationality selector, team multi-select, etc.). Each completed card calls `PUT /profile` and updates the Zustand `profileStore`.
3. Build `PersonalizationBar.tsx` — an animated progress bar from 0–100%. Score is calculated client-side: each filled field adds points (nationality: 20pts, favorite team: 20pts, DoB: 15pts, yearsAsFan: 15pts, club team: 15pts, gender: 15pts).
4. Show a `"Your AI is X% personalized"` nudge on the Home tab whenever score < 100%. Tapping it opens the next incomplete `ProfileCard`.
5. `useUserProfile.ts` should fetch profile on app load (`GET /profile`) and expose `updateProfile(fields)` which calls `PUT /profile` and updates the store.
6. Backend `profile/handler.py`: Implement `GET` (fetch from DynamoDB by `userId` from JWT) and `PUT` (partial update using `UpdateExpression`).

---

## 🤖 Feature 3 — AI Q&A Chat (Free Tier)

**Goal:** A chat interface powered by Anthropic Claude with user profile context and Sportradar data injection.

### Instructions for Cursor:

1. Build `chat.tsx` tab screen with a `FlatList` of `ChatBubble` components and a sticky `ChatInput` at the bottom.
2. `ChatBubble.tsx`: Two variants — `user` (right-aligned, brand green bubble) and `ai` (left-aligned, light gray bubble). AI bubbles include a small "via Sportradar" or "AI knowledge" source badge.
3. `SuggestedPrompts.tsx`: Horizontal scrollable chip row above the input. Chips are generated from today's match schedule and the user's favorite team. Example: *"Who starts for Brazil today?"*, *"Explain the offside rule"*.
4. `useAIChat.ts` hook:
   - Maintains `messages: ChatMessage[]` array in state.
   - On send, appends user message, calls `POST /ai/chat` with `{ message, history: last10Messages }`.
   - Appends AI response when received.
   - Tracks `dailyQueryCount` from profile store. If count ≥ 20 and user is not paid, show an upgrade modal instead of sending.
5. Backend `ai/handler.py`:
```python
# Pseudocode — implement fully
def handler(event, context):
    user_id = verify_jwt(event)
    profile = dynamo.get_profile(user_id)
    message = event['body']['message']
    history = event['body']['history']

    # RAG: fetch today's match context from cache
    match_context = cache.get('sportradar:today_matches') or sportradar.get_today_matches()

    system_prompt = build_system_prompt(profile, match_context)
    # system_prompt injects: user nationality, favorite teams, fan level, today's fixtures
    # Ends with: "Only cite statistics from the provided data context. If uncertain, say so."

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt,
        messages=history + [{"role": "user", "content": message}]
    )

    increment_daily_query_count(user_id)
    return response.content[0].text
```
6. Localize all AI system prompts — send the prompt in the user's selected language (`en` / `es` / `zh-Hans`).

---

## 📊 Feature 4 — Data Visualizations (Free Tier)

**Goal:** Render 14 chart types via JS templates in a React Native WebView, fed by Sportradar data.

### Instructions for Cursor:

1. Create `VisualizationWebView.tsx` — a `react-native-webview` wrapper that:
   - Accepts `chartType: string` and `data: object` props.
   - Loads the corresponding HTML file from `src/assets/charts/`.
   - Injects data via `postMessage` after the WebView loads.
   - Listens for `onMessage` callbacks from the chart (for tap interactions).
2. Each HTML chart file uses **Chart.js v4** or **D3.js v7** loaded from CDN. They listen for `window.addEventListener('message', ...)` to receive data and render.
3. Implement the following chart templates:

| File | Library | Key Data Fields |
|---|---|---|
| `radar.html` | Chart.js Radar | `pace, shooting, passing, dribbling, defending, physical` |
| `formation.html` | D3 SVG | `formation: "4-3-3"`, `players: [{id, name, position, x, y}]` |
| `timeline.html` | D3 SVG | `events: [{minute, type, player, team}]` |
| `bracket.html` | D3 Tree | `rounds: [{matches: [{home, away, score}]}]` |
| `heatmap.html` | D3 SVG | `touches: [{x, y, count}]` |
| `xg.html` | Chart.js Line | `matches: [{label, xg, goals}]` |
| `donut.html` | Chart.js Doughnut | `home: 55, away: 45` |
| `bar.html` | Chart.js Bar | `players: [{name, value}]` (for leaderboards, age pyramid etc.) |

4. Build individual wrapper components (`PlayerRadarChart.tsx`, `FormationDiagram.tsx`, etc.) that call `GET /matches/{id}/stats` or `GET /players/{id}` from the backend, then pass formatted data to `VisualizationWebView`.
5. Backend `matches/handler.py`: Proxy Sportradar endpoints with a 60-second Redis cache. Paid users get a 10-second cache TTL. Include cache-control headers in API response.

---

## 📡 Feature 5 — Broadcast Mode (Paid Tier)

**Goal:** Real-time AI-narrated live match feed with 3 delivery channels: in-app feed, push notifications, persistent ticker.

### Instructions for Cursor:

1. **Paywall Gate:** In `broadcast/[matchId].tsx`, check `profileStore.isPaidUser`. If false, render `BroadcastPaywall.tsx` (full-screen upgrade CTA with Tournament Pass pricing). If true, render the live broadcast UI.
2. **ScoreTicker.tsx:** A slim 40px banner rendered at the top of `_layout.tsx` (always visible across all tabs). It shows: home crest · home score · `'` clock · away score · away crest. Only rendered when `broadcastStore.activeMatch` is set. Animates score change with a flash highlight.
3. **BroadcastFeed.tsx:** A `FlatList` (inverted, newest at bottom) of `EventCard` components. Auto-scrolls on new events.
4. **EventCard.tsx:** Renders differently per `event.type`:
   - `goal` → Large card, green background, ⚽ icon, scorer name + minute, AI commentary text below
   - `yellow_card` → 🟨, player name, minute
   - `red_card` → 🟥, player name, minute, AI commentary
   - `substitution` → 🔄, player out / player in
   - `kickoff` / `halftime` / `fulltime` → centered banner cards
5. **useBroadcast.ts hook:**
   - Calls `POST /broadcast/subscribe` with `matchId` to register interest.
   - Opens a WebSocket to `wss://[api-gateway-ws-url]/broadcast?matchId=...`.
   - On each message, parses the event JSON, appends to `broadcastStore.events`, and updates `broadcastStore.score`.
   - On `fulltime` event, disconnects WebSocket and shows match summary.
6. **Backend `broadcast/handler.py`:**
```python
# Two entry points:
# 1. SQS consumer (triggered by Sportradar event queue)
# 2. WebSocket connection manager (API Gateway WebSocket)

def process_sportradar_event(event, context):
    """Triggered by SQS. Converts raw Sportradar event to AI commentary."""
    for record in event['Records']:
        match_event = json.loads(record['body'])
        user_context = get_subscribed_users(match_event['matchId'])

        commentary = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            system="You are a live soccer commentator. Generate 1-2 exciting sentences describing this event. Be concise and vivid.",
            messages=[{"role": "user", "content": json.dumps(match_event)}]
        )

        enriched_event = {**match_event, "commentary": commentary.content[0].text}
        push_to_websocket_connections(enriched_event, match_event['matchId'])
        send_push_notifications(enriched_event, user_context)
```
7. **Push Notifications (`notifications/handler.py`):** Use `boto3` SNS client to send to stored APNs device tokens. Only send for event types: `goal`, `red_card`, `penalty`, `fulltime`. Respect per-user notification preference flags from DynamoDB.

**Key libraries:** `react-native-webview`, `@aws-amplify/api`, `expo-notifications`

---

## 🌐 Feature 6 — Localization (EN / ES / ZH-Hans)

**Goal:** All UI strings must be localized from day one using i18next.

### Instructions for Cursor:

1. Configure `i18n/index.ts` using `i18next` + `react-i18next` + `expo-localization`.
2. Detect device language on first launch. If device language is `es` or `zh`, set app language accordingly. Otherwise default to `en`.
3. User can override language in Profile tab — save to `UserProfile.language` in DynamoDB.
4. All hardcoded UI strings must use the `useTranslation()` hook. Example:
```typescript
const { t } = useTranslation();
<AppText>{t('home.todaysMatches')}</AppText>
```
5. Scaffold `en.json`, `es.json`, and `zh-Hans.json` with keys for all screens. Mark untranslated ES/ZH strings with a `// TODO: translate` comment for handoff to translators.
6. AI system prompts in `ai/handler.py` must also be localized — maintain separate prompt templates per language in a `prompts/` subfolder inside the Lambda.

---

## 🎨 Design System

Apply these brand tokens consistently across all components.

```typescript
// src/constants/colors.ts
export const Colors = {
  primary:      '#006341',  // FIFA green — primary buttons, headings, active tabs
  gold:         '#C8A84B',  // FIFA gold — accents, highlights, dividers
  accent:       '#004D99',  // deep blue — links, secondary actions
  dark:         '#222222',  // primary text
  mid:          '#555555',  // secondary text
  light:        '#F2F4F5',  // card backgrounds, table rows
  white:        '#FFFFFF',
  success:      '#005C2E',  // free tier badges
  danger:       '#8B0000',  // paid tier badges, red cards
  goalGreen:    '#00A84F',  // goal event cards
  yellowCard:   '#FFD700',
  redCard:      '#CC0000',
};
```

- **Font:** Use `Inter` (via `expo-font`). Weights: 400 (body), 600 (subheading), 700 (heading).
- **Border radius:** Cards use `12px`. Buttons use `8px`. Pills use `99px`.
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48px. No arbitrary values.
- **Dark mode:** Scaffold color tokens with light/dark variants using `useColorScheme()`. Not required for launch but set up the infrastructure.

---

## ⚙️ Environment Variables

Create `.env.example` with these keys (no real values):

```bash
# AWS
EXPO_PUBLIC_AWS_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=
EXPO_PUBLIC_COGNITO_CLIENT_ID=
EXPO_PUBLIC_API_GATEWAY_URL=

# Sportradar
SPORTRADAR_API_KEY=               # Backend only — never expose to client
SPORTRADAR_BASE_URL=https://api.sportradar.com/soccer/production/v4

# Anthropic
ANTHROPIC_API_KEY=                # Backend only — never expose to client

# WeChat OAuth
WECHAT_APP_ID=                    # Client-safe
WECHAT_APP_SECRET=                # Backend only

# Feature Flags
EXPO_PUBLIC_BROADCAST_ENABLED=true
EXPO_PUBLIC_FREE_QUERY_LIMIT=20
```

**Rule:** Any variable prefixed `EXPO_PUBLIC_` is safe to include in the React Native bundle. All others are Lambda environment variables only — never import them in frontend code.

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
pip install anthropic httpx boto3 redis
```

---

## 📋 Cursor Workflow Instructions

When using Cursor to build this project:

1. **Start with Feature 1 (Auth)** — nothing else works without it.
2. **Generate one feature at a time.** After each feature, run the app and verify before moving to the next.
3. **Always ask Cursor to write tests** alongside each feature. Use Jest + React Native Testing Library.
4. When adding a new screen, always ask Cursor: *"Add this screen to the Expo Router navigation and include a TypeScript interface for all props and state."*
5. When adding a Lambda, always ask Cursor: *"Include error handling, structured JSON logging, and a docstring describing the input/output contract."*
6. Reference this file at the start of any new Cursor session with: *"Read CURSOR_PROMPT.md and continue building the World Cup Companion App."*
