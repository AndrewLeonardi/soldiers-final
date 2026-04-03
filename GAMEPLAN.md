# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## CURRENT STATUS (as of 2026-04-02)

### DONE
- [x] Project scaffolding (Vite + React 19 + R3F + Rapier + Zustand + TS)
- [x] Homepage ported from ToySoldiers-two (hero scene, brain viz, all sections)
- [x] 7 model files ported to TypeScript (materials, flexSoldier, jeep,
      plasticWall, easing, poseBlender, equipmentPoses)
- [x] 15+ SVG icons (MicrochipIcon, GoldCoinIcon, weapon icons, UI icons)
- [x] HUD with proper SVG icons (gold coin, microchip for compute)
- [x] Sandbox battlefield scene (table frame, coffee mug, pencil, sandbags,
      barbed wire, flags, oil drums, rocks, scrub, sand dunes)
- [x] OrbitControls camera (orbit, zoom, pan with orbit-vs-click detection)
- [x] ACESFilmic tone mapping
- [x] Game store (Zustand: phases, units, gold, compute, waves)
- [x] Soldier model renders with idle animation in R3F + Rapier
- [x] Basic placement (select unit type, click ground, soldier spawns)

### BROKEN / INCOMPLETE
- [ ] All unit types render as soldiers (walls, sandbags have no 3D model)
- [ ] Orbit-vs-click detection may still suppress valid placement clicks
- [ ] No ghost preview during placement
- [ ] No battle phase (enemies don't spawn, no combat, no win/lose)
- [ ] No audio system
- [ ] No post-processing (bloom, vignette)
- [ ] No game feel (screen shake, particles, spring animations)

### NOT STARTED (critical)
- [ ] **SOLDIER LOADOUT SCREEN** -- the most important missing feature
- [ ] **TRAINING INTEGRATION** -- spending compute to unlock skills
- [ ] Roster store (soldier profiles, skills, equipped weapons)
- [ ] Defense models in R3F (walls, sandbags, towers)
- [ ] Victory/defeat screen
- [ ] Map/level select screen

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
MAP (pick a level)
  --> LOADOUT (configure soldiers: equip weapons, train skills, spend compute)
    --> PLACEMENT (place configured soldiers on the battlefield)
      --> BATTLE (watch it play out -- physics chaos)
        --> RESULTS (gold, stars, injuries)
          --> MAP (next level)
```

The LOADOUT screen is where the game's depth lives. It is where compute
(the monetization currency) feels valuable. It is the most important
screen after the battlefield itself.

---

## IMMEDIATE PRIORITY: THE LOADOUT SCREEN

This is the next thing we build. Nothing else until this works.

### What it is

A full-screen game panel (like Enlisted's soldier loadout -- see reference
images) where players see their soldiers, equip weapons, and spend
compute to train new skills. This screen is ALSO the entry point to
the training arena.

### Why it matters

- This is where COMPUTE feels valuable (the entire business model)
- This is where soldiers become characters you care about
- This is where weapon variety creates strategic depth
- This must scale to dozens of weapons, abilities, and equipment
- This must feel like a GAME, not a dashboard

### Layout (mobile-first, portrait)

```
+----------------------------+
|  [<] SGT RICO      [G] 500|  Header: soldier name + resources
|  Rifleman  ***              |  Class + star rating
+----------------------------+
|                            |
|   [ 3D Soldier Model ]     |  Top 40%: rotatable preview
|   (drag to spin)           |  Model updates live with equipped weapon
|                            |
+----------------------------+
|  Weaponry  Perks  Skills   |  Tab bar (like Enlisted)
+----------------------------+
|                            |
|  [Rifle *equipped*]        |  Weapon/item grid (scrollable)
|  [Rocket ?trained?]        |  * = equipped, ? = unlockable
|  [Grenade  LOCKED ]        |  LOCKED = needs compute to train
|  [MG       LOCKED ]        |
|                            |
+----------------------------+
|  [SGT Rico] [PVT Ace] [+] |  Roster strip: switch soldiers
+----------------------------+
|                            |
|  [ TRAIN -- 1 Compute ]    |  Action: train selected locked weapon
|  [ DEPLOY >>> ]            |  Or: proceed to placement with current loadout
+----------------------------+
```

### Key behaviors

- **3D preview** shows the selected soldier holding their equipped weapon.
  Drag to rotate. When you tap a different weapon, the model swaps live.
- **Locked weapons** show a lock icon + shimmer + "REQUIRES TRAINING".
  Tapping a locked weapon selects it and the bottom button becomes TRAIN.
- **TRAIN button** costs compute (shown with microchip icon). Tapping it
  transitions to the training arena where you watch neuroevolution in
  real-time. When training completes, "SKILL UNLOCKED" graduation moment,
  then back to loadout with the weapon now available.
- **Equipped weapon** has a green border/checkmark. Tap a trained weapon
  to equip it -- the 3D model updates instantly.
- **Roster strip** at bottom lets you switch between soldiers. Each chip
  shows soldier name + tiny weapon icon. [+] button recruits new soldier
  (costs gold).
- **DEPLOY button** takes you to the placement phase with your currently
  configured roster.

### Training (integrated into loadout)

Training is NOT a separate screen. It's launched FROM the loadout when
you tap TRAIN on a locked weapon. The training arena slides in (or the
camera zooms into it) and you watch the neuroevolution run. When done,
you're returned to the loadout with the skill unlocked.

The ML system (neural net, genetic algorithm, scenarios) is already
ported from solder-four and ready to integrate.

### Data model

Port `rosterStore.ts` from solder-four:
```typescript
interface SoldierProfile {
  id: string
  name: string
  skills: Partial<Record<WeaponType, TrainedBrain>>
  equippedWeapon: WeaponType
  status: 'ready' | 'injured'
  injuredUntilRound: number
  battlesWon: number
  kills: number
}
```

---

## ECONOMY (summary -- see ECONOMY.md for full details)

Two currencies. One makes money. One doesn't.

**COMPUTE (revenue):** The ONLY purchasable currency. Used to train
soldiers in new weapon skills via real neuroevolution. Daily free drip
of 100 Compute (~1 basic training/day). Purchasing compute is the
entire business model.

**GOLD (free):** Earned by winning battles. Spent on recruiting soldiers,
healing injuries, weapon blueprints. Cannot be purchased. Ever. Gold
is plentiful. Compute is always the bottleneck.

---

## SCREENS (5 total, zero dashboard energy)

### 1. MAP -- Level Select
- Full-screen themed map. Level nodes are physical objects.
- Stars on completed. Padlocks on locked.
- Tap a node for enemy preview. Star-gated world progression.

### 2. LOADOUT -- Soldier Configuration (NEW -- highest priority)
- Full-screen game panel (Enlisted-style, see reference images)
- 3D soldier preview (rotatable, updates with equipped weapon)
- Weapon/item grid: equipped, trained, locked states
- Training entry point (spend compute to unlock locked weapons)
- Roster strip to switch between soldiers
- DEPLOY button to proceed to placement
- See "IMMEDIATE PRIORITY" section above for full spec.

### 3. BATTLE -- Core Gameplay (80% of the game)
- **PLACEMENT:** Battlefield fills screen. Configured soldiers from
  loadout available in bottom tray. Freeform placement on player side.
  "GO" when ready.
- **COMBAT:** Full-screen 3D. Minimal HUD. Physics comedy. Camera
  orbit enabled.
- **RESULT:** Stars, gold, injuries. Single "CONTINUE" button.

### 4. TRAINING -- Embedded in Loadout
- Launched from loadout when tapping TRAIN on a locked weapon.
- Watch neuroevolution in real-time. Progress ring. Milestones.
- "SKILL UNLOCKED" graduation. Soldier poses with new weapon.
- Returns to loadout when done.

### 5. SHOP -- Bottom Sheet (not a page)
- Compute packs. Daily free claim. That's it.

---

## UX RULES (non-negotiable)

1. **No dashboards.** If you can screenshot it and mistake it for a
   web app, it's wrong.
2. **No emojis.** Ever. SVG icons or 3D assets only.
3. **No web patterns.** No nav bars, sidebars, breadcrumbs, card grids,
   white backgrounds, system fonts.
4. **Full-bleed art.** Edge to edge. 3D world always visible, even
   behind panels.
5. **Thumb zone.** Bottom 40% = actions. Top = HUD. Middle = game world.
6. **Transitions are animations.** Camera moves, panel slides, zooms.
   Never a hard page swap.
7. **Every surface is textured.** Wood, felt, dirt, plastic. No flat CSS.
8. **Buttons have depth.** Beveled, 3D press states, spring animations.
9. **Mobile-first, desktop-compatible.** Touch primary, mouse works.
10. **Simple > clever.** A 10-year-old figures it out in 5 seconds.

---

## THE HUMOR

Physics comedy is the personality of the game:
- Soldiers ragdoll off table edges (Wilhelm scream)
- Grenades landing short and launching YOUR guys
- Tanks driving off ledges in slow-mo
- Mines sending soldiers pinwheeling skyward
- Walls collapsing and burying troops in rubble
- Rockets knocking over giant background objects (coffee mugs, books)

The scale contrast (tiny soldiers vs huge household objects) IS the tone.

---

## LEVEL DESIGN

### Philosophy: Levels are puzzles, not grinds.

Hand-crafted. Specific challenges. Right strategy beats raw power.

### Design Patterns
- **Freeform placement** on the player side of the battlefield.
- **Unit restriction per level** -- forces varied strategies.
- **Teach-test-twist** for new mechanics.
- **Sawtooth difficulty** -- target 3.2 avg attempts per level.

### MVP Enemy Types (3 only)

| Type     | Behavior                | Countered by          |
|----------|-------------------------|-----------------------|
| Infantry | Walks, shoots, swarms   | Splash/area damage    |
| Jeep     | Fast, flanks            | Blocking units, mines |
| Tank     | Armored, heavy damage   | Rockets, heavy weapons|

### Three-Star System

| Star | Criteria                                      |
|------|-----------------------------------------------|
| 1    | Complete the level (survive)                  |
| 2    | Complete with budget remaining (efficiency)   |
| 3    | Level-specific bonus objective (mastery)      |

---

## MAP THEMES

| World | Theme         | Levels | Props                              |
|-------|---------------|--------|------------------------------------|
| 1     | THE SANDBOX   | 1-8    | Buckets, shovels, pebbles, sticks  |
| 2     | KITCHEN TABLE | 9-16   | Salt shakers, napkins, spoons, mugs|
| 3     | BEDROOM FLOOR | 17-25  | Books, toy blocks, shoes, rulers   |

**MVP: 25 levels across 3 themes.** Scale in Phase 5.

---

## TECH STACK

| Layer     | Choice                    | Why                                     |
|-----------|---------------------------|-----------------------------------------|
| Language  | TypeScript                | Entire R3F/Rapier/Zustand ecosystem is TS. Zero runtime cost. |
| Framework | React 19 + Vite           | Fast builds, modern React               |
| 3D        | Three.js + R3F            | Proven, massive ecosystem               |
| Physics   | @react-three/rapier       | Real rigid body physics = comedy        |
| State     | Zustand                   | Lightweight, proven in prior builds     |
| Backend   | Supabase                  | Auth, DB, storage, realtime for PVP     |
| Styling   | CSS modules               | Scoped, no runtime cost                 |
| Audio     | Howler.js                 | 7KB, spatial audio, sprites, mobile-ready|
| Payments  | Stripe (PWA)              | Keep ~94% revenue vs ~70% app stores    |

### Visual Quality (port from ToySoldiers-two)
- Plastic-sheen materials (roughness 0.35, metalness 0)
- Military color palette (army green, olive, khaki, sand brown)
- Hierarchical skeletal soldier models (20+ mesh pieces, pose blending)
- Three-point lighting + ambient + soft shadows
- Post-processing bloom (subtle)
- ACESFilmic tone mapping

---

## AUDIO

Built in from Phase 1. Not bolted on later.

**Library:** Howler.js (7KB, MIT, audio sprites, spatial, mobile-ready)

**SFX sources (CC0 / royalty-free, no attribution):**
Sonniss GDC, Kenney, Mixkit, Freesound USC, Tallbeard Studios.
CC0-only policy. Track in LICENSES.md.

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

---

## REVISED BUILD SEQUENCE

### NEXT UP: Loadout Screen + Training Integration
1. Port rosterStore from solder-four (soldier profiles, skills, weapons)
2. Build LoadoutScreen UI (Enlisted-style, full spec above)
3. Build SoldierPreview component (3D model, rotatable, weapon swap)
4. Integrate training (tap TRAIN -> neuroevolution arena -> skill unlock)
5. Wire DEPLOY button to placement phase with configured soldiers
6. Redesign placement tray to show roster soldiers (not unit types)

### THEN: Battle Phase
7. Port defense models (walls, sandbags, towers) from solder-four
8. Enemy spawning from wave config
9. Soldier combat AI (targeting, firing, projectiles)
10. Damage system + death + ragdoll physics
11. Win/lose detection
12. Victory/defeat result screen

### THEN: Polish
13. Audio system (Howler.js + SFX)
14. Post-processing (bloom + vignette)
15. Game feel (screen shake, particles, spring animations)
16. Ghost preview for placement
17. Map/level select screen

---

## WHAT WE ARE NOT BUILDING

- Base building (too confusing, proven across 3 versions)
- Real-time PVP in MVP
- Tutorial systems (the game teaches through play)
- Settings/account pages
- Any screen that looks like a web app
- Native app wrappers (PWA first)
- More than 3 enemy types in MVP
- More than 3 map themes in MVP

---

## PERFORMANCE TARGETS

- 60fps on mid-tier mobile (iPhone 12 / Pixel 6)
- <3 second initial load
- <100ms input latency
- Max 50 Rapier physics bodies per scene
- Max 30 soldiers on screen
- Max 50 draw calls on mobile (instanced meshes)
- Bundle size <2MB
- DPR capped at 2

---

*Last updated: 2026-04-02 (evening session)*
