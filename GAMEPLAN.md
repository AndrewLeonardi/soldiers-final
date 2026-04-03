# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## CURRENT STATUS (as of 2026-04-03)

### DONE
- [x] Project scaffolding (Vite + React 19 + R3F + Rapier + Zustand + TS)
- [x] Homepage ported from ToySoldiers-two (hero scene, brain viz, all sections)
- [x] 7 model files ported to TypeScript (materials, flexSoldier, jeep,
      plasticWall, easing, poseBlender, equipmentPoses)
- [x] 15+ SVG icons (MicrochipIcon, GoldCoinIcon, weapon icons, UI icons)
- [x] Sandbox battlefield scene (table frame, coffee mug, pencil, sandbags,
      barbed wire, flags, oil drums, rocks, scrub, sand dunes)
- [x] OrbitControls camera (orbit, zoom, pan with orbit-vs-click detection)
- [x] ACESFilmic tone mapping + plastic-sheen materials
- [x] Game store (Zustand: phases, units, gold, compute, waves)
- [x] Roster store (Zustand: soldier profiles, weapon equip/unlock, recruit)
- [x] **3D Barracks hub** -- real flexSoldier models standing on a surface,
      tap to configure, recruit button, deploy button, hover effects
- [x] **Soldier detail screen** -- 3D soldier preview (rotatable, drag-to-spin),
      5 weapon cards (rifle, rocket, grenade, MG, tank) with states
- [x] **Weapon system** -- shared weapon mesh factory (rifle, rocket, grenade,
      MG), display-size weapons, weapon swap on soldier model
- [x] **Mission briefing modal** -- game-style pre-battle screen showing
      level name, squad roster, BEGIN button
- [x] **Roster-connected placement** -- placement tray shows YOUR soldiers
      by name (SGT RICO, PVT ACE) with equipped weapon type
- [x] **Battlefield placement** -- placed soldiers spawn as flexSoldier models
      with correct weapon, connected to roster weapon stats
- [x] Scene routing: barracks, battlefield, training scenes based on phase
- [x] **Visual overhaul** -- mobile game UI with chunky beveled buttons,
      navy-blue gradient panels, gold borders, warm depth
- [x] **ML Training System** -- full NERO hybrid neuroevolution:
      - NeuralNet (6->12->4 feedforward, tanh, 136 weights)
      - GeneticAlgorithm (pop=30, tournament selection, adaptive mutation)
      - 5 weapon scenarios (rocket, grenade, MG, tank + rifle default)
      - Hybrid approach: scripted physics + NN learns corrections
      - Training store (Zustand) bridges engine to UI
      - 3D Training Arena with soldier/tank, soda-can targets, explosions
      - Weapon-specific poses (rocket kneeling, grenade throw, MG burst)
      - Weapon-specific projectiles (rocket mesh+exhaust, grenade sphere,
        MG bullets, tank shells) with impact explosions
      - Procedural toy tank model (hull, tracks, rotating turret+barrel)
      - TrainingHUD: generation counter, fitness %, sparkline, speed
        controls (1x-50x), progress bar to graduation
      - NeuralNetViz: SVG overlay showing live NN nodes + weighted
        connections (green/red), weapon-specific labels
      - GraduationBanner: "SKILL LEARNED!" celebration with stars
      - Brain weights persist on SoldierProfile
      - Training launched from soldier detail via "BEGIN TRAINING" CTA

### NOT STARTED (next priorities)
- [ ] **Battle simulation** -- wire BattleLoop, enemy spawning, combat AI,
      projectiles, damage, win/lose conditions
- [ ] Store/shop screen (browse and buy soldiers, vehicles, items)
- [ ] Defense models in R3F (walls, sandbags, towers)
- [ ] Victory/defeat screen
- [ ] Map/level select screen
- [ ] Audio system (Howler.js + SFX)
- [ ] Post-processing (bloom, vignette)
- [ ] Roster persistence (localStorage/IndexedDB)

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
BARRACKS (hub -- always come back here)
  --> tap soldier --> SOLDIER DETAIL (equip weapons, train skills)
  --> DEPLOY --> MISSION BRIEFING --> PLACEMENT (place your soldiers)
    --> GO --> BATTLE (watch it play out -- physics chaos)
      --> RESULTS (gold, stars, injuries)
        --> BARRACKS (next round)
```

The BARRACKS is the hub. You always return here. It shows your army
as real 3D toy soldiers standing on a surface.

TRAINING is launched from the soldier detail screen when tapping a
locked weapon. It's where compute (the monetization currency) gets
spent. Training is the entire business model.

---

## SCREENS

### 1. BARRACKS (Hub) -- BUILT
- 3D flexSoldier models standing on sandy surface with wood frame
- Tap a soldier to open detail view (hover effect: scale up + cursor)
- Recruit [+] button (costs gold)
- DEPLOY button transitions to placement
- Adaptive camera: adjusts for soldier count and screen aspect ratio
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
- Weapon-specific rendering:
  - Rocket: soldier kneels with launcher on shoulder, fires rocket meshes
  - Grenade: soldier throws, grenade arcs with splash
  - Machine Gun: soldier aims, rapid bullet trails
  - Tank: procedural tank drives, turret auto-tracks, shells fire
- Impact explosions (expanding orange fireball on rocket/grenade/shell hit)
- TrainingHUD overlay: GEN counter, fitness %, sparkline, speed (1x-50x),
  progress bar, pause/stop buttons
- NeuralNetViz: SVG showing 6 input -> 12 hidden -> 4 output nodes
  with weighted connections (green=positive, red=negative)
- GraduationBanner: "SKILL LEARNED!" with 3 gold stars, fitness stats,
  "Save & Continue" button
- Brain weights saved to SoldierProfile on graduation

### 4. MISSION BRIEFING -- BUILT
- Full-screen modal over battlefield
- Shows level name, your squad roster with weapons + stars
- BEGIN button dismisses and reveals placement tray

### 5. PLACEMENT -- BUILT
- Bottom tray panel with YOUR soldiers by name + weapon type + gold cost
- Tap soldier, tap battlefield to place
- GO button starts battle

### 6. BATTLE -- PARTIAL (visuals only, no simulation)
- Placed soldiers appear with correct weapons
- Battlefield with props visible
- Camera orbit works
- No enemy spawning, no combat, no win/lose yet

### 7. MAP / LEVEL SELECT -- NOT BUILT
### 8. SHOP / STORE -- NOT BUILT

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

**UX flow (BUILT):**
1. Tap locked weapon in soldier detail
2. "TRAINING REQUIRED" overlay appears with gold-bordered panel
3. Tap "BEGIN TRAINING" (costs compute)
4. Training arena: watch soldier/tank evolve in real-time
5. Speed controls: 1x to 50x
6. Graduation: "SKILL LEARNED!" celebration with 3 gold stars
7. "Save & Continue" returns to barracks with weapon unlocked

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
  engine/         -- Pure game logic. Zero rendering imports.
    ml/           -- NeuralNet, GeneticAlgorithm, simulationRunner
      scenarios/  -- rocketScenario, grenadeScenario, machineGunScenario, tankScenario
    sim/          -- BattleManager (built, not wired)

  three/          -- All 3D rendering.
    models/       -- flexSoldier (18 poses + rocket poses), SoldierUnit,
                     SoldierPreview, BarracksScene, weaponMeshes, jeep,
                     plasticWall, materials, sandboxProps
    camera/       -- CameraRig (orbit controls)
    physics/      -- SlotMarker

  scenes/         -- Game.tsx (scene router), BattleScene.tsx, TrainingScene.tsx
  ui/             -- BarracksScreen, SoldierDetail, MissionBriefing,
                     PlacementTray, HUD, TrainingHUD, GraduationBanner,
                     NeuralNetViz, ToyIcons
  stores/         -- gameStore, rosterStore, trainingStore
  config/         -- types, units, roster, levels/sandbox-01.json
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, briefing.css, game-ui.css,
                     training.css, homepage.css, global.css
```

---

## BUILD SEQUENCE

### DONE: Visual Foundation + Training
1. ~~Project scaffolding~~
2. ~~Homepage~~
3. ~~3D models + materials~~
4. ~~Battlefield scene~~
5. ~~Barracks with 3D soldiers~~
6. ~~Soldier detail with weapon system~~
7. ~~Mission briefing modal~~
8. ~~Roster-connected placement~~
9. ~~Visual overhaul (mobile game UI)~~
10. ~~ML Training System (NeuralNet + GA + training arena + graduation)~~
11. ~~Tank weapon type + tank training scenario~~
12. ~~Neural network visualization~~

### NEXT: Battle Phase
13. Wire BattleLoop into scene
14. Enemy spawning + rendering
15. Combat AI + projectiles + damage
16. Win/lose detection + result screen

### THEN: Polish
17. Audio (Howler.js + SFX)
18. Post-processing (bloom + vignette)
19. Game feel (screen shake, particles, spring animations)
20. Map/level select screen
21. Store/shop screen
22. Roster persistence (localStorage)

---

## TECH STACK

| Layer     | Choice                    | Why                                     |
|-----------|---------------------------|-----------------------------------------|
| Language  | TypeScript 6              | Full ecosystem typing                   |
| Framework | React 19 + Vite 8         | Fast builds, modern React               |
| 3D        | Three.js + R3F            | Proven, massive ecosystem               |
| Physics   | @react-three/rapier       | Real rigid body physics = comedy        |
| State     | Zustand                   | Lightweight, proven in prior builds     |
| Styling   | CSS (scoped)              | No runtime cost                         |
| Audio     | Howler.js                 | 7KB, spatial audio, mobile-ready        |

---

## PERFORMANCE TARGETS

- 60fps on mid-tier mobile (iPhone 12 / Pixel 6)
- <3 second initial load
- <100ms input latency
- Max 50 Rapier physics bodies per scene
- DPR capped at 2
- Training: 50 headless ticks/frame at 50x speed < 1ms

---

*Last updated: 2026-04-03*
