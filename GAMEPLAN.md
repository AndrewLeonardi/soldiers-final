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
- [x] Sandbox battlefield scene (table frame, barbed wire, oil drums,
      rocks, scrub -- simplified, no household clutter)
- [x] OrbitControls camera (orbit, zoom, pan with orbit-vs-click detection)
- [x] ACESFilmic tone mapping + plastic-sheen materials
- [x] Game store (Zustand: phases, units, gold, compute, placement state)
- [x] Roster store (Zustand: soldier profiles, weapon equip/unlock, recruit)
- [x] **3D Barracks hub** -- real flexSoldier models standing on a surface,
      tap to configure, recruit button, deploy button, hover effects
- [x] **Soldier detail screen** -- 3D soldier preview (rotatable, drag-to-spin),
      5 weapon cards (rifle, rocket, grenade, MG, tank) with states
- [x] **Weapon system** -- shared weapon mesh factory (rifle, rocket, grenade,
      MG), display-size weapons, weapon swap on soldier model
- [x] **Roster-connected placement** -- military green cards show YOUR soldiers
      by name (RICO, ACE) with equipped weapon type and gold cost
- [x] **Battlefield placement** -- placed soldiers spawn as flexSoldier models
      with correct weapon, ghost preview follows cursor (green/red zones)
- [x] Scene routing: barracks, battlefield, training scenes based on phase
- [x] **Visual overhaul** -- mobile game UI with military green placement cards,
      gradient overlays, beveled buttons, game-feel transitions
- [x] **ML Training System** -- full NERO hybrid neuroevolution:
      - NeuralNet (6->12->4 feedforward, tanh, 136 weights)
      - GeneticAlgorithm (pop=30, tournament selection, adaptive mutation)
      - 5 weapon scenarios (rocket, grenade, MG, tank + rifle default)
      - Hybrid approach: scripted physics + NN learns corrections
      - Training store (Zustand) bridges engine to UI
      - 3D Training Arena with soldier/tank, soda-can targets, explosions
      - Weapon-specific poses (rocket kneeling, grenade throw, MG burst)
      - Weapon-specific projectiles with impact explosions
      - Procedural toy tank model (hull, tracks, rotating turret+barrel)
      - TrainingHUD: generation counter, fitness %, sparkline, speed
        controls (1x-50x), progress bar to graduation
      - NeuralNetViz: SVG overlay showing live NN nodes + weighted
        connections (green/red), weapon-specific labels
      - GraduationBanner: "SKILL LEARNED!" celebration with stars
      - Brain weights persist on SoldierProfile
      - Training launched from soldier detail via "BEGIN TRAINING" CTA
- [x] **Battle system** -- mutable-ref physics (soldier-test pattern):
      - Enemy soldiers spawn from waves, march toward Intel objective
      - Player soldiers auto-target nearest enemy, fire bullets/rockets
      - Projectile rendering (bullet cylinders, rocket meshes + flame)
      - Collision detection with damage, hit status, death knockback
      - Ragdoll physics: velocity, gravity, ground bounce, spin decay
      - Death animation plays once and holds (no looping)
      - Win condition: all enemies dead. Lose: enemy reaches Intel
      - Single-wave first level (4 infantry)
- [x] **Intel objective** -- rotating briefcase on pedestal at [-7,0,0],
      golden glow ring, point light to draw attention
- [x] **Ghost preview** -- transparent green/red shape follows cursor
      during placement, snaps to 0.5 grid, validates player zone (x<=2)
- [x] **Result screen** -- DEFEAT/VICTORY banner, stars, enemies eliminated,
      soldiers surviving, gold reward, TRY AGAIN / NEXT BATTLE button
- [x] **No mission briefing** -- deploy goes straight to placement
      (removed unnecessary extra tap)

- [x] **Real neural net AI in battle** -- trained soldiers use actual
      136-weight NN (NERO hybrid) for precise aim corrections.
      Untrained soldiers fire with wild random aim (±23 degrees).
      Rifle is always "trained" (basic scripted aim).
- [x] **Weapon-specific projectiles** -- rockets (ballistic arc + 3.6
      blast radius), grenades (bounce + 1.2s fuse + 3.0 blast),
      MG (rapid straight). All with area knockback on explosion.
- [x] **Battle camera** -- fov=38, position=[0,14,16] shows full
      battlefield (matches soldier-test)
- [x] **Round progression** -- nextRound() heals survivors, awards
      gold (200+round*50), spawns escalating waves from ROUND_WAVES
      (4 infantry -> 6 -> 5+jeep -> 8+2jeeps -> 6+tank)
- [x] **Compute prominence** -- "UNTRAINED" red pulsing badge on
      placement cards. "TRAIN YOUR SOLDIERS" tip on defeat screen.
      Round number in placement bar and results.
- [x] **Defense objects** -- walls (destructible 6x5 brick grid with
      structural integrity + cascading collapse), sandbags (U-shaped
      bunker), watch towers (elevated platform at y=1.8). Placement
      via defense cards in tray (wall $50, sandbag $75, tower $200).

### NEEDS WORK (known issues)
- [ ] **Enemy AI too simple** -- enemies walk in a straight line to Intel,
      no flanking, no cover-seeking, no grenade throws

### NOT STARTED (next priorities)
- [ ] Store/shop screen (browse and buy soldiers, vehicles, items)
- [ ] Victory/defeat animations (camera sweep, celebration particles)
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
  --> DEPLOY --> PLACEMENT (place soldiers + defenses on battlefield)
    --> FIGHT! --> BATTLE (watch it play out -- physics chaos)
      --> RESULTS (gold, stars, injuries)
        --> BARRACKS (next round)
```

The BARRACKS is the hub. You always return here. It shows your army
as real 3D toy soldiers standing on a surface.

TRAINING is launched from the soldier detail screen when tapping a
locked weapon. It's where compute (the monetization currency) gets
spent. Training is the entire business model.

BATTLE uses the Intel objective from soldier-test: enemies march toward
a TOP SECRET briefcase. If any enemy reaches it, you lose. Kill all
enemies to win. Place soldiers and defenses strategically to block
the advance.

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
- One soldier per card (can't place same soldier twice)

### 5. BATTLE -- BUILT (core working, needs polish)
- Mutable-ref physics pattern (from soldier-test)
- Enemy soldiers spawn and march toward Intel briefcase
- Player soldiers auto-target and fire at enemies
- Projectile rendering (bullets, rockets with flame)
- Death knockback + ragdoll (velocity, spin, ground bounce)
- Win: all enemies dead. Lose: enemy reaches Intel
- Intel briefcase: rotating, golden glow, "TOP SECRET" stripe

### 6. RESULTS -- BUILT
- DEFEAT/VICTORY banner with overlay
- Stats: enemies eliminated, soldiers surviving
- Gold reward on victory (200 + round*50)
- Stars (1-3 based on performance)
- TRY AGAIN / NEXT BATTLE button

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

---

## BATTLE (the gameplay)

**Architecture (BUILT -- soldier-test pattern):**
- Mutable refs for per-frame updates (NOT Zustand store per frame)
- BattleScene.tsx contains all battle logic in a single useFrame loop
- Enemy AI: march toward Intel, stop to fire at nearby player soldiers
- Player AI: auto-target nearest enemy, fire when in range
- Projectile physics: bullets (linear), rockets (arced with gravity)
- Collision: radius-based hit detection, damage application
- Ragdoll: velocity knockback, gravity, ground bounce, spin decay
- Death: animation plays once and holds, body settles on ground
- Intel objective: briefcase at [-7,0,0], enemies lose if they reach it

**Still needed:**
- Defense objects (walls, sandbags, towers) from soldier-test
- Grenade/rocket blast radius with area damage + knockback
- Wall block destruction (structural integrity, cascading collapse)
- Weapon-specific battle behavior (grenade arc, MG rapid fire)
- Trained brain stat buffs (faster fire, more damage)
- Round progression with escalating difficulty

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
    sim/          -- BattleManager (legacy, replaced by BattleScene inline logic)

  three/          -- All 3D rendering.
    models/       -- flexSoldier (18 poses + rocket poses), SoldierUnit,
                     SoldierPreview, BarracksScene, weaponMeshes, jeep,
                     plasticWall, materials, sandboxProps, Intel,
                     GhostPreview, ProjectileMesh
    camera/       -- CameraRig (orbit controls)
    physics/      -- SlotMarker

  scenes/         -- Game.tsx (scene router), BattleScene.tsx (all battle
                     logic + rendering), TrainingScene.tsx
  ui/             -- BarracksScreen, SoldierDetail, PlacementTray,
                     HUD, TrainingHUD, GraduationBanner, NeuralNetViz,
                     ResultScreen, ToyIcons
  stores/         -- gameStore, rosterStore, trainingStore
  config/         -- types, units, roster, levels/sandbox-01.json
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, game-ui.css,
                     training.css, homepage.css, global.css
```

---

## BUILD SEQUENCE

### DONE: Visual Foundation + Training + Battle
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

### NEXT: Battle Polish + Defenses
18. Defense objects (walls, sandbags, towers from soldier-test)
19. Grenade/rocket blast radius + area knockback
20. Wall destruction (structural integrity, cascading collapse)
21. Battle camera (zoom out to show full battlefield)
22. Weapon-specific battle behavior (grenade arcs, MG burst)
23. Round progression (escalating waves, gold rewards)
24. Trained brain stat buffs in battle

### THEN: Game Feel + Systems
25. Audio (Howler.js + SFX)
26. Post-processing (bloom + vignette)
27. Screen shake, particles, spring animations
28. Map/level select screen
29. Store/shop screen
30. Roster persistence (localStorage)

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
| Audio     | Howler.js                 | 7KB, spatial audio, mobile-ready        |

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

*Last updated: 2026-04-03*
