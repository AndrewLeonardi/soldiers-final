# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## CURRENT STATUS (as of 2026-04-06)

### TIER 1 -- COMPLETE
All game-feel and campaign foundation items are done.

- [x] Everything from build steps 1-20 (scaffolding through audio)
- [x] **Roster + game persistence (localStorage)** -- Zustand persist
      middleware on rosterStore and gameStore. Version-migrated (v1→v2→v3).
- [x] **Wall destruction** -- Explosions damage wall blocks with cascade.
      Bullets absorbed by walls (walls = cover).
- [x] **Visual effects** -- ExplosionEffect (fireball + debris), ScreenShake,
      enhanced ProjectileMesh (glow trails, exhaust), Bloom, muzzle flash
- [x] **6-level campaign** -- multi-wave spawning from level JSON, star
      criteria, enemy weapon scaling (rocket/grenade/MG), campaign persist
- [x] **Level Select** -- Angry Birds terrain map with animations, 6 nodes
- [x] **Victory juice** -- slow-mo, confetti, camera sweep

### TIER 2 -- COMPLETE
- [x] **Compute Store** -- 5 compute pack tiers (Spark $0.99 to War Chest
      $24.99), featured "Arsenal" pack with BEST VALUE badge, beveled
      military-themed card UI, BUY buttons (placeholder for real IAP)
- [x] **Daily free compute drip** -- 50 compute/day, 3-day accumulation
      cap (150 max), pulsing CLAIM button, countdown timer, green
      notification dot on barracks STORE button when claimable
- [x] **Economy state** -- addCompute(), claimDailyCompute() with 24h
      cooldown, lastDailyClaimTime persisted, persist v3 migration

### CLEANUP SPRINT -- COMPLETE
- [x] **Tutorial two-soldier bug fixed** -- roster reset synchronously
      before level load; tutorial completion keeps recruited soldiers
      (no longer overwrites with STARTER_ROSTER)
- [x] **Tutorial explains Intel objective** -- new "Defend the Intelligence!"
      step with modal and briefcase icon before placement phase
- [x] **Structure rotation UI** -- rotate button appears when defense
      selected in placement tray, calls rotatePlacement()
- [x] **Battle performance optimized** -- 4 reusable temp Vector3s replace
      ~20+ allocations per frame in hot loops (enemy AI, player AI,
      collision detection, explosions)
- [x] **Barracks soldier names** -- floating Html labels above each soldier
      showing name + weapon type, soldiers scaled to 0.85, camera pulled back
- [x] **Recruit name selection** -- modal with 3 randomized name options,
      expanded name pool to 20 soldiers, Cancel option
- [x] **Dead code removed** -- BattleManager.ts, BattleLoop.tsx,
      MissionBriefing.tsx, sandbox-01.json, nextRound(), PLACEMENT_COSTS
- [x] **Window globals dev-only** -- gated behind import.meta.env.DEV

### NEEDS WORK (known issues)
- [ ] **Enemy AI movement too simple** -- enemies march in a straight line
      to Intel. No flanking, cover-seeking, or tactical grouping.
      (Enemies DO fire rockets/grenades/MG, but movement is basic.)
- [ ] **No real payment integration** -- store BUY buttons are placeholders
- [ ] **Soldier personality** -- no name plates in battle, no veteran
      bonuses, no stat growth from surviving battles

---

## WHAT THIS IS

A mobile-first physics-comedy strategy game. Command toy soldiers with
real neural networks. Train their brains, place them on the battlefield,
watch the chaos unfold.

Angry Birds structure. Toy Story humor. Real machine learning.

Battles happen on household surfaces -- kitchen tables, bedroom floors,
sandboxes. The soldiers are tiny. The world is huge. That contrast is
the comedy.

---

## CORE LOOP

```
LEVEL SELECT (campaign map -- choose your mission)
  --> BARRACKS (hub -- configure your army)
    --> tap soldier --> SOLDIER DETAIL (equip weapons, train skills)
    --> DEPLOY --> PLACEMENT (place soldiers + defenses on battlefield)
      --> FIGHT! --> BATTLE (watch it play out -- physics chaos)
        --> SLOW-MO (last kill) --> CONFETTI --> RESULTS (stars, stats)
          --> NEXT LEVEL / LEVEL SELECT / TRY AGAIN
```

The LEVEL SELECT is the campaign hub. Angry Birds-style node map with
6 levels, winding dirt path, military terrain decorations. Stars unlock
the next level.

The BARRACKS shows your army as real 3D toy soldiers. Tap to configure.

TRAINING is launched from the soldier detail screen when tapping a
locked weapon. It's where compute (the monetization currency) gets
spent. Training is the entire business model.

BATTLE uses multi-wave spawning from level JSON configs. Enemies scale
with campaign progression -- later levels have enemy rockets, grenades,
MG soldiers, jeeps, and tanks. Each level defines its own wave timing,
enemy compositions, budget, and star criteria.

---

## SCREENS

### 1. BARRACKS (Hub) -- BUILT
- 3D flexSoldier models standing on sandy surface with wood frame
- Tap a soldier to open detail view (hover effect: scale up + cursor)
- Recruit [+] button (costs gold)
- DEPLOY button transitions to placement
- Adaptive camera: pulls back as army grows (z=4.5 base + 0.25/soldier)
- Resource pills: gold + compute displayed in chunky bordered pills

### 2. SOLDIER DETAIL -- BUILT
- 3D soldier preview (rotatable, drag-to-spin, idle animation)
- 5 weapon cards: rifle, rocket, grenade, machine gun, tank
- States: equipped (green), unlocked (check), locked (dimmed + lock + cost)
- Tapping locked weapon shows TRAINING REQUIRED overlay with compute cost
- "BEGIN TRAINING" button launches real ML training arena
- Back button returns to barracks

### 3. TRAINING ARENA -- BUILT
- 3D arena: soldier/tank + red soda-can targets on sandy ground
- Weapon-specific rendering (rocket, grenade, MG, tank scenarios)
- Impact explosions on hits
- TrainingHUD: GEN counter, fitness %, sparkline, speed (1x-50x),
  progress bar, pause/stop buttons
- NeuralNetViz: SVG showing 6->12->4 nodes with weighted connections
- GraduationBanner: "SKILL LEARNED!" with stars + "Save & Continue"

### 4. PLACEMENT -- BUILT
- Deploy goes straight here (no mission briefing)
- Military green placement cards at bottom (soldier-test style)
- Each card shows soldier name, weapon type, gold cost
- Cards go dim with "PLACED" badge after placement
- Ghost preview (green/red transparent shape) follows cursor
- Green zone highlights valid placement area (x <= 2)
- "PLACE TROOPS" becomes "FIGHT!" when soldiers are placed
- Defense cards: wall ($50), sandbags ($75), tower ($200)
- Rotate button appears when defense selected (90-degree increments)

### 5. BATTLE -- BUILT
- Mutable-ref physics pattern (from soldier-test)
- Multi-wave spawning from level JSON (delay-based timing)
- Enemy soldiers march toward Intel, fire weapon-specific projectiles
- Enemy weapon variants: rifle, rocketLauncher, grenade, machineGun
- Player soldiers auto-target and fire (trained NN or comedy chaos)
- Explosion system with blast radius + area knockback + wall destruction
- Death knockback + ragdoll (velocity, spin, ground bounce)
- Win: all waves spawned + all enemies dead. Lose: enemy reaches Intel
- Slow-mo on last enemy death (1.5s at 0.2x time scale)
- Bloom post-processing on explosions and muzzle flashes
- Screen shake on every explosion
- Explosion VFX: dual-sphere fireball + light flash + debris particles
- Enhanced projectiles: bullet glow trails, rocket exhaust, grenade pulse

### 6. RESULTS -- BUILT
- DEFEAT/VICTORY banner with level name
- Star criteria breakdown from level config (checked/unchecked)
- Stats: enemies eliminated, soldiers surviving
- Victory: confetti burst + camera sweep (fast orbit + zoom)
- NEXT LEVEL / LEVEL SELECT buttons (victory)
- TRY AGAIN / LEVEL SELECT buttons (defeat)
- Training tip on defeat

### 7. TUTORIAL -- BUILT
- 13-step guided onboarding with spotlight system
- Walks through: recruit → train → deploy → explain Intel → place → fight → win
- "Defend the Intelligence!" modal explains objective before placement
- localStorage persistence (plays once)
- Auto-loads level-01 for tutorial battle
- Completes with recruited soldiers intact (no roster overwrite)

### 8. LEVEL SELECT -- BUILT
- Angry Birds-style node map with themed military terrain
- 6 levels connected by winding dirt path
- Beveled 3D node buttons, lock/unlock states, gold stars
- Rich animations: staggered entrance, idle bob, pulsing glow, sparkles
- Terrain decorations: flag, barbed wire, sandbags, ammo crates, compass

### 9. COMPUTE STORE -- BUILT
- 5 compute pack tiers: Spark (100/$0.99), Charge (300/$2.99),
  Surge (600/$4.99), Arsenal (1500/$9.99), War Chest (5000/$24.99)
- Featured Arsenal pack with gold border + "BEST VALUE" ribbon
- 2x2 grid of regular packs with beveled military cards
- Daily free compute: 50/day, 3-day accumulation, CLAIM button
- Countdown timer when cooling down
- Accessed via STORE button in barracks (green dot notification)
- BUY buttons are placeholders (real IAP integration later)

---

## WHAT'S NEXT (priority order)

### TIER 1: Game feel + Campaign foundation -- COMPLETE
1. ~~Audio, campaign, VFX, persistence -- all done~~

### TIER 2: Economy + Store -- COMPLETE
2. ~~Compute store (5 pack tiers, featured card, BUY placeholders)~~
3. ~~Daily free compute drip (50/day, 3-day accumulation, CLAIM button)~~
4. ~~Economy state (addCompute, claimDailyCompute, persist v3)~~

### TIER 3: AI + Polish
5. **Enemy AI movement improvements** -- Enemies fire weapon variants
   now but still march in a straight line. Needs:
   - Flanking: enemies approach from multiple angles
   - Cover-seeking: enemies hide behind obstacles
   - Priority targeting: focus on towers/walls first

6. **Soldier personality in battle** -- Name plates above soldiers
   during combat, stat growth, veteran bonuses from surviving.

7. **More campaign content** -- Expand beyond 6 levels. New themes
   (kitchen table, bedroom floor). Boss levels with special mechanics.

8. **Real payment integration** -- Stripe or mobile IAP for compute
   packs. Replace placeholder BUY buttons with real purchase flow.

9. **Additional polish** -- Vignette edges, dust clouds on movement,
   impact sparks on bullet hits, damage numbers.

---

## TRAINING (the business model)

Training is where compute gets spent. It must be visually spectacular.

**Architecture (BUILT):**
- NERO-inspired hybrid: scripted physics (ballistic arcs, auto-targeting,
  gravity) + neural net learns corrections (aim, elevation, fire timing)
- NeuralNet: 6 inputs -> 12 hidden (tanh) -> 4 outputs (tanh) = 136 weights
- GeneticAlgorithm: pop=30, 6 elites, tournament selection (k=3),
  uniform crossover, Gaussian mutation with adaptive decay (0.98^gen)
- Weapon scenarios:
  - Rocket: scripted ballistics + NN aim/elevation corrections + fire trigger
  - Grenade: scripted arc + NN throw timing/angle + splash optimization
  - Machine Gun: scripted aim + NN sweep/burst timing
  - Tank: scripted turret tracking + NN steering/throttle/fire decisions
- Fitness functions per weapon: hits (200pts), near-misses, accuracy bonus
- Training store (Zustand): generation, population, fitness, speed, graduation
- Graduation: bestFitness >= threshold AND generation >= 5
- Brain weights persist on SoldierProfile as number[] (136 values)

---

## BATTLE (the gameplay)

**Architecture (BUILT -- soldier-test pattern):**
- Mutable refs for per-frame updates (NOT Zustand store per frame)
- BattleScene.tsx contains all battle logic in a single useFrame loop
- Multi-wave spawning from level JSON configs (delay-based timing)
- Enemy AI: march toward Intel, fire weapon-specific projectiles
- Enemy weapon variants: rifle, rocketLauncher, grenade, machineGun
  - getEnemyStats() merges base type stats with weapon overrides
  - Aim randomness per weapon type for fairness
- Player AI: auto-target nearest enemy, fire when in range
- Trained soldiers: NN provides aim/elevation/fire corrections
- Untrained soldiers: comically bad random aim (+-23 degrees)
- Projectile physics: bullets (linear), rockets (arced), grenades (bounced)
- Explosion system: blast radius + area damage + knockback + wall destruction
- Collision: radius-based hit detection, projectile-wall collision
- Ragdoll: velocity knockback, gravity, ground bounce, spin decay
- Death: animation plays once and holds, body settles on ground
- Intel objective: briefcase at [-7,0,0], enemies lose if they reach it
- Walls: destructible brick grid, explosions eject blocks with cascade
- Victory slow-mo: 1.5s at 0.2x time scale on last enemy death
- Visual effects: ExplosionEffect (fireball + debris), ConfettiEffect
  (victory celebration), ScreenShake, Bloom post-processing,
  enhanced ProjectileMesh (glow trails, exhaust), muzzle flash lights

---

## ECONOMY

Two currencies. One makes money. One doesn't.

**COMPUTE (revenue):** The ONLY purchasable currency. Used to train
soldiers in new weapon skills via real neuroevolution. Daily free drip
of 100 Compute (~1 basic training/day).

**GOLD (free):** Earned by winning battles. Spent on recruiting soldiers,
healing injuries, weapon blueprints. Cannot be purchased. Ever.

**Weapon training costs:**
- Rocket Launcher: 100 Compute
- Grenade: 100 Compute
- Machine Gun: 200 Compute
- Tank: 300 Compute
- Rifle: Free (default, no training needed)

---

## UX RULES (non-negotiable)

1. **No dashboards.** If you can screenshot it and mistake it for a
   web app, it's wrong.
2. **No emojis.** Ever. SVG icons or 3D assets only.
3. **No web patterns.** No nav bars, sidebars, breadcrumbs, card grids,
   white backgrounds, system fonts.
4. **Full-bleed art.** Edge to edge. 3D world always visible.
5. **Thumb zone.** Bottom 40% = actions. Top = HUD. Middle = game world.
6. **Transitions are animations.** Never a hard page swap.
7. **Every surface is textured.** Wood, felt, dirt, plastic. No flat CSS.
8. **Buttons have depth.** Beveled, 3D press states, spring animations.
9. **Mobile-first, desktop-compatible.**
10. **Simple > clever.** A 10-year-old figures it out in 5 seconds.

---

## ARCHITECTURE

```
src/
  audio/          -- Web Audio synthesis engine (zero external files)
                     context, voicePool, synthEngine, sfx

  engine/         -- Pure game logic. Zero rendering imports.
    ml/           -- NeuralNet, GeneticAlgorithm, simulationRunner
      scenarios/  -- rocketScenario, grenadeScenario, machineGunScenario, tankScenario

  three/          -- All 3D rendering.
    models/       -- flexSoldier, SoldierUnit, SoldierPreview, BarracksScene,
                     weaponMeshes, jeep, plasticWall, materials, sandboxProps,
                     Intel, GhostPreview, ProjectileMesh, Defenses
    camera/       -- CameraRig (orbit controls + victory sweep)
    effects/      -- ExplosionEffect, ConfettiEffect, ScreenShake
    physics/      -- SlotMarker

  scenes/         -- Game.tsx (scene router + bloom), BattleScene.tsx
                     (battle logic + rendering + slow-mo), TrainingScene.tsx
  ui/             -- BarracksScreen, SoldierDetail, PlacementTray, HUD,
                     TrainingHUD, GraduationBanner, NeuralNetViz,
                     ResultScreen, LevelSelect, Store, TutorialOverlay,
                     ToyIcons
  stores/         -- gameStore (+ campaign + economy), rosterStore,
                     trainingStore, tutorialStore (all with persist)
  config/         -- types, units, roster, store (compute pack defs)
    levels/       -- index.ts (registry), level-01 through level-06 JSON
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, game-ui.css, levelselect.css,
                     store.css, training.css, tutorial.css, homepage.css,
                     global.css
```

---

## BUILD SEQUENCE

### DONE (1-30)
1. ~~Project scaffolding~~
2. ~~Homepage~~
3. ~~3D models + materials~~
4. ~~Battlefield scene~~
5. ~~Barracks with 3D soldiers~~
6. ~~Soldier detail with weapon system~~
7. ~~Roster-connected placement~~
8. ~~Visual overhaul (mobile game UI)~~
9. ~~ML Training System (NeuralNet + GA + training arena + graduation)~~
10. ~~Tank weapon type + tank training scenario~~
11. ~~Neural network visualization~~
12. ~~Battle system (mutable-ref physics, enemy AI, projectiles)~~
13. ~~Intel objective (briefcase)~~
14. ~~Ghost preview + placement UX~~
15. ~~Result screen (defeat/victory)~~
16. ~~Simplified battlefield (removed clutter)~~
17. ~~Removed mission briefing (straight to placement)~~
18. ~~Defense objects (walls, sandbags, towers)~~
19. ~~Tutorial / Onboarding (12-step guided flow with spotlight system)~~
20. ~~Audio system (Web Audio API, 17 synthesized sounds)~~
21. ~~Roster + game persistence (Zustand persist middleware, localStorage)~~
22. ~~Wall destruction wiring (explosion + projectile damage to walls)~~
23. ~~Visual effects overhaul (explosions, bloom, screen shake, muzzle flash,
    enhanced projectiles with glow trails + exhaust)~~
24. ~~Campaign: 6 levels with multi-wave spawning from level JSON~~
25. ~~Enemy weapon scaling (rocket, grenade, MG enemy variants)~~
26. ~~Level Select screen (Angry Birds terrain map with animations)~~
27. ~~Campaign persistence (stars, completed levels, progress)~~
28. ~~Result screen campaign flow (NEXT LEVEL / LEVEL SELECT / star criteria)~~
29. ~~Victory slow-mo (1.5s at 0.2x on last enemy death)~~
30. ~~Victory confetti + camera sweep (45-60 particles, orbit ramp + zoom)~~

### DONE (31-37)
31. ~~Compute Store (5 pack tiers, featured card, military-themed UI)~~
32. ~~Daily free compute drip (50/day, 3-day cap, CLAIM + countdown)~~
33. ~~Tutorial bug fix (two-soldier race condition, Intel explanation step)~~
34. ~~Structure rotation UI (rotate button in placement tray)~~
35. ~~Battle performance optimization (reusable temp vectors, ~20 fewer
    allocations per frame in hot loops)~~
36. ~~Barracks polish (floating name labels, soldier scale 0.85, camera pullback)~~
37. ~~Recruit name selection (3-choice modal, 20-name pool, cancel option)~~

### NEXT (38-42)
38. Enemy AI movement (flanking, cover-seeking, priority targeting)
39. Soldier personality in battle (name plates, stat growth, veterans)
40. More campaign content (expand to 10+ levels, new themes)
41. Real payment integration (Stripe / mobile IAP)
42. Additional polish (vignette, dust clouds, damage numbers)

---

## TECH STACK

| Layer     | Choice                    | Why                                     |
|-----------|---------------------------|-----------------------------------------|
| Language  | TypeScript 6              | Full ecosystem typing                   |
| Framework | React 19 + Vite 8         | Fast builds, modern React               |
| 3D        | Three.js + R3F            | Proven, massive ecosystem               |
| Physics   | Custom (mutable refs)     | soldier-test pattern, predictable comedy |
| State     | Zustand                   | Lightweight, proven in prior builds     |
| Styling   | CSS (scoped)              | No runtime cost                         |
| Audio     | Web Audio API (synth)     | Zero files, runtime oscillators         |
| PostFX    | @react-three/postprocessing | Selective bloom, mipmapBlur          |

---

## PERFORMANCE TARGETS

- 60fps on mid-tier mobile (iPhone 12 / Pixel 6)
- <3 second initial load
- <100ms input latency
- Max 50 units per scene
- DPR capped at 2
- Training: 50 headless ticks/frame at 50x speed < 1ms
- Battle: mutable-ref updates (no Zustand per frame during combat)

---

*Last updated: 2026-04-06*
