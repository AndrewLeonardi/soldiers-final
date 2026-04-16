# Token Design Unification Sprint

## Context

Tokens are the central metaphor of this game ("1 token = 1 second of training"). That mechanical honesty is solid now — the problem is visual and copy inconsistency that makes the currency feel scattered instead of central.

The specific issues playtest flagged:
1. The existing `TokenIcon.tsx` is a flat 2D microchip with a tiny lightning bolt — reads web-app-y, not game-y. Andrew found a 3D chip aesthetic (rich dark navy body with a glowing teal chip motif) and wants it as the visual language everywhere.
2. The HUD token counter + daily strip is visually busy and the design feels secondary to how critical the currency is.
3. The Token Store tiles use a "scattered chip pile" that doesn't read cleanly — should be stacks (bigger pack = taller stack).
4. "= N SECONDS" copy appears in the Daily Reward popup, Welcome popup, and TokenCounter wallet — that conversion messaging belongs on the training-commit side only; it clutters the currency surface.
5. The old tutorial "YOUR TOKENS" popup (step 1 of `tutorialSteps.ts`) plus the "WELCOME, COMMANDER" popup (step 0) both redundantly cover what the new `WelcomeRewardPopup` now handles. Fresh users see three "welcome" beats in a row.
6. `TokenModal.tsx` is wired but has zero callsites — orphaned.

**The win:** one canonical chip component, one consistent stack language for packs, one welcome beat, zero "SECONDS" copy outside training, and the HUD + Store + Daily + Welcome all visibly belong to the same design system.

## Approach

Build a new `TokenChip` SVG component that replaces `TokenIcon` everywhere. Rich gradients + bevel + glow + drop shadow make it read as 3D without needing an actual canvas. Size-configurable for inline (16px) up to hero (60px). A `count` prop produces a stacked variant via overlapping SVGs at a y-offset.

Delete `TokenIcon`, `TokenModal`, and the `ChipPile` helper. Strip all "SECONDS" copy outside training. Simplify tutorial to start at RECRUIT. Redesign the five token surfaces: HUD counter, Token Store, Daily Reward, Welcome, and the training cost displays.

## Plan

### Phase A — New `TokenChip` component

**Create:** `src/game/camp/TokenChip.tsx`

Props:
- `size?: number` — bounding width in pixels; default 24
- `count?: number` — how many chips in the stack (1 / 2 / 3 / 5 / 8). Default 1.
- `glow?: boolean` — extra cyan aura, used in hero moments (Welcome, Daily, balance pill). Default false.
- `className?: string`

Internals (single-chip):
- SVG viewBox sized for count × stack offset
- For each chip (back→front):
  - Rounded rect body: linear gradient from `#1c2a3e` (top) to `#0a1320` (bottom) + 1.5px stroke `rgba(80,170,220,0.55)`
  - Top bevel: radial gradient overlay, white at 18% opacity in the upper-left quadrant
  - Bottom shadow: radial gradient, black at 40% opacity in the lower edge
  - Center chip motif: teal radial glow (`#4de8ff → transparent`) + 8 radiating pin segments in `#5ecfe0`
  - Core square: `#0d1a28` with 1px `#5ecfe0` border, centered
- Stack positioning: each back chip offset +6px down + 3px right, 85% opacity, 98% scale
- When `glow` is true, add a `<filter>` drop-shadow + extra outer radial gradient in `#4de8ff`

Renders identically at any size; stacks cleanly inline with text baselines by aligning the frontmost chip's vertical-center to text midline.

**Delete:** `src/game/camp/TokenIcon.tsx` after all callsites migrate.

### Phase B — Replace every `TokenIcon` callsite

Sweep all 9 files and swap `TokenIcon` → `TokenChip`, tuning size per context:

| File | Current sizes | New sizes + count |
|---|---|---|
| `src/game/camp/TokenCounter.tsx` | 26 (hero), 14 (wallet) | 32 hero with `glow`, 16 wallet |
| `src/game/camp/DailyRewardPopup.tsx` | 28, 16 | 40 `glow`, 16 |
| `src/game/camp/WelcomeRewardPopup.tsx` | 28 | 48 `glow` |
| `src/game/camp/StoreSheet.tsx` | in ChipPile + balance pill | NEW: balance pill = 18 single; tiles = stack-count per pack (see Phase D) |
| `src/game/camp/TrainingSheet.tsx` | 10, 12, 14 at 6 sites | 12 single across the board |
| `src/game/camp/SoldierSheet.tsx` | 12–16 at 5 sites | 14 single |
| `src/game/camp/ArmorySheet.tsx` | 14, 18 | 14, 18 single |
| `src/game/camp/BattlePickerSheet.tsx` | 14 | 14 single |
| `src/game/camp/TutorialGuide.tsx` | 14 | 14 single |

### Phase C — TokenCounter (the HUD hero) redesign

**File:** `src/game/camp/TokenCounter.tsx`

- Keep the beveled hero container; improve hierarchy.
- Lift the amount text from `26px` to `30px`, tighten letter-spacing. Keep "TOKENS" label below.
- Swap chip → `TokenChip size={32} glow` with subtle pulse on `--burning` state (reuses existing `token-hero--burning` animation).
- **Simplify the DAILY affordance.** Current strip below the counter reads as a second row competing for attention. Replace with a small pill that sits inside the counter card on its right edge when claimable ("CLAIM +150" pill pulsing), and collapses into a tiny countdown chip when not claimable ("23h 12m").
- **Remove from wallet tooltip:** the "RATE: 1 TOKEN = 1 SECOND" row.
- Wallet tooltip rows: BALANCE / NEXT DAILY / GET MORE button.

CSS work: replace `.token-daily-strip` with `.token-daily-inline` (a pill absolutely positioned right-of-value); update `--burning` pulse to glow the new chip.

### Phase D — StoreSheet redesign (now "Token Store")

**File:** `src/game/camp/StoreSheet.tsx`

- Rename header: "STORE" → "TOKEN STORE".
- Balance pill at top: use new `TokenChip size={18}`.
- **Delete the `ChipPile` component** (the scattered pile). Replace with `TokenChip count={N}` where N is the new stack mapping:

| Pack | tokens | count |
|---|---|---|
| Spark | 100 | **1** |
| Charge | 300 | **2** |
| Surge | 600 | **3** |
| Arsenal (featured) | 1500 | **5** |
| War Chest | 8 | **8** |

Update `TokenPack.chipCount` in `src/config/store.ts` to these new values (or add a new `stackCount` field and deprecate `chipCount`).

- **Remove any secondary copy like "X MIN TRAINING" or "= N SECONDS".** None is currently in `StoreSheet` (audited), but keep alert: the design pass must not re-introduce it. Tile layout:
  - Stack icon (top, large)
  - Token amount + "TOKENS" label
  - Pack name (Spark / Charge / etc.)
  - Pack description (keep — e.g. "Train a full soldier")
  - Price pill (green, $X.XX)

- Featured pack tile layout: stack on left, info on right, ribbon "BEST VALUE" top-right, gold-bordered card.

### Phase E — DailyRewardPopup redesign

**File:** `src/game/camp/DailyRewardPopup.tsx`

- **Remove:** the `= {DAILY_GRANT} SECONDS` sub-line (line 50).
- Change subtitle from "A FULL DAY OF TRAINING ON THE HOUSE" to **"YOUR DAILY TOKEN DROP"**.
- Hero tile shows `TokenChip size={40} glow` + amount number. Cleaner, less vertically tall.
- Collect button copy unchanged: "COLLECT 150 TOKENS".

### Phase F — WelcomeRewardPopup redesign

**File:** `src/game/camp/WelcomeRewardPopup.tsx`

- **Remove:** the `= {starterTokens} SECONDS` sub-line (line 51).
- Title / subtitle / subnote / CTA unchanged in text.
- Hero tile shows `TokenChip size={48} glow` + `200` amount in the big display font.

### Phase G — Training UI chip pass

**Files:** `src/game/camp/TrainingSheet.tsx`, `src/game/camp/SoldierSheet.tsx`

- Every TokenIcon → TokenChip at size 12–14 (inline with cost numbers).
- **Keep** the training START button's `/ 30s` duration suffix — that's actual duration, not a currency rate. Per Andrew: "remove seconds aspect around the token store. Keep in training."
- **Keep** the "LEARN GRENADE — 80 TOKENS" manual preamble copy; just swap the icon.

### Phase H — Delete orphans and tutorial cleanup

**Delete:**
- `src/game/camp/TokenModal.tsx` — no callsites (confirmed audit).
- Remove the `<TokenModal />` mount from `CampPage.tsx`.
- Remove `tokenModalOpen` / `setTokenModalOpen` from `sceneStore.ts` if only TokenModal used them.

**Tutorial step cleanup** (`src/config/tutorialSteps.ts`):
- Delete step 0 ('welcome' / "WELCOME, COMMANDER") — WelcomeRewardPopup covers it.
- Delete step 1 ('claim-tokens' / "YOUR TOKENS") — WelcomeRewardPopup covers it; daily auto-shows after tutorial completes.
- Tutorial now starts at the old step 2 (RECRUIT YOUR FIRST SOLDIER).

**TutorialGuide.tsx cleanup:**
- Remove the `claim-tokens` side-effect branch in `handleNext` (`claimDaily()` call).
- Remove the `variant: 'tokens'` special-case rendering if only the deleted steps used it (check other steps; `train-intro` also uses `variant: 'tokens'` — keep that variant's styling but verify it renders the new TokenChip cleanly).

### Phase I — CSS consolidation

**File:** `src/styles/camp-ui.css`

- Delete `.chip-pile`, `.chip-pile--large`, `.chip-pile-item` — replaced by TokenChip's built-in stacking.
- Rename `.token-daily-strip` → `.token-daily-inline` and restyle per Phase C.
- Audit `.token-hero--burning` animation target — should still glow the new chip via CSS filter.
- Any `--tokens` classes that reference the old icon stroke color: migrate to the new chip's cyan palette.

## Critical files

**New:**
- `src/game/camp/TokenChip.tsx`

**Heavy edits:**
- `src/game/camp/TokenCounter.tsx` — Phase B + C (redesign + chip swap)
- `src/game/camp/StoreSheet.tsx` — Phase D (rename, stack-count, tile redesign)
- `src/game/camp/DailyRewardPopup.tsx` — Phase E (remove SECONDS, chip swap)
- `src/game/camp/WelcomeRewardPopup.tsx` — Phase F (remove SECONDS, chip swap)
- `src/config/tutorialSteps.ts` — Phase H (delete 2 steps)
- `src/game/camp/TutorialGuide.tsx` — Phase H (remove side effect)
- `src/config/store.ts` — Phase D (stackCount mapping)
- `src/styles/camp-ui.css` — Phase I (CSS cleanup)

**Light chip-swap edits:**
- `src/game/camp/TrainingSheet.tsx`
- `src/game/camp/SoldierSheet.tsx`
- `src/game/camp/ArmorySheet.tsx`
- `src/game/camp/BattlePickerSheet.tsx`
- `src/game/camp/TutorialGuide.tsx`

**Deletes:**
- `src/game/camp/TokenIcon.tsx`
- `src/game/camp/TokenModal.tsx`

**CampPage.tsx:** remove TokenModal mount.

## Verification

1. **Typecheck + tests + build clean.** `npm run typecheck && npm test && npm run build`.
2. **Fresh-boot flow, offline mode.** Clear localStorage, load `/camp`. Should see exactly ONE welcome beat (WelcomeRewardPopup with new 48px glowing chip), LET'S GO, tutorial drops straight into "RECRUIT YOUR FIRST SOLDIER." No "WELCOME, COMMANDER" step, no "YOUR TOKENS" step.
3. **HUD counter.** New beveled chip hero at 32px with cyan glow. DAILY claim pill inside the counter (not a second row). Wallet tooltip has BALANCE / NEXT DAILY / GET MORE — no "RATE: 1 TOKEN = 1 SECOND" line.
4. **Token Store.** Header reads "TOKEN STORE". Featured Arsenal tile shows 5-chip stack. Grid shows Spark=1, Charge=2, Surge=3, War Chest=8. No "SECONDS" or "MIN TRAINING" copy anywhere on the sheet.
5. **Daily Reward popup.** Subtitle reads "YOUR DAILY TOKEN DROP". No "= 150 SECONDS" line. Close X and backdrop dismiss still work.
6. **Welcome popup.** No "= 200 SECONDS" line. Rest of copy + LET'S GO unchanged.
7. **Training SheetSoldier sheet.** Every cost display uses the new chip. START button keeps `/ 30s` (that's duration, not currency rate). LEARN WEAPON preamble unchanged in copy, new chip in the fee pill.
8. **No orphans.** `grep TokenIcon src/` returns zero. `grep TokenModal src/` returns zero. `grep -i 'seconds' src/game/camp/*.tsx` returns only the TrainingSheet / SoldierSheet START-button duration (actual seconds of training).

## Execution notes

- `TokenChip` gets built and polished first in isolation; I'll preview it at multiple sizes before the sweep, so we catch aesthetic issues once instead of nine times.
- Light-swap files (TrainingSheet, SoldierSheet, ArmorySheet, BattlePickerSheet, TutorialGuide) are trivial find-and-replace after the chip lands.
- The TokenCounter redesign is the highest-risk edit because the `--burning` 1 Hz tick from Sprint 2 must keep working — verify in preview with a live training run after the swap.
- Pack values stay unchanged (still Spark 100 / Charge 300 / Surge 600 / Arsenal 1500 / War Chest 5000). Only `chipCount` → `stackCount` shifts to the 1/2/3/5/8 mapping.
- No schema change, no store migration — all edits are cosmetic + structural.

## Execution note (post-approval)

This file also lives at `production-plan.md` at the repo root as the living plan. On approval, I'll start Phase A (TokenChip) and show a preview before sweeping. End-of-sprint commit logs an entry in `plan-two.md` like the prior sprints.
