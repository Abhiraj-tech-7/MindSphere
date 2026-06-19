# MindSphere — Product Requirements Doc (Working)

## Original Problem Statement
Multi-session iterative buildout. Latest session covers:
- Session 1: Security + Stripe billing + Settings redesign + Legal pages
- Session 2 (in progress): New features, improvements, technical fixes

## Architecture
- Backend: FastAPI + MongoDB (Motor) + Official OpenAI SDK + Gemini Live (google-genai) + Stripe + Resend
- Frontend: React (CRACO) + Tailwind + framer-motion + lucide-react + recharts
- Voice: WebSocket `/api/voice/ws` → Gemini Live `gemini-3.1-flash-live-preview`
- Auth: JWT bearer, demo seed user
- Billing: Stripe Subscriptions (monthly $14.99 / annual $149.99) + Customer Portal + Webhook signature verification

## Session History

### 2026-06-19 — Session 2 (Part 1): Wellness Score, Streaks, Gratitude, Quick Mood Widget, Pricing Discoverability
**Critical fixes from Session 1 testing:**
- **Wired `require_access(...)` to all paid-tier endpoints**: `/api/journal` (free = 2 lifetime entries), `/api/chat`, `/api/diet/plan`, `/api/diet/regenerate`, `/api/diet/recipe/detail`, `/api/diet/recipe/custom`, `/api/assessments`, `/api/disturbance/scan`, `/api/disturbance/vision`. Feature gating now actually returns 403 `upgrade_required` for free users — verified via mongo flip test.
- Updated OpenAI API key to the new user-provided key — LLM calls now return live insights instead of EMERGENT fallback.
- Added Pricing/Privacy/Terms links to Landing navigation + footer (user-flagged discoverability issue).
- Created `/app/memory/test_credentials.md` with demo credentials, gating notes, and how-to-test instructions.

**New backend endpoints:**
- `GET /api/wellness/score` — composite 0-100 score (mood 30 + sleep 25 + journal 20 + breathing 15 + hydration 10) + yesterday comparison + AI insight (6h cache).
- `GET /api/streaks` — current/longest streak per habit (journal, mood, meditation, hydration, gratitude).
- `POST /api/streaks/check` — reconciles rollover + emits milestone events at 7/30/60/100 days (celebrated_milestones tracked to prevent re-firing).
- `increment_streak()` helper wired into: journal create, mood log, breathing log, hydration (≥8 glasses), gratitude post.
- `POST /api/gratitude`, `GET /api/gratitude`, `GET /api/gratitude/weekly-reflection` — 3-items-per-day, AI weekly reflection w/ 24h cache.
- `GET /api/diet/shopping-list` — aggregates current meal-plan ingredients, classifies into Produce/Proteins/Dairy/Grains/Pantry/Beverages.
- `GET /api/analytics/year-pixels` — 365-day mood grid.
- `GET /api/analytics/highlights` — best/toughest day of month + AI reasoning (24h cache).

**New frontend components:**
- `WellnessRing` — large SVG ring gauge w/ score-band color (red <40, amber 41-65, green >65), trend arrow, AI insight, animated 5-bar breakdown.
- `StreakRow` — 5-habit grid with active glow, current+best counts.
- `MilestoneModal` — full-screen celebration with CSS confetti at 7/30/60/100-day milestones.
- `MoodWidget` — floating "+" FAB (bottom-right) with 7-emoji mood picker + intensity slider + optional note + 4-hour subtle pulse cue. Hidden on /auth, /onboarding, /pricing, /welcome.
- `GratitudeTab` — warm amber-themed 3-item gratitude form, history list, weekly reflection modal.
- Lyra conversation starters updated to spec (6 new prompts).
- Landing footer crisis text: 988 (US) · 1-833-456-4566 (Canada) · findahelpline.com.

### 2026-06-02 — Session 1: Security + Stripe + Settings + Legal
- Replaced `llm_chat` with official OpenAI SDK (15s timeout + key rotation pool + graceful fallback to Emergent LLM key when OpenAI quota exhausted).
- Stripe subscriptions: create-checkout-session, create-portal-session, webhook with signature verification, payment_transactions ledger.
- Trial logic: every user starts on 7-day trial; `resolve_plan` auto-flips to "free" after trial_end.
- `check_access` + `require_access` factory (wiring completed in Session 2).
- Settings redesign: 6 tabs (Profile, Subscription, Notifications, Appearance, Privacy, Danger Zone) with 4 theme swatches, top-up grid (UI only), data export endpoint, account-delete with DELETE-typed confirmation, demo-account protection.
- `/pricing` page with 3 plans, 6 testimonials, FAQ accordion.
- `UpgradeModal` provider with `useUpgradeModal()` hook for any component to invoke.
- `TrialBanner` (sticky amber gradient, ≤3 days remaining, dismissable per session, hidden on auth/onboarding/pricing/welcome).
- `/privacy` + `/terms` pages with full sections + prominent medical disclaimer.
- Resend integration: welcome email on register, subscription-confirmed email on Stripe checkout completion, payment-failed email on invoice.payment_failed webhook.
- `TitleManager` in App.js: per-route document.title for all 22 routes.
- Auth page handles `?deleted=true` toast.

## Implementation Status
- [x] Gemini key rotated (new value)
- [x] OpenAI SDK (official) + key rotation pool + Emergent fallback
- [x] Stripe checkout/portal/webhook end-to-end
- [x] Trial + plan resolution + check_access enforced on all paid endpoints
- [x] Settings (all 6 tabs)
- [x] Legal pages
- [x] Resend welcome / sub-confirmed / payment-failed emails
- [x] Wellness score + streaks + milestone modal
- [x] Quick Mood floating widget
- [x] Gratitude tab in Journal
- [x] Shopping list backend endpoint
- [x] Year in Pixels + Highlights backend endpoints
- [x] Lyra conversation starters
- [x] Crisis text on Resources + Landing
- [x] Pricing/Privacy/Terms links on Landing

## Deferred (Session 2 remaining + Session 3)
- Breathing upgrade w/ all 5 methods + animated orb
- Cook-Along Mode (in RecipeModal)
- Ingredient substitution (in RecipeModal)
- Shopping list **drawer UI** (backend ready, frontend pending)
- Year in Pixels + Highlights **frontend** (Analytics page)
- Sleep × Mood correlation chart
- Mood Forecasting (backend + Analytics tab)
- Weekly AI Report modal (backend + Dashboard card)
- Anonymous Community Board
- Voice mode: live captions + session timer + post-session summary
- Message reactions on Lyra
- Onboarding progress bar + Skip option
- Welcome screen (post-onboarding)
- Loading skeletons (replace spinners)
- ErrorBoundary on routes
- AI status dot in header
- Journal insights sidebar
- Scheduled emails via APScheduler (trial expiry warning / expired / weekly digest)

## Known Issues / Watch List
- Frontend has pre-existing lint warnings in legacy pages (react/no-unescaped-entities, no-empty) — non-blocking.
- Settings useEffect missing `theme` dep — non-blocking warning.
- OpenAI account credits must be funded for live AI responses; otherwise gracefully falls back to Emergent LLM key.
- Stripe keys are LIVE in `.env` — never trigger real checkout completion during tests.

## Demo Credentials
demo@mindsphere.app / demo1234 (trial, 7 days; protected from deletion)
