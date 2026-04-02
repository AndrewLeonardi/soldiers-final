# ECONOMY -- Detailed Reference

This is the full economy design. The GAMEPLAN has the summary.
Reference this when implementing economy features in Phase 2+.

---

## COMPUTE (revenue -- the entire business model)

**What it is:** The premium currency. Used to train soldiers in new weapon
skills via real neuroevolution. This is the ONLY source of revenue.

**Unit economics:**
- 1 basic weapon training = 100 Compute
- 1 advanced weapon training = 200 Compute
- Daily free drip: 100 Compute/day (exactly 1 basic training)
- 7-day login streak bonus: 20/20/30/30/40/40/150 Compute (330 total/week)
- Streak is forgiving -- missing a day doesn't reset, it pauses

**Why compute feels valuable:**
- Training is visible and dramatic (watch the neural net evolve in real-time)
- The skill difference is obvious (untrained = misses wildly, trained = snipes)
- Graduation moment feels like a Matrix download ("SGT Rico learned ROCKET")
- Skills are permanent -- once trained, yours forever
- Mid-game levels are unbeatable without trained soldiers
- Compute represents real AI computation -- not an arbitrary game token

---

## PURCHASE TIERS

Stripe PWA -- we keep ~94% of revenue vs ~70% through app stores.

| Tier           | Compute | Price  | Per-unit | Bonus vs base |
|----------------|---------|--------|----------|---------------|
| Ammo Crate     | 100     | $0.99  | $0.0099  | --            |
| Supply Drop    | 600     | $4.99  | $0.0083  | +17%          |
| War Chest      | 1,400   | $9.99  | $0.0071  | +28%          |
| Arsenal        | 3,200   | $19.99 | $0.0062  | +37%          |
| Command Center | 8,000   | $49.99 | $0.0062  | +37%          |
| Nuclear Option | 18,000  | $99.99 | $0.0056  | +44%          |

**First-purchase bonus:** 2x compute on first buy at ANY tier. Industry-
standard, dramatically increases first conversion.

---

## SECONDARY MONETIZATION

| Offer              | Price  | What                                      | When shown            |
|--------------------|--------|-------------------------------------------|-----------------------|
| Starter Pack       | $2.99  | 300 Compute + 1 rare soldier + 500 Gold   | After tutorial (one-time) |
| Battle Pass        | $4.99  | 30-day: daily 50 bonus Compute + skins + gold multiplier | Always available |
| Comeback Offer     | $1.99  | 250 Compute                               | After 3+ day absence  |
| Post-Defeat Bundle | $2.99  | 400 Compute + heal all soldiers           | After losing a level 3x |

Battle Pass alone drove a 145% revenue increase for Clash of Clans.
It is the single highest-leverage secondary monetization.

---

## GOLD (free, never purchasable)

- Earned ONLY by winning battles (100-500 per level based on stars)
- Spent on: recruiting soldiers (200), healing injuries (50-100),
  unlocking weapon blueprints (300-500)
- Plentiful enough that it never bottlenecks. Compute is always the gate.

---

## THE PRESSURE CURVE

```
Levels 1-10:  Beatable with free rifle soldiers (0 trained skills needed)
Levels 11-20: Require 1-2 trained weapon skills (rocket or grenade)
Levels 21-30: Require 3-4 trained skills across your squad
Levels 31-40: Require advanced training + specific compositions
Levels 41-50: Require mastery -- deep training investment
```

Patient players: ~1 skill/day free = complete campaign in ~45 days.
Paying players: can sprint through in a week.
Both paths are valid. Neither feels punished.

---

## REVENUE BENCHMARKS

- Only ~3.5% of players ever pay. Free economy must work for 96.5%.
- Healthy indie ARPDAU: $0.05-$0.12
- At 5,000 DAU with $0.08 ARPDAU = ~$12K/month
- Top 1% of spenders average $108/month, generate ~29% of revenue
- The ML/AI training angle is a genuine differentiator -- no major
  competitors doing real neural net training as gameplay

---

## IMPLEMENTATION PHASES

**Phase 1:** Compute counter + gold counter on HUD. That's it.
**Phase 2:** Daily free compute claim, gold earn/spend, shop bottom sheet.
**Phase 4:** Stripe integration, Battle Pass, contextual offers, analytics.

---

*Last updated: 2026-04-02*
