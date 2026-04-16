# Economy — F2P progression curve

Companion reference to `production-plan.md` Subsystem 2.7. This document models the token economy as it ships from Production Sprint 2, showing what a free-to-play player earns and spends day-by-day through month two.

**The rule:** 1 token = 1 second of training. Every number below respects it.

---

## Inputs (the constants this model rests on)

All numbers live in code, not here. This table is a snapshot as of the v14 migration — if any of them drift, the spreadsheet below drifts with them.

| Thing | Value | Where |
|---|---|---|
| Starter balance (new profile) | 200 tokens | `campStore.ts` |
| Tutorial completion reward | +100 tokens | `TutorialGuide.tsx` |
| Battle 1 reward (First Contact) | +100 tokens | `campBattles.ts` |
| Battle 2 reward (Swarm Tactics) | +150 tokens | `campBattles.ts` |
| Battle 3 reward (Fortified Base) | +200 tokens | `campBattles.ts` |
| Daily grant | +150 tokens per 24h | `config/store.ts` |
| Training cost | **1 token per second** (15/30/60/180 packages) | `trainingConstants.ts` |
| Weapon manual — grenade | 80 tokens (per-soldier, one-time) | `config/roster.ts` |
| Weapon manual — rocket | 150 tokens | `config/roster.ts` |
| Weapon manual — machine gun | 150 tokens | `config/roster.ts` |
| Weapon manual — tank | 300 tokens | `config/roster.ts` |
| Training slot 2 unlock | 200 tokens | `campStore.ts` |
| Training slot 3 unlock | 500 tokens | `campStore.ts` |
| Soldier recruitment | free | `campStore.ts` |
| Healing (after battle injury) | free, 60s cooldown | `campStore.ts` |

## Pack prices (unchanged in Sprint 2 — tuning deferred to Sprint 3 with real telemetry)

| Pack | Price | Tokens | = Minutes of training |
|---|---|---|---|
| Spark | $0.99 | 100 | 1 min 40 sec |
| Charge | $2.99 | 300 | 5 min |
| Surge | $4.99 | 600 | 10 min |
| Arsenal | $9.99 | 1,500 | 25 min |
| War Chest | $24.99 | 5,000 | 83 min |

---

## F2P player model — the curve

A "motivated daily-login player" who:
- Plays through the tutorial on Day 1.
- Claims the daily grant every day (no skips).
- Fights the 3 battle levels during the first week.
- Trains a typical mix: one Standard session per day, one Marathon per week, experiments with new rare weapons across the first month.

Earn / spend assumptions in parentheses. Running balance is cumulative.

### Week 1 — First taste

| Day | Earn | Spend | Balance | Active wants |
|---|---|---|---|---|
| 1 | +200 starter +100 tutorial +150 daily +100 battle-1 = **+550** | −15 (tutorial train) −30 (Standard rifle run) = **−45** | **505** | Recruit soldier 2 · try grenades |
| 2 | +150 daily | −80 manual (grenade) −30 Standard | **545** | Beat battle 2 |
| 3 | +150 daily +150 battle-2 | −30 Standard · grenade practice | **815** | Unlock slot 2 |
| 4 | +150 daily | −200 slot 2 −30 Standard | **735** | 1st marathon |
| 5 | +150 daily | −180 Marathon rifle | **705** | — |
| 6 | +150 daily +200 battle-3 | −30 Standard | **1,025** | Try rocket |
| 7 | +150 daily | −150 manual (rocket) −60 Extended rocket | **965** | — |

**End of week 1: ~965 tokens. Player has:** slot 2 unlocked, 1 rifle-trained marathon soldier, 1 grenade manual paid, 1 rocket manual paid, 3 battles cleared. Has NOT unlocked slot 3 or fully kitted squad.

### Weeks 2–4 — The first soft wall

| Day range | Net daily average (+150 gained − ~50 spent) | Cumulative balance |
|---|---|---|
| Day 8–14 | +100/day net | ~1,665 |
| Day 15–21 | +100/day net | ~2,365 |
| Day 22–30 | +100/day net (some heavier spending as squad grows) | ~3,000 |

Around **Day 10–14**, the player realizes the fully-kitted loadout — 4 roster soldiers each with 2 rare weapons trained — is ~1,400 tokens of manual + marathon training away. They have ~1,400 tokens. They can do it… but the NEXT step (all 4 soldiers, all 4 rare weapons) is **another ~4,000 tokens** away, which is ~27 more days on dailies alone.

**This is where the $2.99 Charge pack closes the gap.** One pack = +300 tokens = "another soldier fully rare-kitted right now."

### Month two — The endgame ramp

By Day 45, the player has ~6,000 tokens cumulative. The "fully trained 6-soldier squad" ask (see below) is ~7,080. They're 2 weeks away from endgame on dailies.

**This is where the $9.99 Arsenal pack jumps the queue.** +1,500 tokens = "endgame TODAY."

By Day 60, pure-F2P reaches endgame.

---

## Endgame cost — "fully trained squad, every weapon"

Assumes max roster (6 soldiers, unlocked at battle level 8), each trained on all 5 weapons at ~60s average per soldier-per-weapon.

| Line item | Calculation | Cost |
|---|---|---|
| Rare weapon manuals (6 soldiers × 4 rare weapons) | 6 × (80 + 150 + 150 + 300) | **4,080** |
| Training runs (5 weapons × 6 soldiers × 60s avg) | 5 × 6 × 60 | **1,800** |
| Slot 2 + Slot 3 | 200 + 500 | **700** |
| Experimentation / retraining margin | — | **500** |
| **Total** | | **~7,080 tokens** |

F2P daily-login earns ~150/day × 47 days = 7,050 from daily alone. Adding starter + tutorial + battle rewards + future raid rewards gets there in **~45–60 days**.

Paying player reaches endgame in **one purchase** ($9.99 Arsenal = 1,500 tokens) plus a few weeks of dailies, or in **one day** with War Chest ($24.99 = 5,000 tokens).

---

## Where the paywall is (and isn't)

**The paywall IS:**
- "I want the whole squad kitted on every rare weapon *right now*, not in 30 days."
- "I want to try 5 different loadouts for a battle before committing."
- "I want the soldier I just trained to re-train on a different weapon tonight, not next week."

**The paywall IS NOT:**
- "I want to beat level 1."
- "I want to train my first soldier."
- "I want to try grenades at least once."
- "I want a fair chance against the campaign."

The first month of content is fully clearable F2P. The second month is where the endgame loop opens up and the "time vs money" choice becomes real. **The wall is placed on optional breadth, not required progression.**

---

## Revisit triggers

Re-tune the curve (not the 1:1 rule, never the 1:1 rule) when any of these fire:

1. **PostHog funnel drops off before Day 3.** Wall is too early or tutorial is too long — likely reduce starter cost to train, raise starter balance, or shorten tutorial.
2. **< 2% of players who see the store click a pack by Day 14.** Walls aren't biting — either too generous or wrong pack sizing. Likely retune pack values.
3. **> 5% of players who pay pay multiple times in Week 1.** Economy is too tight — the Day-10 wall is feeling punishing, not enticing. Loosen rare-weapon manuals or bump battle rewards.
4. **Avg tokens/player plateaus after Day 30.** Players have everything they want and stopped playing — need a late-game sink (Sprint 4 raids, PvP). Flag for plan-two.md sprint 4.

---

## What this doc is NOT

- Not a marketing curve — players won't see these tables.
- Not a forecast of revenue — conversion rates aren't modeled here.
- Not a commitment to specific pack prices — those tune in Sprint 3 with real data.
- Not a replacement for playtesting — numbers are a starting point, telemetry is the feedback loop.
