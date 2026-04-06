# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## CURRENT STATUS (as of 2026-04-06)

### TIER 1 -- COMPLETE
All game-feel and campaign foundation items are done.

- [x] Everything from build steps 1-20 (scaffolding through audio)
- [x] **Roster + game persistence (localStorage)** -- Zustand persist
      middleware on rosterStore (soldiers, trained brains, weapons) and
      gameStore (gold, compute, campaign progress). Survives page refresh.
      Version-migrated persist (v1→v2) for campaign schema.
- [x] **Wall destruction wired up** -- Explosions damage wall blocks
      (blast radius knockback + cascade collapse). Bullets absorbed by
      walls (walls = cover). Projectile-wall collision detection.
- [x] **Visual effects overhaul:**
      - ExplosionEffect: dual-sphere fireball + point light flash + 8-12
        debris particles (radial velocity, gravity, ground bounce, fade)
      - ScreenShake: dampened oscillation camera shake, triggerShake()
        callable from anywhere, fires on every explosion
      - Enhanced ProjectileMesh: bullets have glow sphere + trailing
        cylinder (team-colored green/red), rockets have nose cone +
        exhaust trail + smoke puff, grenades pulse emissive glow
      - Bloom post-processing (EffectComposer + Bloom, luminanceThreshold
        0.9, mipmapBlur) -- muzzle flashes and explosions glow naturally
      - Muzzle flash: per-soldier pointLight that fires on weapon discharge
- [x] **6-level campaign with multi-wave battles:**
      - Level 1 "First Contact": 1 wave, 4 infantry, budget 500
      - Level 2 "Armored Advance": 2 waves, infantry + jeep, budget 800
      - Level 3 "Heavy Metal": 3 waves, infantry + jeeps + tank, budget 1200
      - Level 4 "Rocket Rain": 2 waves, enemy rocket soldiers, budget 1000
      - Level 5 "Grenades & Glory": 3 waves, enemy grenades + rockets, budget 1500
      - Level 6 "Full Assault": 4 waves, ALL enemy weapons + tanks, budget 2000
      - Multi-wave spawning from level JSON (delay-based, not round-based)
      - Star criteria from level config (survive / budget threshold / no losses)
      - Campaign progress persists to localStorage
- [x] **Enemy weapon scaling** -- enemies can fire rockets (ballistic arc),
      grenades (bounce + fuse), and MG (rapid sweep). WaveEnemy type has
      optional `weapon` field. getEnemyStats() merges base type stats with
      weapon overrides. Aim randomness for fairness.
- [x] **Level Select (Angry Birds node map):**
      - Full themed terrain map: layered background, winding dirt path,
        military decorations (flag, barbed wire, sandbags, ammo crates,
        compass rose, footprints, rocks)
      - Beveled 3D node buttons with gradient fills, drop shadows, inner
        bevel highlights, name plates, gold stars
      - Animations: staggered node entrance (pop), current-level idle bob,
        pulsing gold glow rings, completed sparkles, flag wave
      - Level N+1 unlocks when N completed with >= 1 star
- [x] **Victory juice:**
      - Slow-mo on last enemy death (1.5s at 0.2x time scale)
      - Confetti burst (45-60 gold/green/white particles with flutter,
        tumble, light gravity, fade)
      - Victory camera sweep (auto-rotate ramps 0.5→2.5, subtle zoom,
        eases back after 3s)
      - Result screen shows level name + star criteria breakdown
      - NEXT LEVEL / LEVEL SELECT / TRY AGAIN buttons
- [x] **Audio system (Web Audio API)** -- 17 synthesized sounds, zero files

### NEEDS WORK (known issues)
- [ ] **Enemy AI movement too simple** -- enemies march in a straight line
      to Intel. No flanking, cover-seeking, or tactical grouping.
      (Enemies DO now fire rockets/grenades/MG, but movement is basic.)
- [ ] **No store / shop screen** -- can't buy recruits or compute packs
- [ ] **No compute economy tuning** -- no daily drip, no purchase flow
- [ ] **Soldier names/personality** -- no name plates in battle, no veteran
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
- 12-step guided onboarding with spotlight system
- Walks through full core loop: recruit → train → deploy → fight → win
- localStorage persistence (plays once)
- Auto-loads level-01 for tutorial battle

### 8. LEVEL SELECT -- BUILT
- Angry Birds-style node map with themed military terrain
- 6 levels connected by winding dirt path
- Beveled 3D node buttons, lock/unlock states, gold stars
- Rich animations: staggered entrance, idle bob, pulsing glow, sparkles
- Terrain decorations: flag, barbed wire, sandbags, ammo crates, compass

### 9. SHOP / STORE -- NOT BUILT

---

## WHAT'S NEXT (priority order)

### TIER 1: Game feel + Campaign foundation -- COMPLETE
1. ~~**Audio system** -- DONE~~
2. ~~**Campaign / level progression** -- DONE (6 levels, multi-wave,
   enemy weapon scaling, star progression, Angry Birds level select)~~
3. ~~**Victory/defeat juice** -- DONE (slow-mo, confetti, camera sweep,
   screen shake, explosions, bloom)~~
4. ~~**Roster persistence** -- DONE (Zustand persist, campaign progress)~~

### TIER 2: Economy + Store
Build the monetization loop and give players things to buy.

5. **Store / shop screen** -- Browse and buy:
   - New soldier recruits (different ranks/stats)
   - Defense upgrades
   - Compute packs (the monetization point)
   - Visual: card-based grid, game-feel buttons

6. **Compute economy tuning** -- Daily free drip, purchase flow,
   compute-to-gold conversion, premium training tiers.

### TIER 3: AI + Polish
7. **Enemy AI movement improvements** -- Enemies fire weapon variants
   now but still march in a straight line. Needs:
   - Flanking: enemies approach from multiple angles
   - Cover-seeking: enemies hide behind obstacles
   - Priority targeting: focus on towers/walls first

8. **Soldier names + personality** -- Name plates in battle, stat growth,
   veteran bonuses from surviving battles.

9. **More campaign content** -- Expand beyond 6 levels. New themes
   (kitchen table, bedroom floor). Boss levels with special mechanics.

10. **Additional polish** -- Vignette edges, dust clouds on movement,
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
                     ResultScreen, LevelSelect, TutorialOverlay, ToyIcons
  stores/         -- gameStore (+ campaign), rosterStore, trainingStore,
                     tutorialStore (all with persist middleware)
  config/         -- types, units, roster
    levels/       -- index.ts (registry), level-01 through level-06 JSON
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, game-ui.css, levelselect.css,
                     training.css, tutorial.css, homepage.css, global.css
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

### NEXT (31-36)
31. Store / shop screen (recruits, compute packs, defense upgrades)
32. Compute economy tuning (daily drip, purchase flow, premium tiers)
33. Enemy AI movement (flanking, cover-seeking, priority targeting)
34. Soldier names + personality (name plates, veteran bonuses, stat growth)
35. More campaign content (expand to 10+ levels, new themes)
36. Additional polish (vignette, dust clouds, damage numbers)

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
