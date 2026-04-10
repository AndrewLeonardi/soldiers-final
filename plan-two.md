# plan-two.md — The Clean Vision

**Created 2026-04-10. Supersedes `plan.md`.**

`plan.md` is preserved as the historical record for the scrapped `/game-concept` build. Do not edit it. This document is the single source of truth going forward.

This file follows plan.md's bedrock rule: **additions only, do not overwrite, do not delete**. New work is appended. Old entries stay as history.

---

## The game in one sentence

**A toy-soldier mobile base-defense game where you pay compute to literally train your plastic army's neural-network brains, watch them learn on a Clash-style timer, and send them to raid procedural enemy bases where no two battles play out the same.**

Clash of Clans-style base. Destructible everything. Player vs AI bot only (no PvP in v1). Training is not a separate screen — but it's also not wallpaper. Training is a **commit-and-watch loop**: you pick a soldier, you spend compute, a timer starts, the spectacle plays out on your base, you can boost it with more compute, and at the end you have a measurably smarter soldier you personally invested in. Compute is the literal substrate of the game and the entire business model. The neural networks are the star, not the subtext.

---

## Why we pivoted

`/game-concept` shipped every ticket and still felt like nothing. The root cause was decomposition disease: Phase 1a → 1b → 2a → 3a steps 1-8 optimized for closing tickets instead of landing emotional moments. By the end neither Andrew nor Claude could state what the game *did*. Technically functional, emotionally inert.

The fix is not more process. The fix is **four epic sprints**, each with one sentence for its end state and one player-facing emotional moment for its success criterion. No sprint may decompose into "phase N step M" headers inside plan-two.md. Internal todo lists are fine inside a sprint; they are not fine here.

Full post-mortem at the bottom of this file.

---

## What we inherit and what we scrap

**Engine baseline — `/physics-test` (`src/pages/PhysicsTest.tsx`).** Andrew's exact words: "by FAR the closest version of the engine." The `DestructibleDefense` system (`src/three/models/Defenses.tsx:435-681`) — block-based walls, cascade collapse on integrity drop, row-staggered debris physics — is the strongest thing in the repo. Keep it verbatim. Every base element in v1 must be a `DestructibleDefense` variant from day one. No HP-bar buildings, ever.

**UX baseline — `/play` route.** Andrew: "/play is actually pretty good, it's just missing the base component." Port forward the compute economy (`src/config/store.ts:10-20` — 5 IAP tiers, 50/day drip, 3-day backfill, 500 starter), the beveled mobile-game button pattern (`src/styles/game-ui.css:114-318` — `inset` shadow highlights, `border-bottom: 4px`, `scale(0.92) translateY(2px)` on press, spring easing), the weapon-specific pose system (`src/scenes/TrainingScene.tsx:124-199`), the 1x/10x/50x speed toggle, and the sparkline + milestone celebration + graduation banner UX. Use the compute numbers as-is. Don't reinvent economics.

**Visual DNA — harvested from the previous repos (inspiration only, zero code).** `ToySoldiersThree`'s procedural toy soldier + wander FSM + selection ring + elastic bounce + drag-safe click is the aesthetic target for ambient base life. Rebuild the geometry; copy the feel. `ToySoldiersTwo`'s 25-soldier rtNEAT training spectacle — HP rings on the ground, muzzle flashes via `PointLight(0xffaa33,...)`, bloom on the muzzle, line-geometry tracers, fog — is the training-camp visual target. The `AnimationController` damped-spring smoothing trick (raw net outputs → skeletal pose via a debouncer) is the single most important harvestable idea from V2 and must be re-implemented in sprint 2.

**Scrapped wholesale.**
- `/game-concept`'s compute system — replaced by `/play`'s verbatim.
- `BaseScene.tsx` as a starting point — we start from `/physics-test`'s scene composition instead.
- `TrainingGroundsInterior.tsx` (already deleted in working tree) and any "tap building to enter a side room" UX — training must happen on the base surface.
- The `PHASE_3A_SLOT_ID` single-slot hack in `TrainingGrounds.tsx` — replaced by a live fitness GA driving 25 visible trainees.
- Hand-rolled PPO from V2 — the library NEAT / fixed-topology GA path is the proven one.
- Dashboard-as-base (the V2 failure mode) — every menu must be a slide-up sheet over the base canvas; the base is always visible behind the UI.
- "Training as a separate page" (the V2 and V3 failure mode) — zero tolerance.

---

## The two non-negotiables (the foundation must serve these or it's wrong)

Every sprint, every feature, every cut must be measured against these two. If a decision doesn't pass both, it doesn't ship.

**1. Compute must feel valuable, and the ML must be literally real. The whole business is selling it.**

`/play` already proved the compute lever works — its store is the cleanest part of the existing repo and the visual treatment of compute as a premium currency is right. Compute in v1 must:

- **Be literally real machine learning, not a metaphor.** Every compute spend triggers an actual GA training run on the actual neural network of the actual soldier the player committed. No fake progress bars. No scripted "learning" cutscenes. The ML is the substrate AND the on-screen show. Live brain viz on the camp, on the roster, on the soldier sheet, during raids.
- **Be tiered by power, not by quantity alone.** This is the most important monetization decision in the doc and Andrew's binding feedback as of this revision: there is no "skip" button. There is **"use more powerful compute."** The boost mechanic is not magical time-compression; it is literally buying a faster training substrate. Tier 1 compute = 1× sim speed. Tier 2 = 4×. Tier 3 = 16×. Tier 4 = 64×. The player isn't skipping the training, they're upgrading the GPU. This framing is true to the ML reality, true to the business model, and true to the game's whole pitch. Premium compute is premium hardware.
- **Have its own visual language:** electric-cyan particles, GPU-fan-whoosh SFX on gain and spend, animated counter that springs+sparkles on every change, never static. Higher-tier compute has more intense particles (cyan → white-hot at tier 4) so the player can SEE which compute they're spending.
- **Have its own ceremonies:** starting a training run triggers a brief full-screen "training ceremony" — loss curves spool up, soldier silhouette materializes, the literal network topology renders, then the camera drops back into the base view with the camp now active. Genshin/Hearthstone-grade premium-currency treatment.
- **Have a dedicated physical home in the base:** the Training Camp is the compute building. Tap it = full compute UX (queue, in-progress runs, tier selector, store shortcut).
- **Be spent at multiple visible moments:** starting a training run (base cost), upgrading the compute tier on an active run (the "boost"), unlocking a new weapon for training (one-time), instant-healing a wounded soldier (after sprint 4). The player should have at least 4 distinct reasons to spend compute by sprint 4 and feel each one is worth it.
- **Have a store shelf that copies `/play`'s tier layout** but adds the tier-of-compute axis: the store has both "more compute" packs and "better compute" tier upgrades. "BEST VALUE" badge on one mid-tier bundle. Contextual "not enough compute — buy more?" modals. Daily drip with 3-day backfill. Starter packs that appear on milestone events.

**2. Battles must be fun and unpredictable. Ten random users running raid #1 must see ten different battles.**

A repetitive raid loop kills the game in week one. Variance must be designed in from the foundation, not bolted on. Sprint 4 must hit at least four independent dimensions of variance per raid:
- **Procedural bot bases.** Layout, block count, base orientation, defender placement randomized per raid.
- **Soldier composition.** Player picks 4 of N from their roster; each soldier has a different weapon, different fitness, different individual brain.
- **Real ML divergence.** Two soldiers trained on the same weapon will have measurably different brains because GA runs are stochastic. Same loadout, different fight. This is the moat — no other mobile base-defense game can do this honestly.
- **Biome + objective.** 3-4 base biomes (forest/desert/urban/snow) with distinct cover and palette. Plus rotating objectives layered on the same base ("destroy HQ" / "no losses" / "3-star time trial").

Test: if I plant ten fresh installs in front of ten people and they all play their first raid, the resulting fight cinematics should be visibly different. Same base layout twice in ten attempts is a bug.

---

## Non-goals for v1

We only get to say no once. These are the noes.

- **No PvP.** Only player vs AI bot. Full stop.
- **No base builder beyond placement.** MVP base elements are walls, towers, barbed wire. That is the entire catalogue. Andrew literally said "Maybe that's literally it for our initial version." No upgrades, no tiers, no gold mines, no resource generators.
- **No fictional framing of the neural nets, AND no hiding them.** ML is literal — never wrap it in "the AI is learning to be brave" narrative dialogue. AND it must be on-screen constantly: live brain viz on the camp, live brain viz in the roster sheet, live brain viz on the soldier you tap. Show the substrate; don't pretend it's something else and don't pretend it isn't there. See `feedback_ml_is_real.md`.
- **No always-on wallpaper training.** Training is a commit-and-watch loop with a timer, not a background drain. The player must actively choose to train a specific soldier on a specific weapon and see the cost. Always-on training kills the business model because no decision = no purchase.
- **No web-app UI.** Every screen is a mobile game. No tables, no dashboards, no sidebars. Hard cap of 5-6 persistent buttons on the main base screen. Everything else is behind a tap on a 3D building. See `feedback_no_dashboards.md`.
- **No "minimum viable weapon."** Every weapon ships with the full Call of Duty polish checklist or it doesn't ship. See `feedback_weapons_call_of_duty_polish.md`.
- **No soldier classes.** Soldiers are differentiated by which weapon they trained on and what their trained brain learned. Emergent, not hand-tuned.
- **No upgrades tree, no XP, no battle pass, no clan system, no friends list, no social graph.** None of these are in the v1 loop.
- **No pre-simulated battles replayed cinematically.** Raids run the trained brains live — the player needs to see their specific soldier's specific brain making specific decisions. Honesty is the moat.
- **No timer on free/cheap training.** The Supercell COC update that *removed* training timers entirely is the cautionary tale: every-troop timers killed the loop. Rifle training in v1 is fast or instant. Premium weapons (rocket/grenade/MG/tank) are the timer-gated, compute-monetizable training. Gate the rare thing, not the basic thing.

---

# The four epic sprints

Each sprint lands a single emotional moment. If the moment doesn't land, the sprint isn't done, no matter how many tickets closed.

---

## Sprint 1 — *A place, not a dashboard*

**The bet:** Six subsystems, all binary, all testable. If we can't check every box, sprint 1 isn't done. If we can, every later sprint inherits a foundation that already feels like a game.

**End state in one sentence:** Loading the game drops you into an orbitable 3D toy-soldier base with destructible walls, towers, and barbed wire, six to ten plastic soldiers wandering inside it, ambient camp audio, a beveled compute counter ticking in the corner, and zero web-app DNA anywhere on screen.

**Emotional moment:** Player launches the build, sees the toy-soldier boot screen, hears a soft camp ambience kick in, and lands on the diorama. Tiny green plastic men walk between sandbag walls. One scratches his helmet, picks a new spot, walks there. The compute counter in the corner softly counts up. Player doesn't touch anything. First thought: *"Oh. This is a place."*

**Success test (the only one that matters):** Andrew opens the build on desktop, orbits the camera, watches one full idle→walk→arrive loop, hears the ambience, sees the counter tick, fires a test grenade at a tower and watches it cascade-collapse, and says "yes, that's a toy army." If he doesn't say that, sprint 1 isn't done.

### Subsystem 1 — Scene foundation

The diorama itself. Composition lifted from `/physics-test`, NOT from `BaseScene.tsx`.

- [ ] New route mounts a fresh scene composition that takes its lighting rig, ground plane, sky/fog values, and shadow setup directly from `src/pages/PhysicsTest.tsx`. No imports from `BaseScene.tsx`.
- [ ] Camera is `OrbitControls` constrained to a useful angle range (no underground views, no flipping). Mobile pinch tuning is explicitly deferred to sprint 3 — desktop trackpad / mouse only for sprint 1.
- [ ] Ground is a single textured plane sized to the locked camp footprint constant (`BASE_HALF`). No procedural terrain.
- [ ] One global lighting rig file (`@three/lighting/CampLighting.tsx`) — every later sprint imports it instead of redefining.

### Subsystem 2 — Destructible base elements

The foundational promise: every base element is destructible from day one.

- [ ] `DestructibleDefense` extended with two new styles: `tower` (~20 lines, taller block stack with corner geometry) and `barbedWire` (~15 lines, low coiled-block geometry that collapses sideways instead of crumbling down). `wall` is unchanged.
- [ ] One starter base layout is hardcoded: perimeter of walls, two corner towers, one stretch of barbed wire, and a clearly-readable training-camp footprint (flat sandy patch + wooden posts marking the corners — no interactive contents yet).
- [ ] A dev-only "test grenade" key (`G`) drops a physics impulse at the camera target so we can verify destructibility on every element type without waiting for sprint 4. Gated to dev builds only.
- [ ] Cascade collapse, debris physics, and static-collider removal all work for tower and barbedWire identically to wall. Verified by the test grenade.

### Subsystem 3 — Toy soldiers + wander brain

The thing that makes the diorama feel alive.

- [ ] One procedural toy-soldier model file (`@three/models/ToySoldier.tsx`), built from boxes/capsules, no `.glb` / `.fbx`. Single shared green material.
- [ ] `SoldierBrain` wander FSM: `idle (1-3s) → pickTarget inside BASE_HALF → walk → arrive → idle`. No combat hooks, no training hooks. Pure ambient.
- [ ] 6-10 soldiers spawn inside the camp footprint at boot. Each runs its own FSM independently. No two soldiers visibly sync.
- [ ] Selection pattern from V3 is in: invisible enlarged click hitbox, drag-safe click (>6px move = ignore), selection ring, hover scale, face-camera-on-select. Clicking a soldier selects him; clicking the ground deselects.
- [ ] Selected soldier shows a name tag only ("Pvt. Henson"). No sheet, no actions. Sprint 2 fills it in.

### Subsystem 4 — App shell + persistence

Locking the patterns every later sprint will inherit. Cheap to do now, expensive to retrofit.

- [ ] App-boot screen: toy-soldier silhouette + game name + 1-second hold + crossfade into the diorama. Not a spinner. Not a "Loading…" string.
- [ ] Zustand stores split by lifetime from day one: `useGameStore` (persisted), `useSceneStore` (ephemeral). Persistence uses a versioned migration shim (`version: 1`, `migrate()` stub that just returns state) — even though we have nothing to migrate yet, the shape is locked so sprint 2's training data doesn't force a save-wipe.
- [ ] All config objects are `deepFreeze`'d at module load (V3 pattern).
- [ ] Settings sheet stub: a gear icon in the corner opens an empty bottom sheet with one toggle (mute) and a version string. Three lines of UI but it locks the bottom-sheet pattern for sprint 2's training sheet.
- [ ] Path aliases working: `@game/*`, `@engine/*`, `@three/*`, `@stores/*`, `@ui/*`, `@config/*`, `@audio/*`. Verified by at least one import from each.

### Subsystem 5 — Mobile-game look-and-feel pass

The audit said we were underspending on this. It moves from sprint 3 to sprint 1 because every later sprint will inherit it. **Cutting this for time defeats the entire foundation argument.**

- [ ] One global CSS file (`src/styles/game-ui.css`) with the beveled mobile-game button pattern from `/play` locked in: `inset 0 1px 0 rgba(255,255,255,0.15)` highlights, `border-bottom: 4px` shadow lip, `scale(0.92) translateY(2px)` press state, spring easing. Settings gear and compute counter both use it.
- [ ] Compute counter is a beveled chip in the top-right corner showing the persisted `compute` value from `useGameStore` (starting at 500, hardcoded). Counter uses an animated tween — when the value changes, it lerps over ~300ms instead of snapping. Even though nothing changes the value yet, the animation pattern is locked for sprint 2.
- [ ] Ambient base audio bed: one looping low-volume camp ambience track (light wind + distant chatter). Plays from boot. Mute toggle in settings cuts it. Audio system is `@audio/AudioBed.tsx` and loads through a single audio context — sprint 3 weapon SFX will hang off the same context.
- [ ] Zero web-app aesthetics anywhere on screen. No flat rectangles, no system fonts in chrome, no underlined links, no dashboard cards. If it looks like Stripe or Linear, it doesn't ship.

### Subsystem 6 — Playtest capture

The artifact that proves sprint 1 happened. This becomes the per-sprint ritual.

- [ ] A 30-60 second screen capture of the running build is committed to `playtests/sprint-1.mp4`. Shows: boot screen → diorama → orbit camera → soldier wander loop → test grenade demolishing a tower. Every future sprint compares against this to ask "did we drift?"

### What sprint 1 will explicitly NOT ship

No training, no GA, no neural network anything (sprint 2 owns this). No combat, no weapon fire (the test grenade is a dev tool, not a player feature). No bot bases, no raids, no menus beyond the settings stub. No mobile pinch / mobile camera tuning — desktop-first development for sprint 1. No store, no IAP, no compute earning/spending. No editable base placement; layout is hardcoded.

### Sprint 1 trip-wires

- If subsystem 5 (look-and-feel pass) gets cut for time, **sprint 1 is not done.** The whole point of moving it forward from sprint 3 is that later sprints inherit it. Cutting it defeats the audit.
- If we find ourselves writing a `BaseScene.tsx`-style file, stop. The pivot says start from `/physics-test`'s composition.
- If the subsystem count goes above 6, we're scope-creeping. Cut, don't add.
- If anyone says "we can polish the bevel later," that's the same disease that killed `/game-concept`. The bevel ships in sprint 1 or the foundation isn't a foundation.

---

## Sprint 2 — *Commit a soldier, watch his brain be born*

**End state in one sentence:** Player taps the Training Camp, picks one of his ambient soldiers from a slide-up sheet, spends compute to start a real GA training run on that specific soldier's neural network, watches a live 25-population spectacle play out on the camp with a Clash-style timer ring overhead, optionally upgrades the compute tier mid-run to make the GA literally run faster, and at the end watches the trained soldier walk off the pad with a measurably better brain that shows up in his roster.

**Emotional moment:** Player commits *Private Henson* to rifle training. A short ceremony plays — loss curve spools up, the topology of his brain renders for a beat, then the camera drops back to the base. On the camp, 25 ghost copies of Henson appear and start training. The player watches him whiff for thirty seconds, glances at the timer ring, taps the camp, and bumps his compute tier from 1× to 4× — *"I want to see this faster."* Time speeds up visibly, the GA churns, milestone banner pops *"FIRST KILL — Henson figured out shooting!"*, the timer hits zero, the 25 ghosts collapse into one opaque Henson with a freshly-trained brain who walks back into the ambient platoon. The player can pick him out by name in his roster. He bought the brain that exists in that soldier's head with real money's worth of compute, and he watched it happen.

**What must be true by the end (6 subsystems):**

### Subsystem 1 — Training Camp building + commit UX

- [ ] **The Training Camp is the compute building.** A 3D building on the base map, world-space progress ring above it, tappable. Not a HUD widget. Not a screen. A place. COC barracks-in-world pattern.
- [ ] **Commit-to-train slide-up sheet.** Tapping the camp → bottom sheet: empty training slot, "+ TRAIN A SOLDIER" button, current-cohort panel if a run is active. Tap "+" → roster picker → weapon picker (rifle only in sprint 2) → START button showing compute cost and tier duration. Tapping START runs the ceremony and kicks off the GA.
- [ ] **One training slot in sprint 2.** Single-track. Slot expansion is a sprint 3 problem.
- [ ] **Empty-state when no run is active.** No ghosts, no shooting, no spectacle. A small "+TRAIN" prompt floats over the camp. The empty camp is the call-to-action.

### Subsystem 2 — Real GA engine + compute tiers

- [ ] **Real GA, not a fake timer.** Fixed-topology GA on the committed soldier's brain — 25 population, tournament selection k=3, Gaussian mutation, no speciation. Network shape `[~12, 8, 8]` (expanded for tactical verbs from day one — see *Soldier tactics* design note). Fitness = accuracy + target hits + survival. The 25-pop is framed honestly: "your soldier trains against 24 simulated copies of himself, and the strongest version is what you keep."
- [ ] **Compute tiers as the boost mechanic.** No "skip" — ever. Camp sheet has a tier selector: Tier 1 standard (1×, base cost), Tier 2 performance (4×, 4× cost), Tier 3 pro (16×, 16× cost), Tier 4 beast (64×, 64× cost). The sim loop multiplier is real. Higher-tier particles go cyan → white-hot. **Binding for the rest of v1.**
- [ ] **Tactical action verbs in the network from day one.** Rather than `[move, aim, fire]` outputs, the network ships sprint 2 with the full 4-verb action vocabulary (TAKE COVER, CALL FOCUS, FLANK, SUPPRESS) so we don't retrain everything in sprint 4.

### Subsystem 3 — Training spectacle (the thing the player watches)

- [ ] **The ghost-plus-best trick.** 25 trainees render on the camp; 24 at opacity 0.18, fitness champion at opacity 1.0 and scale 1.15. Harvested from V3.
- [ ] **AnimationController damped-spring smoothing.** Raw net outputs → spring/state-machine debouncer → bone transforms. **Non-negotiable.** Without this, nets look like seizures.
- [ ] **Shooting targets as destructible props.** Three wooden target stands, each a `DestructibleDefense` variant. Trainees shoot them, they shatter, they reset on a 2-second timer. Mechanically honest.
- [ ] **Milestone callouts.** Sliding banners at fitness thresholds: *"FIRST HIT," "FIRST KILL," "10 IN A ROW," "FOUND COVER."* Named, slides in from left, holds 3s, slides out. Never blocks the base view.
- [ ] **World-space timer ring.** 3D progress ring above the camp, readable from default camera. Color-coded to active tier (cyan / blue / violet / white-hot).
- [ ] **Tiny live neural-net viz.** Small node/edge diagram next to the camp showing the best brain's live weights, updated every generation. Vibe anchor.

### Subsystem 4 — Rifle weapon-feel polish

- [ ] **Full CoD checklist on the rifle.** Visible recoil, oversized bloom muzzle flash, screen shake (distance-scaled), hit-pause on target impact, layered synth audio (low body + high snap), tracer line, ejected casing, dust/debris on hit. If the rifle doesn't feel like it in sprint 2, no other weapon ships.

### Subsystem 5 — Ceremonies + roster integration

- [ ] **Training ceremony on run start AND completion.** Start: loss curve spools up, network topology renders, particles, drop back to base. Completion: final fitness, "+1 trained Rifleman: Pvt. Henson," ghost-best collapses into one. Both <2 seconds, skippable on tap.
- [ ] **Trained-soldier walk-out → roster integration.** Timer ends → cohort dissolves → trained soldier walks off the camp into the wander FSM platoon. Carries his real `FixedNet` weights in the persistent Zustand store. Tap him later → see actual weights and fitness.

### Subsystem 6 — Compute spend physicality

- [ ] **Compute spend = animated counter + GPU-whoosh SFX + particle burst.** Every compute transaction (commit run, tier upgrade) animates the counter (spring tween), plays the GPU-whoosh, and emits a particle burst from the counter to the camp. Compute never silently decrements.

**Success test:** Andrew commits one soldier to training, watches the run play out without skipping, optionally bumps the compute tier mid-run, sees the timer ring fill, and at the end says *"I just paid to train that specific guy and I can see he's smarter."* The whole sprint passes only if Andrew can identify the trained soldier in his roster after the run and recognize him as different from his untrained brothers.

**What we explicitly will not do in sprint 2:** no other weapons besides the rifle, no full roster UI (sprint 3), no IAP store (sprint 3), no enemy bots, no bot bases, no attack mode, no parallel training slots, no tutorial flow. Sprint 2 is the loop's beating heart in its smallest possible form — one soldier, one weapon, one slot, one compute tier system, one real GA per run.

---

## Sprint 3 — *A store, a roster, and a compute economy that sells*

**End state in one sentence:** A full mobile-game economy wraps Sprint 2's training loop — a tiered compute store with starter packs and daily drips, a weapon carousel that unlocks rocket/grenade/MG/tank training, parallel training slots you can buy, and a roster sheet where every soldier's actual neural network is on display — all in beveled mobile-game UI with the base always visible behind.

**Emotional moment:** Player taps the Training Camp. Slide-up sheet springs in. Player picks Pvt. Davies, swipes the weapon carousel from rifle to rocket, sees "ROCKET UNLOCK: 100 compute" — taps it, hears the GPU-whoosh, watches his compute counter spring down with a particle trail to the camp. The carousel updates. He picks the rocket. The base behind the sheet now shows Davies kneeling with a freshly-spawned rocket launcher. He starts the run. Then he taps the store icon, scrolls to Tier 3 compute, and buys a pack — not because he had to, because he wanted to see his guy train at white-hot speed. The purchase happened because the value felt earned, not extorted.

**What must be true by the end (6 subsystems):**

### Subsystem 1 — Compute store + economy shell

- [ ] **The full compute store.** Two axes — quantity and tier. Quantity packs (5 tiers, $0.99–$24.99, matching `/play`'s `COMPUTE_PACKS`), "BEST VALUE" badge on mid-tier. Tier upgrades (Standard → Performance → Pro → Beast). Starter pack appears once on reaching 3+ trained soldiers (COC arena-pack pattern). Daily drip claim with 3-day backfill. Contextual "not enough compute — buy more?" modal on underflow.
- [ ] **Store as its own slide-up sheet with tabs.** Offers · Packs · Tiers · Daily · Currency. Offers tab first (COC pattern). Vertical scroll lists with beveled cards. Hero pack at top of Packs.
- [ ] **Gold as the second currency (placeholder).** Gold appears in the HUD and store but earns nothing in sprint 3. Exists so sprint 4 drops raid rewards into a wallet that already has UI. Gold is never purchasable, only earned. gold ≠ compute, they never mix.
- [ ] **Animated currency counters.** Compute (electric-cyan) and gold (amber) at screen top. Both ALWAYS animate on change — spring tween + sparkle trail + SFX. Static numbers are forbidden.

### Subsystem 2 — Main base HUD + 5-button rule

- [ ] **Hard cap of 5 persistent buttons.** TRAIN · ATTACK (dimmed, sprint 4) · STORE · ROSTER · SETTINGS. No hamburger menu. No top tabs. No sidebars. Anything else lives behind a 3D building tap. Supercell "5-6 main screen icons" rule.

### Subsystem 3 — Weapon carousel + unlock gates

- [ ] **Weapon carousel inside the camp sheet.** Rifle (free), Rocket (100 compute), Grenade (100), MG (200), Tank (300) — matching `/play`'s `WEAPON_UNLOCK_COST`. Unlock is one-time per weapon. Locked weapons show a price chip; tapping prompts the store if compute < cost.
- [ ] **Every new weapon ships with full CoD polish.** Rocket: screen-nuking flash + slowmo on impact + chunky low-end audio + massive debris cascade. Grenade: glowing arc + 3-2-1 beep + concussive shake. MG: layered sustained audio + casing hailstorm + cumulative shake. Tank: the biggest everything + rumble bass. Each passes the "eyes closed / audio muted" test — distinguishable both ways.
- [ ] **Weapon-specific trainee poses and sensors.** Port `/play`'s pose system: rocket trooper kneels, grenadier cocks back, MG gunner plants, tank crew rides turret. Each weapon gets its own observation vector but the action vocabulary stays consistent.

### Subsystem 4 — Parallel training slots

- [ ] **Slots 2 and 3 unlock with compute.** Slot 2: 200 compute, Slot 3: 500. Multiple soldiers train simultaneously. World-space timer rings stack vertically — three rings, three colors, three timers. Each slot has its own ghost cohort rendered side-by-side on the camp.

### Subsystem 5 — Roster sheet

- [ ] **Roster slide-up sheet.** Tapping ROSTER (or any ambient soldier) → bottom sheet: name, weapon icon, fitness stars, generations trained, thumbnail neural-net viz. Tap a row → expanded soldier sheet: live full-size brain viz, fitness sparkline, training history, status (idle / training / wounded — wounded in sprint 4). Always slide-up, never full-screen.

### Subsystem 6 — Mobile-game CSS + sheet consistency

- [ ] **Beveled CSS carries through every new sheet.** Sprint 1's `game-ui.css` patterns applied to every sprint 3 surface. Every button beveled, every sheet spring-animated. No web-app tables, no hamburger menus, no sidebars.

**Success test:** Andrew uses the build for a full 5-minute solo session, unlocks at least one new weapon, opens the store sheet, looks at his roster, and at the end says *"this feels like a mobile game"* without being prompted. Bonus pass: Andrew wants to buy a compute pack to see what happens with the higher tier, even though the IAP is stubbed.

**What we explicitly will not do in sprint 3:** no combat, no bot bases, no actual raids, no real IAP integration (visual stubs only — billing comes post-v1), no base editor, no clan/social features. Sprint 3 is the surface area around training; sprint 4 is the payoff.

---

## Sprint 4 — *Attack a bot base*

**End state in one sentence:** Player picks four graduated soldiers, taps ATTACK, gets dropped onto a procedurally-generated enemy bot base built of the same destructible walls/towers/barbed wire, watches their specific trained brains parachute in and assault it live (not replayed, not scripted), and returns with gold and compute rewards that feed back into the training loop.

**Emotional moment:** A rocket trooper the player personally trained lines up on an enemy wall. Player can see it's *their* trooper — same brain, same stance, same specific twitch. The rocket fires with the full weapon-feel polish pass. The wall cascades down block by block via the original `DestructibleDefense` system. Player says out loud: *"I trained that guy."* The training screen and the combat screen were the same screen. The investment in sprint 2-3 cashes out in sprint 4.

**What must be true by the end (6 subsystems):**

### Subsystem 1 — 5-dimensional variance engine

Every raid must hit at least four independent dimensions of randomness so ten random users see ten different battles (the second non-negotiable):

- [ ] **Procedural bot base generator.** 8–15 walls, 2–4 towers, 1–3 wire stretches, HQ in the back third, no defenders inside walls. Difficulty tiers (easy/med/hard) scale block count, block HP, and defender count. Random within constraints.
- [ ] **Biome rotation.** 3 biomes: *Forest Outpost* (stumps), *Desert Garrison* (dunes), *Snow Bunker* (drifts). Each has distinct ground texture, prop set, palette, and one biome-specific cover element.
- [ ] **Soldier composition variance.** Player picks 4 of N from roster. Each brings a different weapon AND a different individually-trained brain.
- [ ] **Real ML divergence.** Two soldiers trained on the same weapon have measurably different `FixedNet` weights (GA is stochastic). This is the moat.
- [ ] **Random objective overlay.** One of three: DESTROY HQ (default), NO LOSSES (3-star bonus if all 4 return), TIME TRIAL (2× compute if won under N seconds). Announced on raid start.
- [ ] **Named raid runs.** Procedurally-generated names: *"Squad Hawthorne (acc 0.71) vs. Bunker Hill 04, Snow."* Player remembers raids by name.

### Subsystem 2 — Raid entry + exit UX

- [ ] **Raid entry sheet.** ATTACK button → slide-up: pick 4 soldiers (tap to select, fitness + weapon visible), see rolled biome and objective, tap LAUNCH. Slide-out transition. No loading screen longer than the transition.
- [ ] **Parachute drop entrance.** Soldiers drop under parachute, land with dust puff, chute falls away. Drop points randomized within a landing zone.
- [ ] **Cascade destruction is the victory visual.** HQ destroyed → camera holds on the collapse for 2s in slight slowmo before results.
- [ ] **Results screen — slide-up sheet.** Gold earned, compute earned, objective bonuses, casualties, "RETURN TO BASE." Animated counters on rewards.

### Subsystem 3 — Live brains in combat + tactical verbs payoff

- [ ] **Live brains, not replays.** Each soldier's `FixedNet` runs live. Each tick: local sensor vector → action (move + aim + fire + tactical verbs) → real-time battle. Defenders use rule-based AI (turrets rotate, infantry patrol). ML on offense only.
- [ ] **Tactical action vocabulary matters.** Soldiers visibly take cover, flank, focus fire, and suppress — decisions emerging from the trained brain, not from a script.
- [ ] **Live brain peek during raids.** Toggleable HUD: selected soldier's live network activations + sensor cone. Off by default, tap to toggle. ML visible when it matters most.

### Subsystem 4 — Full weapon polish in combat

- [ ] **Every shot runs the full CoD checklist.** Hit-pause, screen shake, muzzle flash, audio, tracers, debris. Raid must feel punchier than training, not weaker.
- [ ] **Raid scene = same destructible system.** `DestructibleDefense` for all bot structures. Same block physics, same cascade. Zero new physics code.

### Subsystem 5 — Wounded cooldown + loop closure

- [ ] **Wounded cooldown.** Fatal hit → 4h cooldown. Soldier visible on stretcher near a medic patch. Instant-heal with compute = soft monetization pressure.
- [ ] **The loop is closed.** Raid → earn gold + compute → train / unlock / upgrade / heal → raid again. 30 minutes of play without a dead end, or sprint 4 isn't done.

### Subsystem 6 — First-time-user experience (FTUE)

- [ ] **Raid before build.** First session only: forced 60-second scripted raid. Auto-trained test recruit pre-staged, glowing-finger tutorial taps ATTACK, fixed easy bot base, one rocket fire + one wall collapse, results screen with first gold reward, then land on the base for the first time. **Never says "neural network" in the first 90 seconds.** ML framing unlocks on second session. COC tutorial pattern verbatim.

**Success test (variance):** Andrew runs three raids back-to-back with the same 4-soldier loadout. All three battles must look visibly different — different base layout, different biome, different soldier decisions, different outcome. If two of the three feel similar, variance failed and the sprint isn't done.

**Success test (personalization):** Andrew plays through the full loop three times — raid, return, train, raid again — and at some point during raid #2 or #3 points at his screen and says *"that's [name], I remember him from training."* Personalization of specific soldiers is the whole game.

**What we explicitly will not do in sprint 4:** no matchmaking, no PvP, no base editor (the player's base is still fixed), no multiple simultaneous raids, no alliances, no replays, no shareable outcomes, no real billing integration. The closed loop is the entire game. Everything else is v2.

---

## Sprint boundaries — how to know if we're slipping

Three trip-wires mean we've drifted back into `/game-concept` territory and must stop and reset:

1. **A sprint grows more than ~5 internal subtasks.** If we're tracking more than five moving pieces, the sprint was scoped wrong, OR we're over-engineering. Cut.
2. **A plan-two.md "Updates" entry uses phase-step headers.** Binding feedback: no "Phase N step M" headers, ever. If that shows up in a future update, delete it before committing.
3. **The emotional moment for the current sprint is not shippable inside the sprint.** If I'm writing "... and then in sprint 4 we'll..." as part of sprint 2's success criterion, the moment is wrong. Redesign the moment, don't postpone it.

When in doubt, cut. Fewer features done right beats more features half-done. (`feedback_four_epic_sprints.md`.)

---

## The hard problem — "make training feel valuable on the base" — answered

The single hardest design problem: *how does training happen visibly on the base, in a way that feels like a real game purchase decision (not background wallpaper, not a dashboard, not a dead side-room), and that makes the player want to spend compute?*

**The earlier always-on-passive answer was wrong.** Wallpaper training kills the business model — when nothing requires a decision, nothing becomes a purchase. Andrew's correction (2026-04-10): training is a Clash-style commit-and-watch loop. The new answer:

1. **Training is a verb, not a state.** The player commits a specific soldier to a specific weapon's training run. They spend compute. A timer starts. They watch. This is a *decision* every time, and decisions are what convert into spend.
2. **The Training Camp is a 3D building, not a screen.** Tap it to open a slide-up sheet that NEVER hides the base. The base is always visible behind. The world-space progress ring above the building is readable from the default camera, so the player knows the state of training without opening anything.
3. **Compute tiers are the boost mechanic, and there is no skip.** Boost ≠ skip. Boost = literally upgrading the GPU. Tier 1 (1×) → Tier 2 (4×) → Tier 3 (16×) → Tier 4 (64×) compresses wall-clock time by actually running the GA faster, which is true to the ML reality. The player is buying a more powerful substrate, not bypassing the work. This framing is binding.
4. **The 25-population GA is the spectacle, framed honestly.** "Your soldier trains against 24 simulated copies of himself, and the strongest version is what you keep." This is true to the ML, justifies the visual population, and gives meaning to the ghosts. The ghost-plus-best opacity trick from V3 makes this readable in one glance with no UI.
5. **The empty camp is the call to action.** When no run is active, the camp sits idle. No ghosts, no shooting. A small "+TRAIN" prompt floats over it. The absence is intentional — it's the hook that pulls the player into spending compute.
6. **The trained soldier walks out of the camp into the platoon.** When the run ends, the cohort dissolves and the trained soldier walks back into the ambient wander FSM platoon from sprint 1. He carries his real `FixedNet` weights with him. Tap him later → see his actual brain. This is the weld that makes "the soldier I trained" a literal, identifiable, persistent thing. V2 and V3 both failed at this weld; sprint 2 is what fixes it.
7. **Compute spends are physical events.** Animated counter, GPU-whoosh SFX, particle burst from the counter to the camp. Every spend feels like a thing happened. Compute never silently decrements.
8. **Milestone callouts surface training progress into the base scene.** Banners slide across the base whenever anything important happens during a run. Progress comes to the player — they don't have to be staring at the camp.
9. **The live brain viz is always on the camp during a run.** Small node/edge diagram next to the building, updated every generation. Not a feature — a vibe anchor that proves the substrate is real.

**The new test:** if a player has compute, has soldiers, and opens the game, do they want to start a training run within 30 seconds? Sprint 2's answer must be yes. The empty camp + the compute counter + the "+TRAIN" prompt should pull the decision out of them.

**The secondary test (revenue intent):** during a training run, does the player ever want to bump the compute tier just to see the run go faster? Sprint 2 must produce this desire at least once per playtest. If it doesn't, the boost UX needs work.

---

## Soldier tactics design note — GREENLIT 2026-04-10

Andrew floated a strong idea on 2026-04-10: give soldiers an expanded action vocabulary beyond move/aim/fire so battles are *interesting*, not predictable, and so emergent tactical behavior can come out of the GA. The key constraint: **whatever we add must actually work, not pretend to work.**

**Lean v1 proposal — four tactical action verbs:**

1. **TAKE COVER** — soldier identifies the nearest cover object (wall block, sandbag, debris) within N units and moves to its leeward side relative to the nearest enemy. Crouches there. Takes 60% less damage from that side. Real implementation: raycast nearest static collider with line-of-sight to enemy, lerp to its back side. ~80 lines.
2. **CALL FOCUS** — soldier broadcasts a target ID to allies within R units. Allies receive a "focus suggestion" sensor input. The receiving brain has a "follow focus" output that biases their aim toward the called target. NOT a hard order — a suggestion the brain can ignore. When 2+ soldiers focus the same target, damage stacks faster than spreading fire. Real implementation: a `focusTargetId` field + a `nearbyFocusCalls` sensor. ~50 lines.
3. **FLANK** — soldier sets a temporary navigation goal perpendicular to the current attack vector instead of straight at the enemy. When the "flank" output fires, the soldier picks a waypoint at +90° or -90° from the enemy direction and moves there for 3-5 seconds before resuming normal AI. Visually unmistakable. Real implementation: ~40 lines on top of the existing nav system.
4. **SUPPRESS** — soldier fires in the general direction of an enemy without precise aim. Any enemy in the cone gets a 50% accuracy debuff and movement-speed penalty for 1.5s. Used to cover teammates while they reposition or take cover. Real implementation: ~60 lines (cone collider, debuff state, debuff tick).

**Why these four:**
- **Universal** — work identically for attackers and defenders.
- **Cheap** — each is <100 lines, all four together <300.
- **Composable** — they combine (suppress while teammate flanks; focus fire from cover; flank to suppress angle).
- **Genuinely emergent** — the GA learns when each is useful from the fitness signal, not from scripts.
- **Visibly different** — the player can see "that one is taking cover" and "those two are flanking" without UI.
- **Force-multiply variance** — same loadout + same base + different brains + 4 verbs each = exponentially more battle outcomes. This is what passes the "10 random users see 10 different battles" test.

**Why NOT bomb planters / medic class / specific roles:**
- Each requires unique entities and animations.
- Each is single-purpose (only matters against tanks, only matters when wounded, etc.).
- Each adds soldier classes — which violates the "no hardcoded classes, brains are emergent" rule.
- The four verbs above subsume their function: a soldier can suppress a tank crew, a soldier can call focus on a low-HP ally to draw enemy fire, etc.

**Network shape implications:** this expands the network output vector from 4 to 8 outputs. Sensor vector grows by ~5 inputs (nearest cover position, nearest ally + their target, am-I-suppressed flag). The GA can still train this — the topology stays small. **Critical:** if we ship sprint 2 with the full action vocabulary from day one, sprint 4 doesn't have to retrain everything. If we don't, sprint 4 inherits a brain that has no idea what cover or flanking mean and we either re-train all soldiers or ship a worse battle experience.

**Recommendation:** ship sprint 2 with all 4 verbs in the action vocabulary, even though the rifle training in sprint 2 only exercises a couple of them. Pay the small upfront cost so sprint 4's variance design isn't structurally broken.

**Andrew greenlit this on 2026-04-10.** Sprint 2's network shape and Sprint 4's tactical payoff are both commitments, not conditionals.

---

## Tech stack lock (no more drift)

We are on the `/physics-test` + `/play` stack:
- React 19 + @react-three/fiber 9 + @react-three/rapier 2 + three 0.183 + zustand 5 + TypeScript strict.
- Vitest, existing path aliases, existing CI.
- Persistent Zustand stores split by lifetime, following the V3 pattern (`useGameStore`, `useTrainingStore`, `useArenaStore`, `useRaidStore`).
- `deepFreeze` on all config objects.
- Procedural 3D only. No `.glb`, no `.fbx`. Every building has a `*Model.ts` factory and a `*.tsx` R3F wrapper. Keeps bundle tiny, keeps everything destructible, keeps the toy aesthetic consistent.
- No new dependencies without explicit approval. Specifically: no new animation libraries, no new state libraries, no new ML libraries unless Vitest-compatible NEAT isn't in the existing tree.

---

# `/game-concept` post-mortem

Writing this once, keeping it short, referencing it forever.

**What went right in `/game-concept`:**
- `DestructibleDefense` itself (the foundation from `/physics-test`) is solid and carries forward.
- `BaseTrainingZone.tsx` discovered the right layout idea — a permanent training zone on the right half of the base with shooting targets and sandbag firing lines. The geometry and constants are reusable as sprint 2 starting material even though the logic driving it is not.
- Strict TypeScript + Vitest + CI infrastructure shipped and is worth keeping.
- The memory-of-training-on-the-base principle was correctly identified (`project_untrained_soldier_spectacle.md`), even if the execution fell apart.

**What went wrong:**
1. **Decomposition disease.** Phase 1a → 1b → 2a → 3a steps 1–8 each shipped something, but nothing added up to a game. Every step was a ticket instead of a feeling.
2. **Single-slot hardcoded hacks.** `PHASE_3A_SLOT_ID` = `slot-1` in `TrainingGrounds.tsx` because "just ship the spectacle for one slot first" was easier than committing to the 3-slot-or-25-pop decision. The game never came out of that bottleneck.
3. **HUD inconsistency.** `BaseHUD.tsx` shifted to "any running slot" while `TrainingGrounds.tsx` stayed on `slot-1`. Two places to fix every change. Classic "Phase 3a step 4 of 8 shipped a change step 3 needed" drift.
4. **Training as a zone, not a spectacle.** The zone was built; the 25-soldier live GA was not. Players saw sandbags and target stands but no actual brains. The weakest link in the whole pitch got left for last and then the sprint ran out of attention.
5. **Weapons remained "minimum viable."** The rifle existed, fired, and felt weak. The CoD-polish pass kept getting pushed to "a later step" and never came.
6. **plan.md itself became a checklist.** By the end, plan.md's shipping-history section was longer than its vision section, and the vision section hadn't been updated in weeks. The scaffolding outgrew the idea.

**What we keep from the post-mortem as living rules (in addition to existing memory files):**
- Shippable slices, not tickets.
- The weakest link ships first, not last. If training is THE concept, sprint 2 ships the full training spectacle or sprint 2 isn't done. Sprint 1 is allowed to not have training because that's by design; sprint 2 is not allowed to half-ship it.
- Every sprint closes its consistency loop before moving on. No "BaseHUD.tsx and TrainingGrounds.tsx disagree" messes that sit across sprints.
- If a "minimum viable X" is being planned, X is probably something where "minimum viable" is the wrong target. See weapons. See training. See soldier life.

---

# Updates

This is the append-only shipping log for plan-two.md. Every completed sprint or significant design decision gets one entry here. Do not rewrite old entries. Do not delete.

## 2026-04-10 — plan-two.md created; four-sprint vision locked

Created `plan-two.md` from a fresh start after scrapping `/game-concept`. Documented the pivot rationale, the `/physics-test` + `/play` inheritance baseline, the four epic sprints (Place, Training, Economy, Raid), the non-goals for v1, the passive-training-on-camp design answer, and the `/game-concept` post-mortem. `plan.md` is preserved as historical record with a superseded pointer at the top. Next action: begin Sprint 1 groundwork — extend `DestructibleDefense` with tower and barbed-wire styles, and stand up the procedural toy soldier + wander FSM in the `/physics-test` scene composition.

## 2026-04-10 (revision 1) — Andrew audit feedback; Sprint 2 reframed as commit-and-watch

Three corrections from Andrew on the first draft, plus targeted mobile-game UX research. Sprint 2 was rewritten heavily; Sprints 3 and 4 took smaller updates; new top-of-doc *Two Non-Negotiables* section added; new *Pending Decision — Soldier tactics* section appended.

**Corrections applied:**
1. **Always-on training was wrong.** Wallpaper training kills the business model — no decisions, no purchases. Sprint 2 is now a Clash-style commit-and-watch loop: player picks a soldier, spends compute, a real GA training run starts on that soldier's actual brain, world-space timer ring above the camp, ghost-plus-best spectacle plays out for the duration, soldier walks out with a measurably trained brain into the ambient platoon.
2. **"No ML narrative framing" was misread on my part.** Andrew wants the ML *shown*, not hidden — neural net viz on the camp, in the roster, on the soldier sheet, during raids. The non-goal was rewritten to *"no fictional framing AND no hiding."* Show the substrate; don't pretend it's something else and don't pretend it isn't there.
3. **No "skip" button — ever.** Boost is reframed as **using more powerful compute**: Tier 1 (1× sim speed) → Tier 2 (4×) → Tier 3 (16×) → Tier 4 (64×). The player is literally upgrading the GPU, not bypassing the training. This framing is binding for v1 and is true to the ML reality. The store now sells both quantity packs and tier upgrades.

**Mobile-game UX research findings folded into the plan:**
- World-space training timer on the building (COC barracks pattern), not a corner clock.
- 5-button hard cap on the main base screen (TRAIN / ATTACK / STORE / ROSTER / SETTINGS).
- Compute as a star currency: electric-cyan particles, GPU-whoosh SFX, animated counter that springs+sparkles on every change, full-screen "training ceremony" on run start.
- Compute store with tabs (Offers / Packs / Tiers / Daily / Currency), Offers tab front, raw currency buried.
- FTUE = forced 60-second raid before the player ever sees the base UI. Never says "neural network" in the first 90 seconds. Ship in sprint 4.
- Variance design now has 5 explicit dimensions in Sprint 4: procedural base + biome + composition + ML divergence + objective overlay. Test: 10 random users → 10 different battles.
- Named raids ("Squad Hawthorne vs. Bunker Hill 04, Snow") for narrative variance.
- Lesson from Supercell removing COC training timers entirely: gate the *expensive/rare* training, not every training. Rifle training is fast/free; rocket/grenade/MG/tank are the timer-gated, compute-monetizable runs.

**New top-of-doc *Two Non-Negotiables* section** locks the foundation requirements: (1) compute must feel valuable and the ML must be literally real, (2) battles must be fun and unpredictable. Every sprint and feature gets measured against these.

**New *Pending Decision — Soldier tactics* section** proposes a lean 4-verb action vocabulary (TAKE COVER, CALL FOCUS, FLANK, SUPPRESS) to be baked into the network from day one in sprint 2 so sprint 4 doesn't have to retrain. Each verb is <100 lines and genuinely implemented, not faked. This is the force multiplier that makes "10 users, 10 battles" structurally true. **Awaiting Andrew greenlight before this becomes a commitment.**

## 2026-04-10 (revision 2) — Sprint 1 expanded into 6 binary subsystems; greenlights logged

Andrew greenlit (1) the 4-verb tactical vocabulary, (2) the bullet-consolidation pass on Sprints 2-4, and (3) desktop-first dev for Sprint 1. Then asked for Sprint 1 to be planned out with clear acceptance criteria as the foundation moment.

**Sprint 1 rewritten** from a 7-bullet sketch into 6 named subsystems with ~30 binary acceptance criteria total: (1) Scene foundation, (2) Destructible base elements, (3) Toy soldiers + wander brain, (4) App shell + persistence, (5) Mobile-game look-and-feel pass, (6) Playtest capture. Each criterion is testable and binary — done or not done. The look-and-feel pass moved from Sprint 3 to Sprint 1 because every later sprint inherits it; cutting it for time defeats the foundation argument and is now a trip-wire. App-boot screen, persistence schema with versioned migration shim, settings sheet stub, ambient camp audio bed, animated compute counter, and beveled CSS pattern are all locked into Sprint 1 from day one. Dev-only test grenade key (`G`) added so destructibility on tower and barbedWire can be verified without waiting for Sprint 4. Per-sprint playtest video capture committed to `playtests/sprint-N.mp4` becomes the sprint deliverable artifact and the drift check for every later sprint. Also completed in this revision: bullet consolidation on Sprints 2-4 (each now has 6 named subsystems matching Sprint 1's format), tactical verbs greenlit and `[Pending Andrew greenlight]` tags removed, pending decision section retitled to "GREENLIT 2026-04-10." The entire plan doc is now consistent and ready for coding.
