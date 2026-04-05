# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## CURRENT STATUS (as of 2026-04-04)

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
      tap to configure, recruit button, deploy button, hover effects.
      Zoomed-out camera for army overview (scales with soldier count).
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
- [x] **Real neural net AI in battle** -- trained soldiers use actual
      136-weight NN (NERO hybrid) for precise aim corrections.
      Untrained soldiers fire with wild random aim (±23 degrees).
      Rifle is always "trained" (basic scripted aim).
- [x] **Weapon-specific projectiles** -- rockets (ballistic arc + 3.6
      blast radius), grenades (bounce + 1.2s fuse + 3.0 blast),
      MG (rapid straight). All with area knockback on explosion.
- [x] **Battle camera** -- fov=38, position=[0,14,16] shows full battlefield
- [x] **Round progression** -- nextRound() heals survivors, awards
      gold (200+round*50), spawns escalating waves from ROUND_WAVES
      (4 infantry -> 6 -> 5+jeep -> 8+2jeeps -> 6+tank)
- [x] **Compute prominence** -- "UNTRAINED" red pulsing badge on
      placement cards. "TRAIN YOUR SOLDIERS" tip on defeat screen.
- [x] **Defense objects** -- walls (destructible 6x5 brick grid with
      structural integrity + cascading collapse), sandbags (U-shaped
      bunker), watch towers (elevated platform at y=1.8). Placement
      via defense cards in tray (wall $50, sandbag $75, tower $200).
- [x] **Intel objective** -- rotating briefcase on pedestal at [-7,0,0],
      golden glow ring, point light to draw attention
- [x] **Ghost preview** -- transparent green/red shape follows cursor
      during placement, snaps to 0.5 grid, validates player zone (x<=2)
- [x] **Result screen** -- DEFEAT/VICTORY banner, stars, enemies eliminated,
      soldiers surviving, gold reward, TRY AGAIN / NEXT BATTLE button
- [x] **Tutorial / Onboarding** -- 12-step guided tutorial:
      - Welcome modals with gold + compute reveal (animated counters)
      - Spotlight system: 4-mask cutout + pulsing gold ring + speech bubbles
        with dynamic arrow alignment
      - Walks through: recruit → view loadout → train weapon → deploy →
        battle → victory
      - Compute gets dramatic green-themed reveal (pulsing glow, premium feel)
      - Starts with zero soldiers and zero resources (earned, not given)
      - Tutorial battle: easy 2-infantry wave (trivially winnable)
      - Buttons disabled during guided steps (can't skip ahead)
      - Completion: stars celebration + "YOU'RE READY, COMMANDER"
      - Persists to localStorage (only plays once)
      - tutorialStore (Zustand) + TutorialOverlay + tutorial.css

- [x] **Audio system (Web Audio API)** -- 17 synthesized sounds, zero
      external files. All sounds generated at runtime via oscillators,
      noise buffers, and filters:
      - Battle: rifle shot, MG burst, rocket launch, grenade throw,
        explosions (large/small), bullet impact, death thud
      - UI: button tap, recruit chime, deploy horn, weapon equip
      - Training: target hit pop, graduation fanfare
      - Tutorial: modal appear, step advance, completion fanfare
      - Voice pool system prevents audio overload (max voices per
        category + cooldown to prevent phasing)
      - Mobile AudioContext resume on first touch interaction
      - src/audio/: context.ts, voicePool.ts, synthEngine.ts, sfx.ts

### NEEDS WORK (known issues)
- [ ] **Enemy AI too simple** -- enemies walk in a straight line to Intel,
      no flanking, no cover-seeking, no grenade throws
- [ ] **No roster persistence** -- soldiers/brains/gold reset on page refresh
- [ ] **No campaign progression** -- only one level (sandbox-01), enemies
      don't scale with player (no enemy rockets, tanks, grenades yet)

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
- Enemy soldiers spawn and march toward Intel briefcase
- Player soldiers auto-target and fire at enemies
- Weapon-specific projectiles (bullets, rockets, grenades, MG)
- Explosion system with blast radius + area knockback
- Death knockback + ragdoll (velocity, spin, ground bounce)
- Win: all enemies dead. Lose: enemy reaches Intel
- Trained NN used for aim corrections; untrained = comedy chaos
- Round progression: escalating waves (infantry → jeeps → tanks)
- Destructible walls with structural integrity + cascading collapse

### 6. RESULTS -- BUILT
- DEFEAT/VICTORY banner with overlay
- Stats: enemies eliminated, soldiers surviving
- Gold reward on victory (200 + round*50)
- Stars (1-3 based on performance)
- TRY AGAIN / NEXT ROUND button

### 7. TUTORIAL -- BUILT
- 12-step guided onboarding with spotlight system
- Welcome modals: gold + compute reveal (animated counters)
- Walks through full core loop: recruit → train → deploy → fight → win
- Buttons disabled during guided steps
- Completion celebration with stars
- localStorage persistence (plays once)

### 8. MAP / LEVEL SELECT -- NOT BUILT
### 9. SHOP / STORE -- NOT BUILT

---

## WHAT'S NEXT (priority order)

### TIER 1: Game feel + Campaign foundation
Build the systems that make it feel like a real game, then give
players a reason to keep playing.

1. ~~**Audio system (Web Audio API + SFX)** -- DONE~~

2. **Campaign / level progression** -- Currently only sandbox-01.
   The game needs a reason to keep playing. Build:
   - 5-10 levels with escalating difficulty + different layouts
   - Enemy army scales WITH the player (enemies get rockets, tanks,
     grenade soldiers as player progresses -- mirror the player's
     growth)
   - Star progression (earn stars → unlock next level)
   - Map / level select screen (Angry Birds style world map)
   - Each level has unique terrain, placement zones, wave configs
   - Level data already uses LevelConfig JSON format
   - Boss levels with special enemy compositions

3. **Victory/defeat juice** -- Results screen is flat. Needs:
   - Camera sweep on victory (slow orbit around battlefield)
   - Particle burst on victory (confetti / sparks)
   - Screen shake on explosions during battle
   - Slow-mo on last enemy death

### TIER 2: Persistence + Economy
Once there's content worth saving, make it persist.

4. **Roster persistence (localStorage)** -- Progress resets on refresh.
   Save soldiers, brains, gold, compute, campaign progress, stars.
   Use Zustand persist middleware or manual localStorage sync.

5. **Store / shop screen** -- Browse and buy:
   - New soldier recruits (different ranks/stats)
   - Defense upgrades
   - Compute packs (the monetization point)
   - Visual: card-based grid, Angry Birds style

6. **Compute economy tuning** -- Daily free drip, purchase flow,
   compute-to-gold conversion, premium training tiers.

### TIER 3: AI + Polish
7. **Enemy AI improvements** -- Currently brain-dead march.
   - Flanking: enemies approach from multiple angles
   - Cover-seeking: enemies hide behind obstacles
   - Grenade throws: enemies with area attacks
   - Priority targeting: focus on towers/walls first

8. **Post-processing** -- Bloom on explosions, vignette edges.

9. **Screen shake + particles** -- Explosion impacts, dust clouds.

10. **Soldier names + personality** -- Name plates, stat growth,
    veteran bonuses from surviving battles.

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
- Trained soldiers: NN provides aim/elevation/fire corrections
- Untrained soldiers: comically bad random aim (±23 degrees)
- Projectile physics: bullets (linear), rockets (arced), grenades (bounced)
- Explosion system: blast radius + area damage + knockback physics
- Collision: radius-based hit detection, damage application
- Ragdoll: velocity knockback, gravity, ground bounce, spin decay
- Death: animation plays once and holds, body settles on ground
- Intel objective: briefcase at [-7,0,0], enemies lose if they reach it
- Walls: destructible brick grid with structural integrity + cascading collapse
- Round progression: escalating waves from ROUND_WAVES config

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
    sim/          -- BattleManager (legacy, replaced by BattleScene inline logic)

  three/          -- All 3D rendering.
    models/       -- flexSoldier (18 poses + rocket poses), SoldierUnit,
                     SoldierPreview, BarracksScene, weaponMeshes, jeep,
                     plasticWall, materials, sandboxProps, Intel,
                     GhostPreview, ProjectileMesh, Defenses
    camera/       -- CameraRig (orbit controls)
    physics/      -- SlotMarker

  scenes/         -- Game.tsx (scene router), BattleScene.tsx (all battle
                     logic + rendering), TrainingScene.tsx
  ui/             -- BarracksScreen, SoldierDetail, PlacementTray,
                     HUD, TrainingHUD, GraduationBanner, NeuralNetViz,
                     ResultScreen, TutorialOverlay, ToyIcons
  stores/         -- gameStore, rosterStore, trainingStore, tutorialStore
  config/         -- types, units, roster, levels/sandbox-01.json
  pages/          -- HomePage
  styles/         -- barracks.css, loadout.css, game-ui.css,
                     training.css, tutorial.css, homepage.css, global.css
```

---

## BUILD SEQUENCE

### DONE (1-19)
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

### NEXT (21-30)
21. Campaign / level progression (5-10 levels, enemy army scaling)
22. Victory/defeat juice (camera sweeps, particles, screen shake)
23. Roster persistence (localStorage)
24. Store / shop screen (recruits, compute packs)
25. Enemy AI improvements (flanking, cover, grenades)
26. Post-processing (bloom, vignette)
27. Screen shake + particles
28. Soldier names + personality
29. Compute economy tuning
30. Map / level select screen (Angry Birds style world map)

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

*Last updated: 2026-04-04*
