# TOY SOLDIERS -- GAMEPLAN

This is the production build. Every line of code serves the game.

---

## PHASE 1 SCOPE (build this first, nothing else)

One level. Playable end to end. Fun or we don't move on.

1. Project scaffolding (Vite + React 19 + R3F + Rapier + Zustand + TypeScript)
2. One soldier model with idle/walk/fire/death + ragdoll physics
3. One Sandbox level with terrain props + fixed placement slots
4. Placement phase: drag soldiers from bottom tray to slots
5. Battle phase: soldiers fight, Rapier physics, projectiles, sound
6. Physics comedy: ragdolls, falling off edges, wall destruction
7. Victory/defeat splash with stars + gold earned
8. HUD: gold counter, compute counter, wave indicator
9. Audio: Howler.js with initial SFX (gunfire, explosions, impacts, comedy)
10. Runs at 60fps on mobile. Feels like a game, not a web app.

**The only question that matters: "Is this fun?"**

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
  --> PLACE (drag soldiers + defenses onto the battlefield)
    --> BATTLE (watch it play out -- physics chaos)
      --> RESULTS (gold, stars, injuries)
        --> ROSTER (train skills with compute, heal with gold)
          --> MAP (next level)
```

Each level is a hand-crafted puzzle. Right soldiers, right skills,
right positions. Brute force doesn't work past early levels.

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

**Phase 1 economy:** A compute counter and a gold counter on the HUD.
That's it. No shop, no purchases, no streak system. Just the numbers.

---

## SCREENS (5 total, zero dashboard energy)

### 1. MAP -- Level Select
- Full-screen themed map. Level nodes are physical objects (toy flags,
  mini battlefields). Stars on completed. Padlocks on locked.
- Tap a node for enemy preview. Star-gated world progression.

### 2. BATTLE -- Core Gameplay (80% of the game)
- **PLACEMENT:** Battlefield fills screen. Bottom tray holds soldiers
  (like a toy box drawer). Drag to fixed slots. "GO" when ready.
- **COMBAT:** Full-screen 3D. Minimal HUD. Physics comedy. Camera
  follows action.
- **RESULT:** Stars, gold, injuries. Single "CONTINUE" button.

### 3. ROSTER -- Bottom Sheet (not a page)
- Slides up over current screen with spring animation.
- 3D soldier figures in a row. Tap to expand stats/skills.
- "TRAIN" button per soldier. Swipe to scroll.

### 4. TRAINING -- Camera Zoom (not a page)
- Camera flies into training arena.
- Watch neuroevolution in real-time. Progress ring. Milestones.
- "SKILL UNLOCKED" graduation. Soldier poses with new weapon.

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

## MOBILE UX SPEC

This game lives or dies on mobile feel. These are implementation
requirements, not suggestions.

### Orientation: Portrait
- Battlefield fills top ~70% of screen
- Unit tray sits in bottom ~20-25%
- HUD strip across top ~48-56px
- Matches the Clash Royale model: one-hand play, no rotation required
- Desktop: centered viewport, same layout, mouse replaces touch

### Touch Interactions
- **Placement:** Tap unit in tray, drag onto field. Ghost preview
  appears offset 60px ABOVE touch point (so finger doesn't occlude it).
  Valid slots glow green, invalid glow red. Lift finger to place.
- **All touch targets:** Minimum 48px (Google Material guideline).
  Space interactive elements 8px+ apart.
- **Canvas:** `touch-action: none` to prevent browser scroll/zoom.
  Use pointer events (not touch events) for cross-device compatibility.
- **Expensive placements:** Two-step confirm (drag + confirm button)
  to prevent mis-taps.

### Viewport & Safe Areas
```css
/* Always use small viewport height -- stable, no address bar jumps */
height: 100svh;

/* Handle notch/island on all edges */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
The 3D canvas extends under the notch (looks better). HUD elements
and interactive targets must stay inside safe areas.

### Responsive Breakpoints
| Breakpoint | Target             | Changes                              |
|------------|--------------------|--------------------------------------|
| < 380px    | iPhone SE, small   | Smallest HUD, single-row tray        |
| 380-480px  | Standard phones    | Default mobile layout                |
| 480-768px  | Large phones/small tablets | Slightly larger HUD, 2-row tray option |
| 768-1024px | Tablets            | More battlefield visible, larger cards|
| 1024px+    | Desktop            | Mouse, hover states, keyboard shortcuts|

What scales: canvas, camera frustum, spacing.
What stays fixed: touch targets (48px), font minimums (14px body),
icon sizes (24-32px), HUD bar height (48-56px).

### 3D Performance on Mobile
```tsx
<Canvas
  dpr={[1, 2]}
  gl={{ antialias: false, powerPreference: 'high-performance' }}
>
```
- Cap DPR at 2 (phones with DPR 3-4 render 9-16x more pixels otherwise)
- Disable MSAA, use FXAA post-process if needed (cheaper)
- Shadow maps: 512-1024 on mobile, 2048 on desktop
- Max 50 draw calls on mobile (use instanced meshes for soldiers)
- Use drei `<PerformanceMonitor>` to auto-downgrade DPR when FPS drops
- ONE canvas only (iOS limits WebGL contexts per page)
- Handle `webglcontextlost` event (iOS 17+ aggressively kills contexts
  when tab is backgrounded)

### Game Feel (cheap wins, massive impact)
- **Screen shake on explosions:** Random camera offset decaying over
  200ms. 3-5 diminishing offsets.
- **Scale bounce on tap:** Press to 0.92 over 50ms, spring to 1.0 over
  150ms. `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Number pop on resource change:** Tween displayed value over 300ms.
  Flash counter 1.2x scale + color highlight for 200ms.
- **Particle burst on death:** 8-12 small pieces, outward with gravity,
  fade over 400ms.
- **Spring easing on ALL panel animations:** Entry 300ms with overshoot.
  Exit 200ms ease-out. Never linear. Never `transition: all`.
- **Only animate `transform` and `opacity`** for 60fps panel animations.

### Panel Design (game-feel, not web-feel)
- No drag handles. No rounded corners. No frosted glass. These scream
  "iOS bottom sheet."
- Use opaque themed backgrounds (wood texture, metal plate, canvas).
- Spring physics animation (overshoot/bounce), not ease-in-out.
- Info panels: 60-70% screen height, game visible behind dark scrim.
- During combat: persistent tray covers max 20% of screen.
- Dismiss: swipe-down or explicit close button. Never tap-on-scrim.

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
- **Fixed placement slots** per level (foxholes, crate tops, elevated
  spots). NOT freeform. This makes each level a placement puzzle.
- **Unit restriction per level** -- forces varied strategies, like
  Angry Birds restricting which birds you get.
- **Teach-test-twist** for new mechanics: introduce in isolation, mix
  with existing threats, then combine unexpectedly.
- **Sawtooth difficulty** -- spike, dip, rise, breather. Never linear.
  Target 3.2 average attempts per level. Max 5-7 for any single level.

### MVP Enemy Types (3 only -- expand later)

| Type     | Behavior                | Countered by          |
|----------|-------------------------|-----------------------|
| Infantry | Walks, shoots, swarms   | Splash/area damage    |
| Jeep     | Fast, flanks            | Blocking units, mines |
| Tank     | Armored, heavy damage   | Rockets, heavy weapons|

Future (Phase 5): shielded, stealth, flying. NOT in MVP.

### Three-Star System

| Star | Criteria                                      |
|------|-----------------------------------------------|
| 1    | Complete the level (survive)                  |
| 2    | Complete with budget remaining (efficiency)   |
| 3    | Level-specific bonus objective (mastery)      |

Star-gated world progression: need X total stars to unlock next world.

### Level Config (JSON-driven, zero code changes for new levels)
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
    { "delay": 0, "enemies": [{ "type": "infantry", "count": 5, "path": "main" }] },
    { "delay": 8, "enemies": [
      { "type": "infantry", "count": 3, "path": "main" },
      { "type": "jeep", "count": 1, "path": "flank" }
    ]}
  ],
  "available_units": ["rifle_soldier", "sandbag"],
  "budget": 500,
  "stars": {
    "one": { "type": "survive" },
    "two": { "type": "budget_remaining", "threshold": 200 },
    "three": { "type": "objective", "desc": "No soldiers lost" }
  }
}
```

---

## MAP THEMES

| World | Theme         | Levels | Props                              |
|-------|---------------|--------|------------------------------------|
| 1     | THE SANDBOX   | 1-8    | Buckets, shovels, pebbles, sticks  |
| 2     | KITCHEN TABLE | 9-16   | Salt shakers, napkins, spoons, mugs|
| 3     | BEDROOM FLOOR | 17-25  | Books, toy blocks, shoes, rulers   |

**MVP: 25 levels across 3 themes.** Expand to 5 themes / 50 levels in
Phase 5 once retention is validated.

Visual variety per world: palette swap, time-of-day lighting, weather
overlays (screen-space), prop permutation, camera angle variation.
Minimal new geometry per world.

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
- Plastic-sheen materials (MeshStandardMaterial, roughness 0.35, metalness 0)
- Military color palette (army green, olive, khaki, sand brown)
- Hierarchical skeletal soldier models (20+ mesh pieces, pose blending)
- Three-point lighting + ambient + soft shadows (PCFSoftShadowMap)
- Post-processing bloom (subtle, UnrealBloomPass at 0.3-0.4 strength)
- ACESFilmic tone mapping

---

## AUDIO

Built in from Phase 1. Not bolted on later.

**Library:** Howler.js (7KB, MIT, audio sprites, spatial, mobile-ready)

**SFX sources (CC0 / royalty-free, no attribution):**
Sonniss GDC (weapons, explosions, ambience), Kenney (impacts, UI),
Mixkit (comedy physics), Freesound USC release (Wilhelm scream),
Tallbeard Studios (music loops). CC0-only policy. Track sources in
LICENSES.md.

See full details in audio/ directory once implemented.

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

**Key decisions:**
- Levels are data (JSON), not code
- Training scenarios are pluggable (new weapon = new scenario file)
- Engine has zero rendering deps (enables headless replay + PVP validation)
- 3D models are procedural (no GLTF/GLB, tiny bundle, instant load)
- Audio from day one (every collision, shot, and tap has sound)

---

## MVP DELIVERABLES

### PHASE 1 -- The Vertical Slice
(See "Phase 1 Scope" at top of this document)
**Gate: "Is this fun?"**

### PHASE 2 -- The Training Loop
- Roster bottom sheet (3D figures, swipe, tap to expand)
- Training arena with neuroevolution (port from solder-four)
- Weapon skill graduation flow
- Compute: daily free claim, spend on training
- Gold: earn from battles, spend on recruit/heal/blueprints
- Shop bottom sheet (compute packs, daily claim)
- 3-5 more Sandbox levels requiring trained skills
- **Gate: "Does compute create desire?"**

### PHASE 3 -- The Campaign
- Map screen with level nodes + star gating
- 3 themes, 25 levels total
- Difficulty curve tuning (sawtooth)
- Unit restriction per level
- **Gate: "Do players come back daily?"**

### PHASE 4 -- Production Polish
- Supabase auth + cloud save
- Stripe purchases + Battle Pass + contextual offers
- Analytics (retention, compute spend, level completion)
- Full audio pass (spatial, music, all SFX)
- Performance optimization (60fps mobile)
- Onboarding (first 3 levels teach everything through play)
- **Gate: Soft launch ready.**

### PHASE 5 -- Growth
- PVP async raids
- 2 more map themes (Workbench, Backyard) + 25 more levels
- New weapons + soldier classes + enemy types (shielded, stealth, flying)
- Social: friends, replays, sharing ("friend slop" viral version)
- Seasonal content + events

---

## WHAT WE ARE NOT BUILDING

- Base building (too confusing, proven across 3 versions)
- Real-time PVP in MVP
- Tutorial systems (the game teaches through play)
- Settings/account pages
- Any screen that looks like a web app
- Freeform placement (fixed slots only)
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

*Last updated: 2026-04-02*
