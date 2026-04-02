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

### COMPUTE (revenue)
- The ONLY purchasable currency
- Used to train soldiers in new weapon skills via real neuroevolution
- Daily free drip: enough to train ~1 skill per day
- Training is visible, dramatic, and permanent once complete
- Price tiers: TBD (research F2P benchmarks)
- This is the entire business model. If compute doesn't feel
  valuable, we're dead.

### GOLD (free)
- Earned ONLY by winning battles. Cannot be purchased. Ever.
- Spent on: recruiting soldiers, healing injuries, unlocking weapon blueprints
- Plentiful enough that it never feels like the bottleneck
- Compute is always the bottleneck

### THE PRESSURE LOOP
Early levels: beatable with free rifle soldiers.
Mid levels: introduce enemies requiring rocket/grenade/MG trained soldiers.
Player hits wall --> needs trained soldiers --> needs compute --> daily
free drip is slow --> buy compute or wait.

Patient players progress daily. Impatient players pay. Both are happy.

---

## SCREENS (5 total, zero dashboard energy)

### 1. MAP -- Level Select
- Full-screen themed map with level nodes (toy flags, mini battlefields)
- Stars on completed levels, padlocks on locked ones
- Tap a node to preview enemy lineup + terrain
- HUD: gold + compute counters at top

### 2. BATTLE -- Core Gameplay (80% of the game)
- PLACEMENT PHASE: Battlefield fills screen. Soldiers in a bottom tray
  (like a toy box drawer). Drag to place. Defenses in second tray tab.
  "GO" button when ready.
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
- Compute packs: 3-4 visual tiers (small/med/large crate)
- Daily free compute claim with countdown
- Gold is NOT here. Simple. Done.

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

## MAP THEMES

Each theme is a household surface with unique "terrain" made from
everyday objects:

1. **THE SANDBOX** -- Tutorial levels. Sand terrain, bucket forts, shovel
   ramps, pebble cover. Forgiving, teaches mechanics.
2. **KITCHEN TABLE** -- Salt shaker towers, napkin holder walls, spoon
   bridges, cereal box fortresses. First real challenge.
3. **BEDROOM FLOOR** -- Book forts, toy block walls, shoe box bunkers,
   ruler bridges, under-the-bed darkness zones. The classic.
4. **WORKBENCH** -- Tool walls, paint can towers, sandpaper rough terrain,
   nail obstacles, wood block structures. Industrial.
5. **BACKYARD** -- Dirt, grass tufts, rock walls, garden hose rivers, flower
   pot towers. Outdoor, organic terrain.

More themes added post-launch. Each theme = 8-12 levels = 40-60 total MVP.

---

## TECH STACK

| Layer          | Choice                  | Why                                    |
|----------------|-------------------------|----------------------------------------|
| Framework      | React 19 + Vite         | Fast builds, modern React              |
| 3D             | Three.js + R3F          | Proven, huge ecosystem                 |
| Physics        | @react-three/rapier     | Real rigid body physics = comedy        |
| State          | Zustand                 | Lightweight, proven in prior versions  |
| Backend        | Supabase                | Auth, DB, storage, realtime for PVP    |
| Styling        | CSS modules             | Scoped, no runtime cost                |
| Analytics      | TBD                     | Need event tracking from day 1         |
| Payments       | Stripe (PWA)            | Bypass app store 30% cut               |

No TypeScript in v1. Ship fast, add types when the architecture stabilizes.
(Open to debate on this one.)

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
  assets/         -- SVG icons, fonts, audio files
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

---

## MVP DELIVERABLES (phased)

### PHASE 1 -- The Vertical Slice
One complete level, playable end to end.
- [ ] Project scaffolding (Vite + React + R3F + Rapier + Zustand)
- [ ] One soldier model with idle/walk/fire/death animations
- [ ] One map theme (Sandbox) with terrain objects
- [ ] Placement phase (drag soldiers from tray to field)
- [ ] Battle phase (soldiers fight, physics active, projectiles)
- [ ] Physics comedy (ragdolls, falling off edges, destruction)
- [ ] Victory/defeat screen with gold reward
- [ ] Basic HUD (gold, compute, wave counter)
- **Goal: "Is this fun?" If no, iterate before building more.**

### PHASE 2 -- The Training Loop
- [ ] Roster system (recruit, view, manage soldiers)
- [ ] Training arena with neuroevolution (port from solder-four)
- [ ] Weapon skill graduation flow
- [ ] Compute currency (daily free drip, spend on training)
- [ ] Gold spending (recruit, heal, weapon blueprints)
- [ ] 3-5 Sandbox levels that require trained skills to beat
- **Goal: "Does the compute economy create desire?" If no, rebalance.**

### PHASE 3 -- The Campaign
- [ ] Map screen with level nodes
- [ ] 5 map themes, 8-12 levels each (40-60 levels)
- [ ] Level progression gating (stars unlock next tier)
- [ ] Enemy variety (infantry, jeep, tank) per theme
- [ ] Multiple weapon types trainable (rifle, rocket, grenade, MG)
- [ ] Difficulty curve tuning
- **Goal: "Do players come back daily?" If no, adjust economy + content.**

### PHASE 4 -- Production Polish
- [ ] Supabase auth + cloud save
- [ ] Stripe compute purchases (PWA)
- [ ] Analytics pipeline (level completion, compute spend, retention)
- [ ] Audio (SFX + music)
- [ ] Performance optimization (mobile target: 60fps, mid-tier device)
- [ ] Onboarding (first 3 levels teach everything, no tutorial text)
- **Goal: Soft launch ready.**

### PHASE 5 -- Growth (post-launch)
- [ ] PVP async raids
- [ ] New map themes + levels
- [ ] New weapon types + soldier classes
- [ ] Social features (friends, replays)
- [ ] Seasonal content

---

## WHAT WE ARE NOT BUILDING

- Base building (too confusing, proven across 3 versions)
- Real-time PVP in MVP (async only, later)
- Complex tutorial systems (the game teaches through play)
- Account settings pages
- Any screen that looks like a web app
- TypeScript (for now -- speed over safety in prototype phase)
- Native app wrappers (PWA first, native if metrics justify)

---

## PERFORMANCE TARGETS

- 60fps on mid-tier mobile (iPhone 12 / Pixel 6 class)
- <3 second initial load
- <100ms input latency on placement/tap
- Max 50 physics bodies per battle scene
- Max 30 soldiers on screen simultaneously
- Bundle size <2MB (no GLTF, no heavy deps)

---

## OPEN QUESTIONS

1. **Economy numbers:** What's the right daily free compute drip?
   How many compute units per weapon training? What Stripe price
   points? Need F2P benchmark research.

2. **Level design:** How do we make 50+ levels feel distinct with
   minimal art investment? What enemy compositions create interesting
   puzzles?

3. **TypeScript:** Skip for speed, or adopt from day 1 for a
   production codebase? Trade-off is real.

4. **Analytics provider:** What gives us retention curves, funnel
   analysis, and compute purchase tracking with minimal setup?

5. **Audio:** Build a sound system early (cheap to add, huge impact
   on game feel) or defer to Phase 4?

---

*Last updated: 2026-04-02*
