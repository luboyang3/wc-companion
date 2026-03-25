# ⚽ World Cup Companion App — Feature Plans
> Detailed specifications for each feature. See `CURSOR_RULES.md` for coding conventions and project structure.

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

**Goal:** Display data-driven charts inline in the AI chat, triggered by Claude tool use. Currently supports 3 chart types rendered natively via `react-native-svg`. The remaining chart types from the original spec will be added incrementally.

### Completed — AI-triggered inline charts (Phase 1)

**Architecture:** Claude receives lightweight tool definitions (~200 tokens). When a chart is relevant, Claude calls a tool with minimal params (e.g., team name). The backend intercepts the tool call, fetches data (mock for now), and streams a `chart` SSE event to the frontend. Claude never sees the chart data — zero wasted tokens. Adding a new chart type requires only 3 touchpoints: a tool definition in `chart_tools.py`, a data fetcher in `chart_data.py`, and a React Native component registered in `ChartRenderer.tsx`.

**Backend (implemented):**
1. `backend/lambdas/ai/chart_tools.py` — Central registry of Claude tool schemas (`show_formation`, `show_player_radar`, `show_bar_chart`) and a `TOOL_HANDLERS` dispatcher that maps each tool to its data fetcher.
2. `backend/lambdas/ai/chart_data.py` — Data-fetcher functions per chart type. Currently returns hardcoded mock data behind a `USE_MOCK_CHART_DATA` env flag (default `true`). Each function signature is designed for drop-in replacement with Sportradar API calls:
   - `fetch_formation_data(team_name)` → formation string + player list with x/y positions (Brazil, Argentina)
   - `fetch_player_radar_data(player_name)` → 6 attribute scores 0–100 (Vinicius Jr., Messi, Mbappe)
   - `fetch_bar_chart_data(title, metric)` → leaderboard items by metric (goals, assists, passes, clean_sheets, tackles)
3. `backend/lambdas/ai/handler.py` — Modified both `_invoke_claude_stream` and `_invoke_claude` to pass `tools=CHART_TOOLS`, iterate raw stream events to capture `tool_use` blocks, and emit `chart` SSE events with fetched data. Non-streaming handler returns `charts` array alongside `message` and `source`. System prompt now includes: "Use the provided chart tools when visuals would help the user better understand the answer."

**Frontend (implemented):**
4. `src/types/ai.ts` — Added `ChartType`, `FormationData`, `RadarData`, `BarData`, `ChartInstruction` interfaces. Extended `ChatMessage` with optional `charts` array and `StreamEvent` union with `chart` event type.
5. `src/services/api.ts` — Added `onChart` callback to `StreamAIChatCallbacks` and `"chart"` case in SSE parser.
6. `src/hooks/useAIChat.ts` — Handles `onChart` callback by appending `ChartInstruction` to the placeholder AI message's `charts` array.
7. `src/components/visualizations/ChartRenderer.tsx` — Routing component that maps `chartType` to the correct chart component.
8. `src/components/visualizations/FormationDiagram.tsx` — Native SVG pitch diagram with player dot positions and name labels.
9. `src/components/visualizations/PlayerRadarChart.tsx` — Native SVG 6-axis spider/radar chart with filled polygon for player attribute values.
10. `src/components/visualizations/BarChartView.tsx` — Native SVG vertical bar chart with value labels and configurable unit.
11. `src/components/visualizations/FullScreenChart.tsx` — Modal wrapper that renders any chart at full-screen size via `ChartRenderer`, with close button and title.
12. `src/components/chat/ChatBubble.tsx` — AI bubbles now render inline chart cards below the markdown text, each with a title, the chart at 220px height, and an "Expand" tap target that opens the full-screen modal.

**Dependency added:** `react-native-svg` (via `npx expo install`). No WebView or heavy charting library needed for Phase 1.

### Chart Types

| Chart | Status | Library | Key Data Fields |
|---|---|---|---|
| `formation` | ✅ Done | react-native-svg | `formation: "4-3-3"`, `players: [{name, position, x, y}]` |
| `player_radar` | ✅ Done | react-native-svg | `pace, shooting, passing, dribbling, defending, physical` |
| `bar` | ✅ Done | react-native-svg | `items: [{label, value}]`, `unit` |
| `timeline` | Pending | react-native-svg | `events: [{minute, type, player, team}]` |
| `bracket` | Pending | react-native-svg | `rounds: [{matches: [{home, away, score}]}]` |
| `heatmap` | Pending | react-native-svg | `touches: [{x, y, count}]` |
| `xg` | Pending | react-native-svg | `matches: [{label, xg, goals}]` |
| `donut` | Pending | react-native-svg | `home: 55, away: 45` |

Adding a new chart type requires only 3 touchpoints: a tool definition in `chart_tools.py`, a data fetcher in `chart_data.py`, and a React Native component registered in `ChartRenderer.tsx`. The original plan also envisioned a `VisualizationWebView.tsx` wrapper loading HTML/Chart.js files from `src/assets/charts/`. This approach may still be used for complex interactive charts (e.g., heatmap, bracket) in later phases if native SVG becomes insufficient.

### Remaining — Sportradar data integration
- Backend `matches/handler.py`: Proxy Sportradar endpoints with a 60-second Redis cache. Paid users get a 10-second cache TTL. Include cache-control headers in API response.
- Replace mock data in `chart_data.py` with real Sportradar calls (set `USE_MOCK_CHART_DATA=false`).

### Future Improvement: Hybrid chart triggering
- Keep tool-calling as the primary chart trigger, and add a lightweight backend hint layer that injects currently-available chart opportunities into the prompt context (for example, available teams/players/matches). This can improve chart relevance without requiring large tool descriptions in every request.

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
