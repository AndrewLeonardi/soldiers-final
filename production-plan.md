# production-plan.md — From Prototype to Shippable

**Final destination on approval:** this document will be copied to `production-plan.md` at the repo root as the first action during execution. The file lives in the plans directory only because plan-mode tooling requires it.

**Supersedes nothing.** Appends to `plan-two.md` (the living vision doc). `plan-two.md`'s four-sprint vision (Place, Training, Economy, Raid) is the *game design* plan. This is the *production readiness* plan that runs in parallel: it takes the game `plan-two.md` is building and turns it into something real users can log into, save progress in, and hand us money for.

---

## Context

The `/camp` game is real enough. Destructible bases, trained soldiers, a coherent UI, a token economy wired end-to-end, a live GA training loop, three battle levels, a daily streak system, a store sheet with five pack tiers. What it is NOT is shippable: there is no real user, no saved progression beyond browser localStorage, no way to actually buy the token packs, a legacy second game (`/play`) and a scrapped third (`/game-concept`) still mounted alongside the real one, and a token economy whose central metaphor — "pay compute, train soldiers" — currently lies about itself (100 tokens buys 25 seconds; 500 tokens buys 180 seconds; the ratio varies).

This plan does three things, in order, each shippable on its own:

1. **Sprint 1 — Cleanup & Seam.** Delete what isn't the game. Consolidate to one persisted truth. Introduce seams for account sync and real purchases without turning them on. End state: `/camp` plays identically, but the codebase stops lying about what's canonical, and Sprint 3 has clean mount points.

2. **Sprint 2 — Economy Lock + Minimum Telemetry.** Make the central metaphor honest: **1 token = 1 second of training**, visibly. Retire the daily streak in favor of a flat 150 tokens every 24h. Restructure rare-weapon costs as per-soldier one-time "manuals" so the 1:1 rule is never violated. Ship minimum-viable analytics + crash tracking so we can tune the F2P curve with real data. End state: the economy is defensible, the numbers check out, and we have instrumentation to know if they *actually* check out once real players touch them.

3. **Sprint 3 — Production: Accounts + Stripe + Legal.** Anonymous Supabase auth at boot (no wall), write-through state sync, Stripe Checkout via Edge Functions, upgrade-to-real-account from Settings + one milestone nudge. Plus the unglamorous launch prep: privacy policy, ToS, refund policy, Stripe sandbox gating, webhook idempotency. End state: a new visitor can land on the game, play without ever being blocked, save their progress to the cloud under any email, and buy tokens with real money that arrive atomically.

The over-arching constraint, stated by Andrew: **a temporary visitor must never hit a "log in to continue" wall.** Anonymous play is first-class forever. Accounts are a feature for users who want persistence across devices, not a gate.

---

# Sprint 1 — Cleanup & Seam

**The bet:** The codebase has three games in it. One is real, two are dead. We delete the dead ones, consolidate persisted state to a single store, and introduce the exact seams Sprint 3 will fill — without turning them on. `/camp` must play identically to before the sprint.

**Emotional moment (internal):** Grep for `persist(` in `/src` returns one line. `git diff --stat` is a massive negative number. The repo tree fits on one screen.

## Subsystem 1.1 — Delete the dead routes and their stores

Remove `/play` and `/game-concept` completely. `/physics-test` stays (engine reference, harmless).

**Routes:**
- Remove `/play` and `/game-concept` from `src/App.tsx`. Delete the `GameConceptBoundary` import.

**Stores to delete (all persisted keys die with them):**
- `src/stores/gameStore.ts` (key: `toy-soldiers-game`)
- `src/stores/rosterStore.ts` (key: `toy-soldiers-roster`)
- `src/stores/trainingStore.ts` (key: `toy-soldiers-training`)
- `src/stores/tutorialStore.ts`
- `src/game/stores/baseStore.ts` + `.test.ts` (key: `toy-soldiers-base`)
- `src/game/stores/trainingStore.ts` + `.test.ts` (key: `toy-soldiers-training-game-concept`)

**Directories to delete wholesale:**
- `src/scenes/*` (Game.tsx, TrainingScene.tsx, BattleScene.tsx)
- `src/ui/*` — but first **rescue** `src/ui/ToyIcons.tsx` → move to `src/game/camp/icons/ToyIcons.tsx`. Confirmed live imports from `TutorialGuide.tsx:21`, `RosterSheet.tsx:17`, `GraduationCutscene.tsx:43` (StarIcon, LockIcon).
- `src/game/base/*`
- `src/game/buildings/{TrainingGrounds,BaseBuildings,BaseWalls,Vault,Collector}.tsx` (keep nothing from `game/buildings/` if nothing else references it — verify)
- `src/game/soldiers/BaseSquad.tsx`
- `src/game/ui/*` (BaseHUD, BuildTray, TrainingObservationHUD, TrainingSelectionSheet)
- `src/game/analytics/*` — only consumers are dead stores. Safely deletable. New telemetry in Sprint 2 will live at `src/analytics/`.
- `src/three/camera/CameraRig.tsx` — only consumer is `src/scenes/BattleScene.tsx`. Goes with `/play`.
- `src/game/GameConcept.tsx`, `src/game/GameConceptBoundary.tsx`

**Also retire:**
- `src/game/training/GraduationCutscene.tsx` — check if used in `/camp`; if only `/game-concept` consumed it, delete; if camp uses it, keep and rescue its `@game/stores/trainingStore` import.
- Any remaining `src/game/training/*` files not imported by `/camp` (BaseTrainingZone, TargetCan if unused).

## Subsystem 1.2 — Consolidate to campStore as sole persisted truth

After Subsystem 1.1, the surviving persisted stores should be:
- `src/stores/campStore.ts` — tokens, soldiers, unlocks, battles, settings (THE store)
- `src/game/stores/*` directory no longer exists

**Also surviving (ephemeral, not persisted):**
- `src/stores/sceneStore.ts` — UI state
- `src/stores/campBattleStore.ts` — battle-loop ephemeral state
- `src/stores/campTrainingStore.ts` — training-run ephemeral state

**Consistency sweep:** `SLOT_COSTS` is currently duplicated in `SoldierSheet.tsx:35`, `TrainingSheet.tsx:21`, and hard-coded in `campStore.ts:140` (TRAINING_SLOT_UNLOCK_COSTS). Promote to a single exported constant in `campStore.ts` (or `src/config/economy.ts` — see Sprint 2) and import from both sheets.

## Subsystem 1.3 — campStore v13 migration

Sprint 2 will change the schema (drop `dailyStreak`, `lastDailyClaimDate`, `starterPackShown`; add `lastDailyClaimMs`, `weaponManualsPurchased` per soldier). We must not ship a data-destroying change.

**Action this sprint:** bump `campStore` version from 12 → 13 with a migration that:
- Preserves existing `tokens`, `soldiers`, `unlockedWeapons`, `unlockedSlots`, `battlesCompleted`, `tutorialCompleted`, `muted`.
- Leaves `dailyStreak` / `lastDailyClaimDate` / `lastDailyClaimTime` intact for now (they become dead fields in Sprint 2, but killing them here risks collision with a user who's mid-upgrade).
- No schema change yet — just the migration plumbing. Sprint 2 bumps to v14 for the real cutover.

This gives Sprint 2 a safe landing zone: one migration step for the economy reshape, not a multi-version cascade.

## Subsystem 1.4 — Introduce the seam (but don't turn it on)

Create `src/api/` with two files:

**`src/api/user.ts`:**
```
initUser(): Promise<{ userId: string; isAnonymous: true }>
getUserId(): string | null
```
For Sprint 1, returns a stable `local-{uuid}` generated once and stashed in a dedicated localStorage key. Resolves synchronously-ish. Sprint 3 replaces the body with Supabase auth calls.

**`src/api/sync.ts`:**
```
queueSync(key, payload): void   // no-op today, logs "would sync: {key}" in dev
flushSync(): Promise<void>       // no-op today
```

**`src/api/purchase.ts`:**
```
purchasePack(packId): Promise<{ granted: number }>
```
For Sprint 1, this function exists and calls `campStore.addTokens(pack.tokens)` directly (same as today's behavior). Sprint 3 replaces the body with a Stripe Checkout redirect. The call site in `StoreSheet.tsx` goes through this wrapper instead of calling `addTokens` directly.

## Subsystem 1.5 — Awaitable bootstrap

`src/game/camp/CampPage.tsx` currently mounts `<Canvas>` synchronously. Refactor so it awaits `initUser()` before the Canvas renders, while the `BootScreen` crossfade still runs. Today `initUser()` resolves ~instantly; in Sprint 3 it may briefly call Supabase. The BootScreen animation length masks any latency — user never sees a loading state.

## Subsystem 1.6 — Wrap token mutations

Every token-affecting action on `campStore` (`setTokens`, `addTokens`, `spendTokens`, `unlockWeapon`, `claimDailyReward`, `completeBattle`) must funnel through a single internal helper — e.g., `_mutateTokens(delta, reason: string)` — that:
- Applies the change locally (as today).
- Calls `queueSync('tokens', newValue)` (no-op in Sprint 1).
- Accepts a `reason` tag used by Sprint 2 telemetry and Sprint 3 server writes.

This is the single most important Sprint 1 change for Sprint 3's sake: it means the Stripe webhook integration doesn't have to hunt down five callsites.

## Subsystem 1.7 — Stale backlog sweep

Close out or triage the "Deferred polish" checklist in `plan-two.md`. Move anything that's been silently shipped into the completed-log, delete anything no longer relevant, leave in place only what's legitimately still open.

## Success test (Sprint 1)

- `ls src/stores/ src/game/stores/ 2>/dev/null` prints ≤ 4 files total (campStore, sceneStore, campBattleStore, campTrainingStore).
- `grep -r "persist(" src/` returns one entry (campStore).
- Route table: `/`, `/camp`, `/physics-test`. No `/play`, no `/game-concept`.
- Fresh boot of `/camp` — indistinguishable in behavior from pre-sprint. Tutorial still runs end-to-end. Training still completes. Battles still play. Daily still claims.
- Existing persisted localStorage state from before the sprint still loads (v12 → v13 migration is clean).
- `grep -r "addTokens\|spendTokens\|setTokens" src/` shows all callsites routed through the internal wrapper (or are confined to `campStore.ts`).
- `git diff --stat main..HEAD` shows a net removal ≥ 3,000 LOC.

---

# Sprint 2 — Economy Lock + Minimum Telemetry

**The bet:** The central metaphor becomes rigorously honest. 1 token buys exactly 1 second of training, no exceptions, and the player literally watches the counter tick down at 1 Hz during the run. The daily becomes a single, flat, boring 150-tokens-per-24h grant — no streaks, no escalation, no forgiveness math. The F2P curve is modeled, documented, and instrumented so we can see if it actually works.

**Emotional moment (player-facing):** Player taps START on a 30-second training run. The token counter in the HUD ticks: 380 → 379 → 378, once per second, matching the training timer ring above the building. At the end: 350. Thirty seconds elapsed, thirty tokens spent. Nothing was abstracted. Nothing was a metaphor. The game told the truth about its own substrate.

**Emotional moment (internal):** I open `docs/economy.md` and see a day-by-day spreadsheet of what a F2P player accumulates vs. what the "fully trained squad" ask costs. The two curves cross around Day 10-14 for a motivated player — that's the first natural moment they'd consider a $2.99 purchase. The curve is designed, not guessed.

## Subsystem 2.1 — TIME_PACKAGES rewrite to 1:1

`src/game/camp/trainingConstants.ts`:

| Package | Cost | Duration | Ratio |
|---|---|---|---|
| Quick | **15 tokens** | 15s | 1:1 |
| Standard | **30 tokens** | 30s | 1:1 |
| Extended | **60 tokens** | 60s | 1:1 |
| Marathon | **180 tokens** | 180s | 1:1 |

Retire `TUTORIAL_TIME_PACKAGE`. Tutorial uses Quick directly (15 tokens = 15s).

Delete the `@deprecated COMPUTE_TIERS`, `TRAINING_BASE_COST`, `TRAINING_BASE_DURATION` constants — they've been dead since the time-package rewrite.

## Subsystem 2.2 — Per-soldier weapon manuals

Replace `WEAPON_TRAINING.tokenCost` in `src/config/roster.ts` with a new export `WEAPON_MANUAL_COST`:

| Weapon | Manual fee (per-soldier, one-time) |
|---|---|
| rifle | 0 (starter) |
| grenade | **80** |
| rocketLauncher | **150** |
| machineGun | **150** |
| tank | **300** |

**Flow change:** Battle-victory unlocks the weapon at the account level (unchanged — `unlockedWeapons[]` stays). But for each soldier, the first time they train on a rare weapon, the manual fee is charged *before* the per-second training begins. UI shows "LEARN GRENADE — 80 TOKENS" as a distinct preamble button on the TrainingSheet, then the 1:1 session begins.

**Schema addition (campStore v14):** `SoldierRecord.weaponManualsPurchased: WeaponType[]` — the list of weapons this soldier has already paid the manual for. Existing soldiers migrate with an empty array; any weapon they've actually trained on (i.e., has entries in `trainedBrains`) gets grandfathered into this list so nobody gets charged retroactively.

## Subsystem 2.3 — Daily simplification

Retire: `DAILY_DRIP_AMOUNT`, `DAILY_DRIP_MAX_DAYS`, `DAILY_DRIP_INTERVAL_MS`, `DAILY_STREAK_REWARDS`, `DAILY_STREAK_FORGIVENESS`, `campStore.dailyStreak`, `campStore.lastDailyClaimDate`, `campStore.lastDailyClaimTime`, `claimDailyTokens()`, `canClaimDaily()` helpers (the streak variants).

Introduce:
- `DAILY_GRANT = 150` (src/config/store.ts)
- `DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000`
- `campStore.lastDailyClaimMs: number` (epoch ms, 0 = never)
- `claimDaily()` → `{ tokens: 150 } | null` — returns null if within cooldown
- `canClaimDaily()` → `boolean`

**UI:** `DailyRewardPopup.tsx` simplifies to one card, one button, one reward. No 7-day strip.

## Subsystem 2.4 — Starter balance: 500 → 200

`campStore.ts` default `tokens: 200`. At 1 token/sec that's 3.3 min of training — enough to finish tutorial (Quick session 15 tokens) + one Standard session (30 tokens) + experiment. Combined with tutorial completion reward (+100) and day-1 daily (+150), a new player lands at ~435 tokens on their first real session.

Existing players migrating from v13: **no retroactive change.** Their current balance is preserved. Only new profiles start at 200.

## Subsystem 2.5 — The visual honesty moment

During any active training run, the HUD token counter ticks down at 1 Hz, in sync with the `ProgressRing` above the Training Camp building. Visual-only — the server-of-truth deduction happened at START (see the `reason: 'training-commit'` mutation seam from Sprint 1). The counter animation is cosmetic but the math lines up.

Copy pass across all token-cost UI:
- TrainingSheet START button: "`START — 30 TOKENS / 30 SECONDS`" (both values shown, always)
- StoreSheet pack tiles: add a "`= X MIN TRAINING`" secondary label next to the token amount
- TokenCounter tooltip (on long-press): "`1 TOKEN = 1 SECOND OF TRAINING`"

## Subsystem 2.6 — Minimum-viable telemetry

Not a full analytics build-out — a floor. Enough to answer "is the economy working" after Sprint 3 launches.

**Add:**
- `src/analytics/events.ts` (new home, not the deleted `@game/analytics`) with a single `track(event, props)` helper.
- Wire up to PostHog Cloud (free tier, EU-hostable, has event + funnel + retention built-in). Env var: `VITE_POSTHOG_KEY`. No key → no-op.
- Sentry for crash tracking. `VITE_SENTRY_DSN`. No DSN → no-op.

**Events to track (minimum set):**
1. `boot` — app loaded, with `user_id` (anon for Sprint 2)
2. `tutorial_complete`
3. `training_start` — props: `{ weapon, package, cost, soldier_id }`
4. `training_complete` — props: `{ duration, fitness, weapon }`
5. `weapon_manual_purchase` — props: `{ weapon, soldier_id, cost }`
6. `battle_start` / `battle_complete` — props: `{ battle_id, stars?, reward? }`
7. `daily_claimed` — props: `{ tokens }`
8. `store_opened`
9. `pack_viewed` — props: `{ pack_id }`
10. `pack_clicked` — props: `{ pack_id, price }` (in Sprint 2 just grants tokens; in Sprint 3 triggers Stripe)

**What's explicitly deferred:** dashboard design, funnel analysis, cohort retention — those happen when Sprint 3 ships and real users exist.

## Subsystem 2.7 — `docs/economy.md` F2P progression spreadsheet

Deliverable: a plain-Markdown table showing for days 1, 3, 7, 10, 14, 21, 30:
- Cumulative tokens earned (starter + tutorial + dailies + projected battle rewards)
- Cumulative tokens spent (assumed play patterns: one Standard training per day, one rare-weapon manual on Day 3, one Marathon on Day 7, one slot-2 unlock on Day 10, etc.)
- Running balance
- "Active wants" list (what the player can't quite afford yet)

Target curve: at Day 10-14 a motivated player has roughly enough for one-but-not-both of {fully kit out a second soldier on rare weapons, unlock slot 3}. That's the first honest "I'd pay $2.99 to do both" moment.

## Subsystem 2.8 — Pack values — explicitly deferred to Sprint 3

The existing pack prices (Spark 100/$0.99 through War Chest 5000/$24.99) carry forward unchanged into Sprint 2. **Any pack tuning waits for real Sprint-2 telemetry.** This is a conscious hold — we don't guess at pack/price fit when we'll have 2-4 weeks of real conversion data from Sprint 3 launch to tune against.

Called out in the plan so Sprint 2 scope doesn't balloon. The `purchasePack(packId)` seam from Sprint 1 makes this a config-only change.

## Success test (Sprint 2)

- Fresh install, watch tutorial → first training run → counter ticks 1 per second, matching the ring above the building. Five seconds in, pause, check: counter is down by exactly 5.
- Claim daily: exactly 150 tokens arrive, with the daily-claim ceremony. Second claim within 24h is blocked with a "next claim in Nh Nm" tooltip.
- Start a rare-weapon training for the first time on any soldier: UI blocks the START button with "LEARN [WEAPON] — N TOKENS" first. After paying, START is live.
- `docs/economy.md` exists, is reviewed, the curves cross where we want them to.
- PostHog dashboard shows at least the 10 events firing during a full test session. Sentry logs a deliberately-thrown test error.
- All tests green. `campStore` is at v14 with a working migration path from v12 and v13.

---

# Sprint 3 — Production: Accounts + Stripe + Legal

**The bet:** Turn on the seams. A new visitor gets an anonymous Supabase session the instant the page loads, plays with zero wall, and their state lives in the cloud from first click. The store sheet now takes real money. A "Save your progress" CTA in Settings converts anon to real accounts, preserving everything. Legal and infra prep means the first real charge is handled correctly.

**Emotional moment (player-facing):** Alice visits the site on her laptop. Plays for 20 minutes. Trains three soldiers. No login screen, no popup, no friction. In Settings she notices a discreet "SAVE YOUR PROGRESS" pill — taps it, picks Google, one redirect, back in the game. That night on her phone, she visits the site, signs in with Google, and her camp is already there: same soldiers, same trained brains, same token balance.

**Emotional moment (player-facing):** Bob wants the Arsenal pack. Taps it. Stripe checkout appears (hosted, clean, recognizable). Pays. Returns to the game. The token counter animates upward by 1500 with the same springy chime that daily rewards use. His soldiers feel more reachable. He trains three marathons back-to-back. Real money, real acceleration, no friction.

## Subsystem 3.1 — Supabase project setup

- Create Supabase project. Env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Install `@supabase/supabase-js`. Singleton at `src/api/supabase.ts` (port shape from the old ToySoldiersTwo `src/api/supabase.js`): session persistence on, auto token refresh on, URL-based session detection on, custom storage key `soldiers-supabase-auth`.

## Subsystem 3.2 — Replace `src/api/user.ts` stub

- `initUser()` now: restore existing Supabase session OR call `supabase.auth.signInAnonymously()` to mint a fresh anon user. Returns `{ userId, isAnonymous }`.
- `upgradeAccount({ provider })` — OAuth-only. Google provider in v1. Preserves user_id via Supabase's `linkIdentity` flow. Email magic link as secondary option.
- `signOut()` clears session. Next boot gets a new anon user.
- **Merge-conflict UX:** if a user tries to upgrade to a Google account that already has a linked Supabase user, show a clear "You already have an account on this Google login. Keep your current camp, or switch to the existing one?" modal. No silent merges. This is the hardest piece — prototype week 1.

## Subsystem 3.3 — Schema (SQL migration 001)

Scoped to v1, minimal:

```sql
profiles (
  user_id uuid primary key references auth.users,
  tokens int not null default 200,
  unlocked_weapons text[] not null default array['rifle'],
  unlocked_slots int not null default 1,
  battles_completed jsonb not null default '{}',
  tutorial_completed bool not null default false,
  last_daily_claim_ms bigint not null default 0,
  muted bool not null default false,
  updated_at timestamptz not null default now()
);

soldiers (
  id text primary key,  -- e.g. 'soldier-1739382...'
  user_id uuid not null references auth.users,
  name text not null,
  weapon text not null default 'rifle',
  trained bool not null default false,
  trained_brains jsonb not null default '{}',  -- { weaponType: weights[] }
  weapon_manuals_purchased text[] not null default array[]::text[],
  fitness_score real,
  generations_trained int not null default 0,
  xp int not null default 0,
  injured_until_ms bigint,
  updated_at timestamptz not null default now()
);

purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  stripe_session_id text unique not null,
  stripe_event_id text unique,  -- idempotency key for webhook
  pack_id text not null,
  tokens_granted int not null,
  status text not null check (status in ('pending','completed','refunded','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: owner-only CRUD on all three tables.
-- Trigger: on auth.users insert, create profiles row with defaults.
```

**Brain size note:** JSONB `trained_brains` holds the weight arrays. Current [7,8,4] rifle net is ~100 floats (~800 bytes). 5 weapons × 6 soldiers × 800B = ~24KB across all soldier rows per user. Fine. If a future weapon uses a meaningfully larger net (say [16,32,6] tank brain), revisit moving to Supabase Storage. Not a v1 concern.

## Subsystem 3.4 — Write-through sync wiring

Replace the `src/api/sync.ts` stub with real logic:

- **Reads:** boot loads from Supabase once, writes into zustand. Zustand/localStorage remains the read-source for UI. Never block a render on the network.
- **Writes:** 400ms debounced. Any `campStore` mutation that carries a tracked `reason` queues a write. Field-level granularity (don't push the full profile on every token change — push only the delta).
- **Conflict rule:** server-authoritative on `tokens` (anti-cheat). Timestamp-win on everything else.
- **Cheat window UX:** local spend applies optimistically. If the server rejects (balance mismatch), roll back the UI with a gentle "Sync hiccup — refreshed your balance" toast. Rare path, should not happen outside of malicious clients.
- **First-login upload:** new Supabase user, existing localStorage profile → upload the local v14 state to `profiles` + `soldiers` atomically on first successful auth. One-time.
- **Cross-device collision:** user signs in on device 2 with existing server state → server wins, local is overwritten. Warn via modal: "Your camp on this device will be replaced with your saved camp." Offer "cancel, stay offline."

## Subsystem 3.5 — Stripe via Edge Functions

Three Supabase Edge Functions:

**`checkout-create`** (invoked client-side):
- Body: `{ packId }`
- Looks up pack from a server-side config (never trust client prices).
- Calls Stripe: `stripe.checkout.sessions.create` with success + cancel URLs, the pack's price_id, `client_reference_id = user_id`, metadata `{ pack_id, tokens_granted }`.
- Inserts `purchases` row with `status: 'pending'`.
- Returns `{ url }` → client redirects.

**`stripe-webhook`** (invoked by Stripe):
- Verifies signature with webhook secret.
- On `checkout.session.completed`: idempotency check (insert or skip on `stripe_event_id` conflict), set `purchases.status = 'completed'`, call RPC `grant_tokens(user_id, amount, purchase_id)` to atomically increment `profiles.tokens`.
- On `charge.refunded`: different event, different idempotency key, reverse the grant via `revoke_tokens(user_id, amount, purchase_id)`.
- Never trusts client-side amounts. Always uses the server config.

**`purchase-status`** (invoked client-side on return):
- Body: `{ session_id }`
- Returns current `purchases` row status + `tokens_granted` if completed.
- Client polls briefly on return from Stripe (up to ~8s) to detect completion; when it flips to `completed`, trigger the token-arrival ceremony.

**StoreSheet integration:** `purchasePack(packId)` (the Sprint 1 seam) now calls `checkout-create`, opens `window.location.href = url`. On return, `CampPage` detects `?purchase=success&session_id=...` in URL, polls `purchase-status`, plays the ceremony, clears the URL params.

**Sandbox gating:** all Stripe code paths gated on `import.meta.env.MODE === 'production'` vs sandbox keys. A clear "TEST MODE" label in the bottom corner of the StoreSheet whenever non-prod keys are detected.

## Subsystem 3.6 — Upgrade-to-real-account flow

- `SettingsSheet`: new pill at the top. For guests: "GUEST — SAVE YOUR PROGRESS →" primary action. For authenticated users: shows email/name + "SIGN OUT" secondary.
- One milestone nudge: shown exactly once, after whichever of {first trained soldier, first battle win, first purchase} happens first. Non-blocking bottom-sheet with "Save your progress now" (→ Google) and "Maybe later" (dismissed permanently).
- No account wall, ever. Per Andrew's binding directive.

## Subsystem 3.7 — Legal + store-readiness

- **Privacy Policy** at `/privacy` — collected data, retention, third parties (Supabase, Stripe, PostHog, Sentry), contact address. Plain-language template.
- **Terms of Service** at `/terms` — arbitration, refund policy, IP, warranty disclaimers.
- **Refund policy** — specifically: token purchases are non-refundable once consumed in-game; unconsumed purchases refundable for 14 days via support email. Stripe webhook handles the reversal path.
- **Age gating** — modest gate at first Stripe interaction: "Are you 13 or older?" yes/no checkbox with date. COPPA-safe since we don't collect from under-13s; if they say no, we disable the Store.
- **Cookie / privacy banner** — minimum viable ("We use cookies for auth and analytics. Learn more.") with a single dismiss. GDPR-defensible for hobby-scale without going full CMP.

## Subsystem 3.8 — Pack tuning (data-informed)

Late in the sprint, with 2+ weeks of Sprint 2 telemetry in hand: revisit the five pack values and prices. Expect at least one change — most likely Spark gets retired or repriced (it's too thin under the 1:1 metaphor), and one mid-tier pack gets "BEST VALUE" rebalanced.

This is a config edit (`src/config/store.ts`) plus matching Stripe product/price setup. The `purchasePack` seam and server-side price lookup make this low-risk.

## Success test (Sprint 3)

- Clear storage entirely. Load `/camp`. Play for 5 minutes. Open Supabase dashboard: a new `profiles` row exists with matching tokens, matching soldiers, `updated_at` ticking.
- Tap "SAVE YOUR PROGRESS" → Google SSO. Return to game. Open another browser, sign in with same Google. Same camp visible, same balance, same roster.
- In sandbox mode: tap Surge pack → Stripe test-card checkout → return to game → 600 tokens arrive with ceremony. `purchases` row shows `completed` with the right `stripe_event_id`.
- Deliberately trigger a Stripe refund via dashboard. Webhook fires. Balance decreases by 600. No double-processing (re-firing the webhook is a no-op).
- Privacy policy, ToS, refund policy, age gate all present and reachable from Settings.
- Sentry captures a deliberately-thrown production error with full context.
- Running `/camp` with `VITE_SUPABASE_URL` unset still works (offline mode — writes are local only, no crash).

---

# Economy Curve — Target F2P Progression

This is the reference model the Sprint 2 `docs/economy.md` spreadsheet makes concrete. Numbers here are the **design intent**; Sprint 2 ships the precise day-by-day table based on measured gameplay.

**Earnings (F2P, daily-login assumption):**
- Starter: 200
- Tutorial reward: +100
- Battle 1 reward: +100
- Battle 2 reward: +150
- Battle 3 reward: +200
- Daily: +150/day every 24h

**Typical endgame ask (fully kitted 6-soldier squad):**
- 4 rare weapon manuals × 6 soldiers = 6 × (80 + 150 + 150 + 300) = 4,080 tokens
- ~60s average training per soldier-per-weapon, 5 weapons × 6 soldiers = 1,800 tokens
- Slot 2 + Slot 3 = 700 tokens
- Re-training margin (players experiment, fail, retry) = ~500 tokens
- **Total: ~7,080 tokens**

**F2P accumulation:**
- Day 1: 200 + 100 + 100 + 150 = 550
- Day 7: 550 + 150×6 + battle-2 150 = ~1,600
- Day 14: 2,650
- Day 21: 3,700
- Day 30: 4,750
- Day 45: 6,000
- Day 60: 7,500 → endgame reached

**The wall:**
- Day 7-10: player can fully rare-equip 2-3 soldiers but not the full squad. First "just a bit more would do it" moment. Matches Charge pack ($2.99, 300 tokens) price point → "one pack closes the gap for another soldier."
- Day 21-30: player can see endgame but it's 2-3 weeks away on dailies alone. Matches Arsenal pack ($9.99, 1,500 tokens) → "jump the queue entirely."

This curve is intentionally *generous enough* that a dedicated free player does reach endgame in ~60 days. That's on the long end for mobile F2P but the alternative — impossible without paying — burns out the user base we need to validate the game design.

---

# Critical Files Reference

**Files this plan directly modifies across all three sprints:**

Sprint 1:
- `src/App.tsx` — delete `/play`, `/game-concept` routes
- `src/stores/campStore.ts` — v12→v13 migration, token-mutation wrapper, seam integration
- `src/game/camp/CampPage.tsx` — awaitable bootstrap
- `src/game/camp/StoreSheet.tsx` — route pack clicks through `purchasePack`
- `src/game/camp/SoldierSheet.tsx`, `TrainingSheet.tsx` — consolidate SLOT_COSTS
- **New:** `src/api/user.ts`, `src/api/sync.ts`, `src/api/purchase.ts`
- **Move:** `src/ui/ToyIcons.tsx` → `src/game/camp/icons/ToyIcons.tsx`
- **Delete:** see Subsystem 1.1 full list

Sprint 2:
- `src/game/camp/trainingConstants.ts` — new TIME_PACKAGES
- `src/config/roster.ts` — new WEAPON_MANUAL_COST, retire WEAPON_TRAINING.tokenCost
- `src/config/store.ts` — new DAILY_GRANT, retire streak constants
- `src/stores/campStore.ts` — v13→v14 migration, drop streak state, add `weaponManualsPurchased` per soldier, add `lastDailyClaimMs`
- `src/stores/campTrainingStore.ts` — insert manual-fee prerequisite before training start
- `src/game/camp/TrainingSheet.tsx` — "LEARN WEAPON" preamble button, 1:1 copy
- `src/game/camp/StoreSheet.tsx` — "X MIN TRAINING" secondary labels on pack tiles
- `src/game/camp/TokenCounter.tsx` — 1 Hz tick-down during active training
- `src/game/camp/DailyRewardPopup.tsx` — single-card layout
- `src/game/camp/TutorialGuide.tsx` — update tutorial package reference
- **New:** `src/analytics/events.ts`, `src/analytics/posthog.ts`, `src/analytics/sentry.ts`
- **New:** `docs/economy.md`

Sprint 3:
- `src/api/user.ts` — real Supabase auth
- `src/api/sync.ts` — real write-through
- `src/api/purchase.ts` — real Stripe checkout
- `src/game/camp/SettingsSheet.tsx` — upgrade CTA
- `src/game/camp/CampPage.tsx` — milestone nudge, return-from-Stripe flow
- **New:** `src/api/supabase.ts`
- **New:** `supabase/migrations/001_initial_schema.sql`, `002_rpc_grants.sql`
- **New:** `supabase/functions/checkout-create/index.ts`, `stripe-webhook/index.ts`, `purchase-status/index.ts`
- **New:** `src/pages/PrivacyPage.tsx`, `TermsPage.tsx`, `RefundPage.tsx` (or equivalent routes)

---

# Verification Protocol

Each sprint has its own success tests (above). The over-arching production-readiness checklist, verified before declaring the whole plan complete:

1. **Clean install, offline mode.** Clear storage. Load `/camp` with no Supabase/Stripe env vars set. Tutorial runs. Training runs. Battle plays. Daily claims. No console errors.
2. **Clean install, online mode.** Clear storage. Load `/camp` with full env vars. Anonymous session auto-created. 5 minutes of play → server reflects state. Reload → state restored.
3. **Upgrade flow.** Anon → Google SSO. State preserved. Sign out. Re-sign-in same Google. State restored. Second device same Google. State syncs.
4. **Purchase flow (sandbox).** Every pack purchasable with Stripe test cards. Webhook fires. Tokens atomically credited. Ceremony plays.
5. **Purchase flow refund path.** Refund via Stripe dashboard. Tokens atomically reversed. No orphan state.
6. **Economy honesty.** During any training run, HUD counter's tick rate visibly matches 1 Hz and matches the elapsed seconds on the ring.
7. **Telemetry.** PostHog dashboard shows all 10 event types firing. Sentry captures errors with user context.
8. **Legal.** Privacy, ToS, refund policy visible from Settings and at `/privacy`, `/terms`, `/refund` routes.
9. **Test suite.** All vitest tests green across all three sprints. No skipped or `.only` tests.
10. **Build.** `npm run build` completes. `npm run typecheck` clean.

---

# Execution Note (for post-approval)

**Step 0 of execution:** this file is copied to `production-plan.md` at the repo root. The plans-directory path is a plan-mode artifact only; the repo root is the living home.

**Sprint 1 opens with:** a deletion PR that can be reviewed holistically. Nothing in this plan is irreversible — every change is a normal code edit. The Supabase schema (Sprint 3) is the only piece with real-world state implications, and its RLS + idempotency design contains that risk.
