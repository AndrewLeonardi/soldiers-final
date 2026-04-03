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
      weapon cards with equipped/trained/locked states, training CTA overlay
- [x] **Weapon system** -- shared weapon mesh factory (rifle, rocket, grenade, MG),
      display-size weapons for detail view, weapon swap on soldier model
- [x] **Mission briefing modal** -- game-style pre-battle screen showing
      level name, squad roster, BEGIN button
- [x] **Roster-connected placement** -- placement tray shows YOUR soldiers
      by name (SGT RICO, PVT ACE) with equipped weapon type
- [x] **Battlefield placement** -- placed soldiers spawn as flexSoldier models
      with correct weapon, connected to roster weapon stats
- [x] Scene routing: barracks 3D scene vs battlefield scene based on phase

### IN PROGRESS
- [ ] Soldier detail weapon display -- 3D weapon models visible in cards
      (display weapons built but layout needs polish)
- [ ] Training visibility -- CTA overlay exists but training arena not built

### NOT STARTED (next priorities)
- [ ] **ML/TRAINING SYSTEM** -- port NeuralNet + GeneticAlgorithm from V5,
      build training arena with real-time neuroevolution visualization
- [ ] **Battle simulation** -- wire BattleLoop, enemy spawning, combat AI,
      projectiles, damage, win/lose conditions
- [ ] Store/shop screen (browse and buy soldiers, vehicles, items)
- [ ] Defense models in R3F (walls, sandbags, towers)
- [ ] Victory/defeat screen
- [ ] Map/level select screen
- [ ] Audio system (Howler.js + SFX)
- [ ] Post-processing (bloom, vignette)

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

### 2. SOLDIER DETAIL -- BUILT (needs weapon display polish)
- 3D soldier preview (rotatable, drag-to-spin, idle animation)
- Weapon cards: equipped (green), trained (gold), locked (dimmed + lock)
- Tapping locked weapon shows TRAINING REQUIRED overlay
- Training CTA: pulsing button with compute cost
- Back button returns to barracks

### 3. MISSION BRIEFING -- BUILT
- Full-screen modal over battlefield
- Shows level name, your squad roster with weapons + stars
- BEGIN button dismisses and reveals placement tray

### 4. PLACEMENT -- BUILT
- Bottom tray shows YOUR soldiers by name + weapon type + gold cost
- Tap soldier, tap battlefield to place
- GO button starts battle

### 5. BATTLE -- PARTIAL (visuals only, no simulation)
- Placed soldiers appear with correct weapons
- Battlefield with props visible
- Camera orbit works
- No enemy spawning, no combat, no win/lose yet

### 6. TRAINING ARENA -- NOT BUILT
- Will be launched from soldier detail when tapping TRAIN
- Real-time neuroevolution visualization
- NERO hybrid: scripted physics + neural net corrections
- GA: 20-30 population, tournament selection
- Speed controls, fitness progress, milestone notifications

### 7. MAP / LEVEL SELECT -- NOT BUILT
### 8. SHOP / STORE -- NOT BUILT

---

## TRAINING (the business model)

Training is where compute gets spent. It must be visually spectacular.

**Architecture (from V5 soldier-test):**
- NERO-inspired hybrid: script the ballistics physics, neural net learns
  aim corrections + fire timing
- Small GA: 20-30 population, 12 hidden neurons, 136 weights
- Trains fast in-browser (client-side)
- Fitness function: hits (200pts), near-misses (32pts), accuracy bonus

**UX flow:**
1. Tap locked weapon in soldier detail
2. "TRAINING REQUIRED" overlay appears
3. Tap TRAIN (costs compute)
4. Training arena: watch soldiers evolve in real-time
5. Graduation: "SKILL UNLOCKED" moment
6. Return to soldier detail with weapon now available

**Status:** ML engine not ported yet. Training CTA overlay exists as
visual placeholder. NeuralNet + GeneticAlgorithm code exists in V5
(soldier-test repo) ready to port.

---

## ECONOMY

Two currencies. One makes money. One doesn't.

**COMPUTE (revenue):** The ONLY purchasable currency. Used to train
soldiers in new weapon skills via real neuroevolution. Daily free drip
of 100 Compute (~1 basic training/day).

**GOLD (free):** Earned by winning battles. Spent on recruiting soldiers,
healing injuries, weapon blueprints. Cannot be purchased. Ever.

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
    ml/           -- Neural net, genetic algorithm (NOT YET PORTED)
    sim/          -- BattleManager (built, not wired)
    economy/      -- (not started)
    levels/       -- (not started)

  three/          -- All 3D rendering.
    models/       -- flexSoldier, SoldierUnit, SoldierPreview, BarracksScene,
                     weaponMeshes, jeep, plasticWall, materials, sandboxProps
    effects/      -- (not started)
    camera/       -- CameraRig (orbit controls)
    physics/      -- SlotMarker

  scenes/         -- Game.tsx (scene router), BattleScene.tsx
  ui/             -- BarracksScreen, SoldierDetail, MissionBriefing,
                     PlacementTray, HUD, ToyIcons
  stores/         -- gameStore, rosterStore
  config/         -- types, units, roster, levels/sandbox-01.json
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, briefing.css, game-ui.css
```

---

## BUILD SEQUENCE

### DONE: Visual Foundation
1. ~~Project scaffolding~~
2. ~~Homepage~~
3. ~~3D models + materials~~
4. ~~Battlefield scene~~
5. ~~Barracks with 3D soldiers~~
6. ~~Soldier detail with weapon system~~
7. ~~Mission briefing modal~~
8. ~~Roster-connected placement~~

### NEXT: Training System
9. Port NeuralNet + GeneticAlgorithm from soldier-test
10. Build training arena (3D visualization, speed controls, milestones)
11. Wire TRAIN button to launch arena from soldier detail
12. Graduation flow (skill unlocked, return to detail)

### THEN: Battle Phase
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

---

*Last updated: 2026-04-03*
