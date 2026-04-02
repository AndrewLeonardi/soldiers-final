# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## WHAT THIS IS

A mobile-first physics-comedy strategy game where you command toy soldiers
with real neural networks. Train their brains, place them on the battlefield,
and watch the chaos unfold. Think Angry Birds structure meets Toy Story humor
meets real machine learning.

The battles happen on household surfaces -- kitchen tables, bedroom floors,
sandboxes, workbenches. The soldiers are tiny. The world is huge. That
contrast is the comedy.

---

## CORE LOOP

```
MAP (pick a level)
  --> PREP (choose soldiers + gear from roster)
    --> PLACE (drag soldiers + defenses onto the battlefield)
      --> BATTLE (watch it play out -- physics chaos)
        --> RESULTS (gold earned, injuries, stars)
          --> ROSTER (train soldiers with compute, heal with gold)
            --> MAP (next level)
```

Each level is a pre-designed puzzle. You need the right soldiers with the
right trained skills in the right positions. Brute force doesn't work past
the early levels.

---

## ECONOMY

Two currencies. One makes money. One doesn't.

### COMPUTE (revenue -- the entire business model)

**What it is:** The premium currency. Used to train soldiers in new weapon
skills via real neuroevolution. This is the ONLY source of revenue.

**Unit economics:**
- 1 basic weapon training = 100 Compute
- 1 advanced weapon training = 200 Compute
- Daily free drip: 100 Compute/day (exactly 1 basic training)
- 7-day login streak bonus: 20/20/30/30/40/40/150 Compute (330 total)
- Streak is forgiving -- missing a day doesn't reset, it pauses

**Why compute feels valuable:**
- Training is visible and dramatic (watch the neural net evolve)
- The skill difference is obvious (untrained = misses wildly, trained = snipes)
- Graduation moment feels like a Matrix download ("SGT Rico learned ROCKET")
- Skills are permanent -- once trained, yours forever
- Mid-game levels are unbeatable without trained soldiers
- Compute represents real AI computation -- not an arbitrary token

**Purchase tiers (Stripe PWA -- we keep ~94% vs ~70% through app stores):**

| Tier           | Compute | Price  | Per-unit | Bonus vs base |
|----------------|---------|--------|----------|---------------|
| Ammo Crate     | 100     | $0.99  | $0.0099  | --            |
| Supply Drop    | 600     | $4.99  | $0.0083  | +17%          |
| War Chest      | 1,400   | $9.99  | $0.0071  | +28%          |
| Arsenal        | 3,200   | $19.99 | $0.0062  | +37%          |
| Command Center | 8,000   | $49.99 | $0.0062  | +37%          |
| Nuclear Option | 18,000  | $99.99 | $0.0056  | +44%          |

**First-purchase bonus:** 2x compute on first buy at ANY tier. This is
industry-standard and dramatically increases conversion.

**Beyond compute packs:**

| Offer              | Price  | What                                      | When shown            |
|--------------------|--------|-------------------------------------------|-----------------------|
| Starter Pack       | $2.99  | 300 Compute + 1 rare soldier + 500 Gold   | After completing tutorial (one-time) |
| Battle Pass        | $4.99  | 30-day pass: daily 50 bonus Compute + exclusive soldier skins + gold multiplier | Always available |
| Comeback Offer     | $1.99  | 250 Compute                               | After 3+ day absence  |
| Post-Defeat Bundle | $2.99  | 400 Compute + heal all soldiers           | After losing a level 3x |

Battle Pass alone drove a 145% revenue increase for Clash of Clans. It is
the single highest-leverage secondary monetization.

### GOLD (free, never purchasable)

- Earned ONLY by winning battles (100-500 per level based on stars)
- Spent on: recruiting soldiers (200), healing injuries (50-100),
  unlocking weapon blueprints (300-500)
- Plentiful enough that it never bottlenecks. Compute is always the gate.

### THE PRESSURE LOOP

```
Levels 1-10: Beatable with free rifle soldiers
Levels 11-20: Require 1-2 trained weapon skills (rocket or grenade)
Levels 21-30: Require 3-4 trained skills across your squad
Levels 31-40: Require advanced training + specific compositions
Levels 41-50: Require mastery -- deep training investment
```

Patient players: ~1 skill/day free = all 50 levels in ~45 days.
Paying players: can sprint through the campaign in a week.
Both paths are valid. Neither feels punished.

### REVENUE PROJECTIONS (benchmarks)

- Only ~3.5% of players ever pay. The free economy must work for 96.5%.
- Healthy indie ARPDAU: $0.05-$0.12
- At 5,000 DAU with $0.08 ARPDAU = ~$12K/month
- Top 1% of spenders average $108/month and generate ~29% of revenue
- The ML/AI training angle is a genuine differentiator with no major
  competitors doing this

---

## SCREENS (5 total, zero dashboard energy)

### 1. MAP -- Level Select
- Full-screen themed map with level nodes (toy flags, mini battlefields)
- Stars on completed levels, padlocks on locked ones
- Tap a node to preview enemy lineup + terrain
- HUD: gold + compute counters at top
- Star-gated world progression (need X total stars to unlock next world)

### 2. BATTLE -- Core Gameplay (80% of the game)
- PLACEMENT PHASE: Battlefield fills screen. Soldiers in a bottom tray
  (like a toy box drawer). Drag to place on FIXED PLACEMENT SLOTS
  (sandbox crates, foxholes, elevated positions). "GO" button when ready.
- COMBAT PHASE: Full-screen 3D. Minimal HUD (wave counter, health).
  Physics comedy happens here. Camera follows action.
- VICTORY/DEFEAT: Big splash, stars, gold earned, injuries. "CONTINUE."

### 3. ROSTER -- Bottom Sheet (not a page)
- Slides up over current screen. 3D soldier figures in a row.
- Tap to expand: skills, injuries, weapon, stats
- "TRAIN" button per soldier (shows compute cost)
- Swipe to scroll. Feels like opening a toy box.

### 4. TRAINING -- Camera Zoom
- Camera flies into training arena (not a page route)
- Watch YOUR soldier learn in real-time (neuroevolution viz)
- Progress ring filling up. Milestone callouts.
- "SKILL UNLOCKED" graduation moment. Soldier poses with new weapon.
- Back arrow returns camera to previous context.

### 5. SHOP -- Bottom Sheet (not a page)
- Compute packs: visual tiers (ammo crate to nuclear option)
- Daily free compute claim with countdown
- Battle Pass card
- First-purchase 2x banner
- Starter Pack / contextual offers when applicable

---

## UX RULES

These are non-negotiable.

1. **No dashboards.** If you can screenshot it and mistake it for a web
   app, it's wrong. Every pixel is the game.

2. **No emojis.** Ever. SVG icons or proper 3D assets only.

3. **No nav bars, sidebars, breadcrumbs, card grids, or white
   backgrounds.** These are web patterns, not game patterns.

4. **Full-bleed art on every screen.** Edge to edge. The 3D world is
   always visible, even behind UI panels.

5. **Thumb zone.** Bottom 40% = actions. Top = HUD info. Middle = game
   world. All primary interactions are thumb-reachable.

6. **Transitions are animations, not routes.** Camera moves, panel
   slides, zooms. Never a hard page swap.

7. **Every surface is textured.** Wood, felt, dirt, plastic. No flat
   CSS backgrounds.

8. **Buttons have depth.** Beveled, 3D press states. Never flat.

9. **Mobile-first, desktop-compatible.** Touch is primary input. Mouse/
   keyboard works but isn't the design target.

10. **Simple > clever.** If a 10-year-old can't figure it out in 5
    seconds, it's too complex.

---

## THE HUMOR

Physics comedy is the personality of the game:
- Soldiers ragdoll off table edges (Wilhelm scream)
- Grenades landing short and launching YOUR guys
- Tanks driving off ledges in slow-mo
- Mines sending soldiers pinwheeling skyward
- Walls collapsing and burying troops in rubble
- Rockets overshooting and knocking over giant background objects
  (coffee mugs, pencil cups, books)

The scale contrast (tiny soldiers vs huge household objects) is inherently
funny. Lean into it on every map.

---

## LEVEL DESIGN

### Philosophy: Levels are puzzles, not grinds.

Every level is hand-crafted. Each one is a specific challenge that rewards
the right strategy, not just raw power. Inspired by Angry Birds' puzzle
design and Kingdom Rush's placement strategy.

### The Teach-Test-Twist Pattern

For every new mechanic or enemy type:
1. **TEACH:** Introduce it in isolation. Few enemies, easy to observe.
2. **TEST:** Mix it with existing threats. Player applies what they learned.
3. **TWIST:** Combine it unexpectedly. Previous strategy fails, must adapt.

### Enemy Property Matrix

| Property    | What it does                  | Countered by              |
|-------------|-------------------------------|---------------------------|
| Fast        | Jeeps, rushes past defenses   | Blocking units, slow traps |
| Armored     | Tanks, resists small arms     | Rockets, heavy weapons     |
| Swarm       | Infantry rush, overwhelms     | Splash/area damage         |
| Shielded    | Front cover, directional      | Flanking, area damage      |
| Stealth     | Scouts, bypasses detection    | Recon units/abilities      |
| Flying      | Helicopters (post-launch)     | Anti-air weapons           |

Combination enemies create "aha moments": an armored swarm needs explosive
area damage. A fast stealth unit needs detection AND blocking.

### Fixed Placement Slots

Levels use FIXED placement positions (foxholes, crate tops, elevated spots)
instead of freeform grid placement. This turns each level into a placement
puzzle where every slot matters. Borrowed from Kingdom Rush -- the single
biggest design decision that makes TD levels feel like puzzles.

### Unit Restriction Per Level

Like Angry Birds restricts which birds you get, each level restricts which
unit types are available. Forces players to solve with a specific toolkit
instead of always using their favorite strategy.

### Difficulty Curve (Sawtooth Pattern)

Never linear. Spike on new mechanic, dip for practice, rise for test,
breather before next spike.

| Level Range | Role                      | First-attempt fail rate |
|-------------|---------------------------|------------------------|
| 1-5         | Tutorial, teach core loop | Near zero               |
| 6-10        | First enemy variants      | ~15%                   |
| 11-15       | First real challenge      | ~30%                   |
| 16-20       | Combination challenges    | ~35%, breather at 18   |
| 21-25       | Mid-game boss, new theme  | Boss at 25 with ~50%   |
| 26-35       | New mechanic combos       | ~40%, sawtooth pattern |
| 36-45       | Mastery levels            | ~50%                   |
| 46-50       | Finale, combo enemies     | ~50-60%                |

Target average: 3.2 attempts per level across the campaign.
Never let any level require more than 5-7 attempts for an average player.
75% of players abandon games due to unmanaged difficulty spikes.

### Three-Star System (orthogonal criteria)

| Star | Criteria                                  |
|------|-------------------------------------------|
| 1    | Complete the level (survive)              |
| 2    | Complete with budget remaining (efficiency)|
| 3    | Complete a level-specific bonus objective  |

Bonus objective examples:
- "No soldiers lost"
- "Win without using [unit type]"
- "Complete before wave X timer"
- "Win using only 3 placement slots"

Star-gated progression: need cumulative star count to unlock later worlds.

### Level Config Format (JSON)

```json
{
  "id": "sandbox-03",
  "theme": "sandbox",
  "name": "Bucket Brigade",
  "placement_slots": [
    { "id": "slot-1", "pos": [2, 0, 3], "type": "ground" },
    { "id": "slot-2", "pos": [4, 1.5, 1], "type": "elevated" }
  ],
  "waves": [
    {
      "delay": 0,
      "enemies": [
        { "type": "infantry", "count": 5, "spacing": 1.2, "path": "main" }
      ]
    },
    {
      "delay": 8,
      "enemies": [
        { "type": "infantry", "count": 3, "spacing": 1.0, "path": "main" },
        { "type": "jeep", "count": 1, "spacing": 0, "path": "flank" }
      ]
    }
  ],
  "available_units": ["rifle_soldier", "sandbag"],
  "budget": 500,
  "stars": {
    "one": { "type": "survive" },
    "two": { "type": "budget_remaining", "threshold": 200 },
    "three": { "type": "objective", "desc": "No soldiers lost" }
  },
  "first_time_unlock": null
}
```

50 new levels = 50 JSON files. Zero code changes.

---

## MAP THEMES

Each theme is a household surface with unique "terrain" made from
everyday objects. Visual variety comes from palette swaps, lighting
changes, and prop permutation -- not new geometry.

| World | Theme         | Levels | Surface          | Props                              |
|-------|---------------|--------|------------------|------------------------------------|
| 1     | THE SANDBOX   | 1-10   | Sand             | Buckets, shovels, pebbles, sticks  |
| 2     | KITCHEN TABLE | 11-20  | Wood grain       | Salt shakers, napkins, spoons, mugs|
| 3     | BEDROOM FLOOR | 21-30  | Carpet/hardwood  | Books, toy blocks, shoes, rulers   |
| 4     | WORKBENCH     | 31-40  | Plywood          | Tools, paint cans, nails, sandpaper|
| 5     | BACKYARD      | 41-50  | Dirt/grass       | Rocks, garden hose, flower pots    |

### Low-cost visual variety per world:
- Color palette swap (warm sand vs cool workshop vs green backyard)
- Time-of-day lighting (morning, noon, dusk, night)
- Weather overlays (dust, rain, fog) as screen-space effects
- 4-5 decorative props per world, placed in different arrangements
- Camera angle variation (same terrain, different perspective)

Asset budget for 50 levels: 5 ground textures, 5 background sets,
~25 decorative prop models total. Tiny art investment.

---

## TECH STACK

| Layer     | Choice                    | Why                                     |
|-----------|---------------------------|-----------------------------------------|
| Language  | TypeScript                | Entire R3F/Rapier ecosystem is TS. Zero runtime cost. Refactoring safety for production. |
| Framework | React 19 + Vite           | Fast builds, modern React               |
| 3D        | Three.js + R3F            | Proven, huge ecosystem                  |
| Physics   | @react-three/rapier       | Real rigid body physics = comedy        |
| State     | Zustand                   | Lightweight, proven in prior versions   |
| Backend   | Supabase                  | Auth, DB, storage, realtime for PVP     |
| Styling   | CSS modules               | Scoped, no runtime cost                 |
| Audio     | Howler.js                 | 7KB, spatial audio, sprites, mobile-ready|
| Payments  | Stripe (PWA)              | Keep ~94% revenue vs ~70% app stores    |
| Analytics | Defer to Phase 4          |                                         |

---

## AUDIO

Sound is built into the engine from Phase 1, not bolted on later.
Huge impact on game feel for minimal investment.

### Library: Howler.js
- 7KB gzipped, zero dependencies, MIT license
- Audio sprites (pack all SFX into one file, named regions)
- Spatial/3D audio (explosions louder when camera is near)
- Handles iOS/Android autoplay restrictions
- Concurrent playback (critical for battle scenes)

### SFX Sources (all CC0 or royalty-free, no attribution required):

| Category       | Source              | Notes                                  |
|----------------|---------------------|----------------------------------------|
| Weapons        | Sonniss GDC bundles | Professional recordings, massive library|
| Impacts        | Kenney Impact Sounds| 130 CC0 impact sounds                  |
| UI             | Kenney UI Audio     | 50 CC0 purpose-built game UI sounds    |
| Comedy physics | Mixkit cartoon      | Boings, splats, slide whistles         |
| Wilhelm scream | Freesound (USC CC0) | The classic, legally safe CC0 version  |
| Explosions     | Sonniss + Kenney    | Layer both for variety                 |
| Ambient        | Sonniss GDC         | Wind, distant sounds, atmosphere       |
| Music          | Tallbeard Studios   | 200+ CC0 seamless loops                |

### Licensing rule: CC0 or Sonniss GDC license only. No CC-BY (attribution
maintenance burden). No CC-BY-NC (kills commercial use). Track every
sound file's source in a LICENSES.md from day one.

---

## ARCHITECTURE

```
src/
  engine/         -- Pure game logic. Zero rendering imports.
    ml/           -- Neural net, genetic algorithm, training scenarios
    sim/          -- Battle simulation, damage calc, win conditions
    economy/      -- Gold, compute, daily drip, purchase validation
    levels/       -- Level loader, star calc, progression gating

  three/          -- All 3D rendering. Models, materials, effects.
    models/       -- Procedural soldier, vehicle, building, terrain factories
    effects/      -- Destruction, particles, muzzle flash, explosions
    camera/       -- Camera controller (follow, zoom, pan, transitions)
    physics/      -- Rapier body setup, collision handlers

  scenes/         -- Top-level game screens (map, battle, training)
  ui/             -- Game UI components (HUD, bottom sheets, buttons)
  stores/         -- Zustand (game state, roster, economy, settings)
  config/         -- JSON level defs, weapon stats, economy constants
  api/            -- Supabase client, auth, sync, analytics hooks
  audio/          -- Howler.js setup, sprite definitions, sound manager
  assets/         -- SVG icons, fonts, audio sprite files
```

### KEY ARCHITECTURE DECISIONS

**Levels are data, not code.** Each level is a JSON config defining enemy
types, positions, terrain objects, and win conditions. 50 new levels =
50 new JSON files, zero code changes.

**Training scenarios are pluggable.** Each weapon type has a scenario
module. New weapon = new scenario file + config entry. The ML pipeline
(neural net + genetic algorithm) is shared.

**Engine has zero rendering deps.** Battle simulation runs headless.
This means: deterministic replays, server-side validation (for PVP),
and testability without a browser.

**3D models are procedural.** No GLTF/GLB files. All geometry built
from Three.js primitives. Keeps bundle tiny, loads instant, infinitely
tweakable.

**Audio from day one.** Howler.js sprite system integrated in Phase 1.
Every physics collision, every shot fired, every UI tap has sound.

---

## MVP DELIVERABLES (phased)

### PHASE 1 -- The Vertical Slice
One complete level, playable end to end with sound.
- [ ] Project scaffolding (Vite + React 19 + R3F + Rapier + Zustand + TS)
- [ ] Howler.js audio system with initial SFX sprites
- [ ] One soldier model with idle/walk/fire/death animations + ragdoll
- [ ] One map theme (Sandbox) with terrain objects + placement slots
- [ ] Placement phase (drag soldiers from tray to fixed slots)
- [ ] Battle phase (soldiers fight, Rapier physics, projectiles)
- [ ] Physics comedy (ragdolls, falling off edges, destruction + sounds)
- [ ] Victory/defeat screen with gold reward + stars
- [ ] Basic HUD (gold, compute, wave counter)
- **Goal: "Is this fun?" If no, iterate before building more.**

### PHASE 2 -- The Training Loop
- [ ] Roster system (bottom sheet, 3D soldier figures, swipe)
- [ ] Training arena with neuroevolution (port from solder-four)
- [ ] Weapon skill graduation flow
- [ ] Compute currency (100/day free drip, 7-day streak bonus)
- [ ] Gold spending (recruit 200g, heal 50-100g, blueprints 300-500g)
- [ ] 3-5 Sandbox levels requiring trained skills to beat
- [ ] Shop bottom sheet (compute packs, daily claim, first-purchase 2x)
- **Goal: "Does the compute economy create desire?" If no, rebalance.**

### PHASE 3 -- The Campaign
- [ ] Map screen with level nodes + star gating
- [ ] 5 map themes, 10 levels each (50 levels total)
- [ ] Enemy variety (infantry, jeep, tank, armored, stealth, swarm)
- [ ] 4+ weapon types trainable (rifle, rocket, grenade, MG)
- [ ] Difficulty curve tuning (sawtooth, 3.2 avg attempts)
- [ ] Three-star system (survive / efficiency / bonus objective)
- [ ] Unit restriction per level
- **Goal: "Do players come back daily?" If no, adjust economy + content.**

### PHASE 4 -- Production Polish
- [ ] Supabase auth + cloud save
- [ ] Stripe compute purchases (PWA, first-purchase 2x, starter pack)
- [ ] Battle Pass ($4.99/mo, daily bonus compute + skins + gold multiplier)
- [ ] Analytics pipeline (level completion, compute spend, retention)
- [ ] Full audio pass (all SFX, music loops, spatial audio)
- [ ] Performance optimization (60fps mobile, <3s load, <2MB bundle)
- [ ] Onboarding (first 3 levels teach everything, no tutorial text)
- [ ] Contextual offers (comeback, post-defeat bundles)
- **Goal: Soft launch ready.**

### PHASE 5 -- Growth (post-launch)
- [ ] PVP async raids
- [ ] New map themes + levels
- [ ] New weapon types + soldier classes (bomber, sniper, medic)
- [ ] Flying enemies (helicopters) + anti-air weapons
- [ ] Social features (friends, replays)
- [ ] Seasonal content + limited-time events

---

## WHAT WE ARE NOT BUILDING

- Base building (too confusing, proven across 3 versions)
- Real-time PVP in MVP (async only, later)
- Complex tutorial systems (the game teaches through play)
- Account settings pages
- Any screen that looks like a web app
- Native app wrappers (PWA first, native if metrics justify)
- Freeform placement grids (fixed slots only -- makes levels puzzles)

---

## PERFORMANCE TARGETS

- 60fps on mid-tier mobile (iPhone 12 / Pixel 6 class)
- <3 second initial load
- <100ms input latency on placement/tap
- Max 50 physics bodies per battle scene
- Max 30 soldiers on screen simultaneously
- Bundle size <2MB (no GLTF, no heavy deps)

---

*Last updated: 2026-04-02*
