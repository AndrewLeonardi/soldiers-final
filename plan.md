> Design doc for the `/game-concept` pivot. Drafted 2026-04-08.
> Status: **research + plan only**. No code yet.
> This is meant to be the backbone of a business, not a prototype.

---

## ⚠️ How to edit this document

**Rule: additions only. Do not overwrite, do not delete, do not rewrite.**

This doc is the source of truth for the pivot. As we iterate, new thoughts, course corrections, playtest notes, and design decisions will arrive. When they do:

- **Append, don't replace.** Add a new subsection, a new bullet, a new "Update YYYY-MM-DD" note. Leave the original text intact, even if the new thinking supersedes it.
- **If a decision is reversed, mark the old one as superseded** — strike it through or add a `> Superseded YYYY-MM-DD: see section X` note above it. Do not delete it. The history of why we changed our minds is as valuable as the current state.
- **If a section gets long, split it — don't prune it.** Move old material into a "History" or "Earlier thinking" subsection at the bottom of the relevant section.
- **New sections go at the bottom of their parent, or in a new top-level `## Updates` section at the very end of the file.**
- **Never touch the North Star, the UX non-negotiables, or the build sequence phase numbers** without an explicit conversation with Andrew. Those are anchors; if they drift, everything drifts.

The goal: in six months, we should be able to read this document top to bottom and see the full evolution of our thinking — the wins, the wrong turns, and the corrections. A design doc that loses its history loses its value.

---

# The Pivot — From Battle Levels to a Base You Care About

## Why we're pivoting

The current game loop does not feel fun, and we can name exactly why. The four problems Andrew called out are the right ones:

1. **Training feels disconnected.** It's a side room you go into, grind through, and come out of. It doesn't change your relationship to the game.
2. **Training does not feel valuable enough.** The entire business model is "people pay for compute." If training doesn't feel transformative, nobody pays.
3. **Battles are predictable and identical for every player.** No emergence, no story. You play level 3 the same way I play level 3.
4. **The enemy bots contradict the pitch.** We sell "every soldier has an AI brain," then fight scripted marionettes. The premise breaks the first time you pay attention to an enemy.

Underneath all four is a single root cause: **the game has no soul.** There's nothing the player is protecting. Nothing they come back for at 7am before work. The game is a series of levels, and nobody loves a series of levels.

The fix is to give the player a thing to love and a thing to fear losing. That thing is **a base they built, populated by soldiers with AI brains they trained.**

---

## The non-negotiable North Star

> **Every toy soldier in this game has its own AI brain. You built their home. You trained their minds. You'd better defend them.**

Every design decision in this document should be gut-checked against that sentence. If a feature doesn't reinforce it, cut the feature.

---

## ⚠️ The UX non-negotiables — READ BEFORE BUILDING ANYTHING

**This is the single hardest thing to get right on this project. It has tripped us up repeatedly. It will trip us up again if we're not vigilant.**

> **The game must feel like a mobile game. It must never feel like a dashboard, a web app, an admin panel, or a config screen.**

If you can screenshot any surface of this game and mistake it for a SaaS product, the surface is wrong and must be thrown away. This rule is absolute and it applies to every screen, every menu, every overlay, every tooltip, every notification, every button, every number on screen.

### What "mobile game" means, concretely

1. **Full-bleed 3D world, always visible.** The 3D scene is the background of every screen. Menus float over it, they don't replace it. If you hide the 3D world to show a menu, you lost.
2. **Buttons have physical depth.** Beveled edges, drop shadows, 3D press states, spring animations on tap. No flat rectangles with rounded corners. No Material Design. No Tailwind defaults. Every button should look like an object the player could pick up.
3. **Every surface is textured.** Wood, felt, dirt, canvas, brushed metal, worn plastic. No flat CSS fills. No white backgrounds. No system gray. Textures come from the world — a kitchen table has wood grain, a workshop has steel, a sandbox has sand.
4. **3D models, not icons, wherever possible.** When showing a soldier, show the soldier. When showing a weapon, show the weapon model. When showing a wall, show the wall. 2D SVG icons are acceptable *only* for HUD chrome (resource counters, small action buttons) and even then they should feel handmade, not Material/SF Symbols.
5. **No emojis. Ever.** Emojis break the plastic toy-soldier aesthetic instantly. Custom SVG or 3D only.
6. **No web patterns.** No navigation bars. No sidebars. No breadcrumbs. No tabbed interfaces. No card grids with hairline borders. No dropdown menus with chevrons. No hamburger menus. No modals with an X in the top-right corner.
7. **Thumb zone rules the layout.** Bottom 40% of the screen = interactive actions. Top 15% = HUD (resources, notifications). Middle = the 3D world. This is not negotiable for mobile — fingers live at the bottom.
8. **Transitions are animations, not page swaps.** Going from barracks to training is a camera move through the base, not a hard screen change. The world is continuous.
9. **Diegetic over abstract.** A training countdown is a sandglass on the Training Grounds building, not a `0:32:14` text clock. A gold total is coins spilling out of a chest, not a number. Whenever possible, the UI lives *inside* the world.
10. **Sound on every tap.** Every interaction has a synth-engine sound. Silence is a bug.
11. **Typography is chunky and confident.** Black Ops One or similar display font for headers. No thin sans-serifs. No 10px body text. Readable at arm's length on a phone.
12. **Colors are warm and saturated.** Toy plastic greens, worn tan, wood browns, dirt reds. No cool gray palettes. No "enterprise blue." The world is a toy, not a spreadsheet.
13. **A 10-year-old should figure it out in 5 seconds.** If a kid can't tap through the first screen without help, the screen is wrong.

### The dashboard smell test

Before you ship any screen, ask these questions out loud:

- Would this look at home in Stripe's admin panel? → **Throw it out.**
- Does it have a data table with columns? → **Throw it out.**
- Is there a settings gear icon in the corner? → **Throw it out.**
- Is the background white, light gray, or a CSS gradient? → **Throw it out.**
- Are there hairline borders separating "cards"? → **Throw it out.**
- Does the loading state show a spinner? → **Use something physical** (a soldier doing push-ups, a brain pulsing, a sandglass).
- Is there a notification bell with a red dot? → **Replace it** with something diegetic (a courier running to you, a radio crackling).
- If I squint at this, does it look like Linear / Notion / Figma / any SaaS tool? → **Throw it out.**

### Why this matters for the business

This is not aesthetics for aesthetics' sake. It's commercial. Our entire pitch is:

> *You trained a real AI. It lives inside a toy soldier. Inside a base you built. On your kitchen table.*

The moment a player's eyes see "dashboard UI," the pitch collapses. Nobody pays for a dashboard. They pay for toys. They pay for worlds. They pay for the feeling of tapping a 3D thing and having it do something. Every frame of this game has to look like a toy box come to life. The 3D physics engine we've already built *is* the thing that makes this game valuable — the UI exists to get out of its way.

### Reference points to chase

- **Clash of Clans** — chunky beveled buttons, 3D world always visible, everything textured, wood/stone/metal everywhere.
- **Hay Day** — painted barnyard aesthetic, zero web chrome, every interactive element is a physical object in the world.
- **Monument Valley** — diegetic UI, every menu lives inside the world.
- **Tiny Tower / Game Dev Tycoon** — pixel-perfect toy-box framing.
- **Townscaper** — every element feels hand-placed, hand-textured.

### Reference points to avoid at all costs

- Any enterprise SaaS product (Stripe, Linear, Notion, Figma, Asana).
- Flat Material Design.
- iOS native forms and list views.
- Any "admin panel" or "config page."
- Any game UI that relies on modal dialogs with an X in the corner.

### Checklist at every design review

Before any new screen is considered done, it must pass all of these:

- [ ] The 3D world is still visible behind/beneath the UI.
- [ ] Every button has a 3D press state and a sound.
- [ ] No flat CSS colors — every surface is textured or has a material feel.
- [ ] The layout respects thumb-zone rules (actions at the bottom).
- [ ] No emojis, no system icons, no web patterns.
- [ ] A 10-year-old can figure out what to tap in under 5 seconds.
- [ ] Squint test: does it look like a toy or like a spreadsheet?

**If any item fails, the screen goes back to the drawing board. No exceptions. This is where the game lives or dies.**

---

## What the research told us

A deep dive into Clash of Clans, Last War: Survival, XCOM, Fire Emblem, and Darkest Dungeon turned up some specific, non-obvious lessons. The most important ones:

### From Clash of Clans and its successors

- **The loop runs on three clocks, not one.** Instant reward (collect resources on app open), session reward (5-minute attack), daily reward (queued progression). If any clock is missing, the habit doesn't form. CoC's own retention data shows the 5-minute session is the habit; the long builds are the reason to return tomorrow.
- **Timers are for rhythm, not monetization — in 2026.** Supercell's own "Clash Anytime" update removed troop training timers because time-gate monetization is dead. Timers now exist to create the "check in every few hours" habit. Monetization has shifted to battle passes, cosmetics, heroes, and convenience (extra builders).
- **Loss aversion is the strongest retention hook, not reward.** CoC's offline-attack + shield + revenge button weaponizes the fact that losses hurt about 2x more than gains feel good. Players return to check on what they lost, not to enjoy what they might gain. This is the single cheapest retention lever we can build.
- **Social pressure beats reward every time.** Clan wars run on a 2-day rhythm and the strongest retention driver is guilt — letting your clanmates down. For our v1, human clans are out of scope, but we can simulate the same social pressure with AI-driven "rival squads" that remember your base and come back for you. More on that below.
- **Whales need F2P players to beat on.** ARPPU in CoC is around $48, ARPU is about $4.60 — the top ~2% of spenders carry the economy. Our design must keep F2P players engaged because they are the opponents whales need. Pay-to-win is not just unethical; it is commercially suicidal in this genre because it empties the pool.
- **Hide the strategy layer during onboarding.** Last War — a game that did >$1B in its first year — opens with a stick-figure hyper-casual minigame and only reveals base-building after about 5 minutes. This is called "bait and switch that actually delivers the bait." Our current /play flow front-loads strategy and loses players.
- **Don't block the core loop behind a single timer.** CoC's Builder Base launch failed partly because it only gave players one builder, so a long upgrade stalled the whole loop. Whatever timers we add, there must always be something to do in parallel.

### From games where people cry when a unit dies

- **XCOM gives scaffolding, not personality.** Procedural faces and voices + an invite to rename them turns the soldier into "Dad" or "my friend Ben" or "that guy I've kept alive for 40 hours." The memorial wall is a cold list of names, and players weep over it. **Lesson: we don't write the personality. We leave space for the player to project.**
- **Fire Emblem's attachment is relationships between units, not between player and unit.** Support conversations unlock as two units fight side by side. Permadeath in Classic mode makes players reset entire chapters to save a unit. **Lesson: soldiers should have bonds with each other, not just with us.**
- **Darkest Dungeon turns suffering into story.** Stress meters, quirks accumulated on expeditions (Kleptomaniac, God-Fearing, Paranoid), visible scars. Every hero becomes a specific, weird little story. **Lesson: what soldiers survive becomes who they are. Scars are content.**
- **Every permadeath game has a frustration escape valve.** XCOM lets you recruit fresh soldiers. Fire Emblem has Casual Mode. Darkest Dungeon's stagecoach always has new heroes. **Lesson: the roster is precious, but individual soldiers should be losable without rage-quitting.** Our "medical tent cooldown" idea is exactly right, and should be the default. Permadeath should be opt-in, or reserved for very high difficulty.

### The white space we found

**No shipped mainstream mobile base-defense game uses real AI/ML as a core gameplay mechanic.** The 4X/base-builder space is crowded, but the "train a real neural network that fights for you" angle is genuinely uncrowded. This isn't a marketing gimmick for us — our NERO-style hybrid (scripted physics + neural corrections) is already built and working. **This is our moat.**

---

## The new game concept

### The one-sentence pitch

> You have a base. Inside the base, you train toy soldiers with real AI brains. AI-driven rival squads attack your base. You train harder, build walls, and defend what you built.

### The three-clock loop (designed to match CoC retention math)

**Instant (open-app reward, ~10 seconds):**
Open the app. See your base, with training ticks that have accumulated while you were gone ("3 training cycles completed. Sgt. Rico improved his rocket accuracy by 12%."). Tap to collect. This is the "did anything happen" hit.

**Session (~5 minutes):**
- Scout a rival base (rivals are AI-generated from real player data or procedural — see "social without multiplayer" below).
- Attack it, or skip it. If you attack, it's a short 60-90 second battle using your trained brains.
- Return to your base. Queue a new training run. Maybe place a new wall.

**Day (30 min to several hours of real time, mostly passive):**
- Training runs take real time and happen in the background (or at 100x when the app is foregrounded). This is where compute gets spent.
- Base upgrades (new wall tiers, new buildings, new defenses) run on build timers.
- A rival will attack your base between sessions. You'll log in to a replay.

**Week (every 2-3 days):**
- A "boss rival" attacks — a themed AI squad tuned to counter your last layout. These are the Clan Wars equivalent. Missing one has real cost.

### Why this is fundamentally different from what we have

The current game has one clock: "play a level." That's it. A level-based game has no reason for you to come back to the app unless you want to play another level. A base-based game has a reason to come back even when you don't want to play — because something happened to your base while you were gone.

---

## How training gets baked into the game

This is the central design problem and the entire monetization model. Right now training is a separate screen you visit. In the new concept, training is **the heart of the base** — visually, emotionally, mechanically.

### The Training Grounds as a physical space in your base

There is a building in your base called **The Training Grounds**. It is not a menu. It is a 3D structure you can zoom into. When you zoom in, you see:

- Your soldiers on the parade ground, marching, doing drills, firing at targets.
- A **neural net visualization** above the building, showing the brains actively evolving.
- **Real-time genetic algorithm training** running on the backend (for foregrounded app) or at checkpoint intervals (for backgrounded / passive).
- The image Andrew shared — a squad of toy soldiers marching in formation — is exactly the visual language for this. Training is a parade. It is a spectacle.

### Training is passive AND active

**Passive mode (backgrounded or idle app):**
Training cycles tick forward in real time. A "rocket launcher training run" might be 30 minutes for a new soldier, or 8 hours for an elite-tier brain. This is the Clash-style timer. It exists for habit formation — you come back to collect improved brains like you'd collect resources from a gold mine. **The timer is the rhythm, not the monetization.**

**Active mode (app foregrounded):**
You tap "OBSERVE TRAINING" and enter a 3D view of the arena. The sim runs at 10x-100x speed. You can watch the neural net visibly get better. Generations tick up. The fitness sparkline climbs. This is where the *spectacle* lives. It's also where players who want to accelerate training do it — **active observation is slightly faster than passive**, because being present matters.

**Why this works:**
- Passive training gives us the CoC check-in loop: "did anything finish while I was gone?"
- Active training gives us the spectacle the business model needs: "watch your AI actually learn, in real time, in 3D."
- It cleanly separates "I want to grind" from "I want to enjoy the show." Both types of player are served.

### Compute is the only thing you pay for (unchanged)

The existing compute economy from `Archive.md` survives this pivot largely intact. What changes:

- **Compute no longer just unlocks a weapon.** It now buys **training accelerators, elite drill sergeants, advanced training scenarios, and brain-mutation resets.** There's a whole shop of compute-sinks tied to training quality, not just training existence.
- **The daily free compute drip (100/day)** now buys you roughly one passive training slot per day. Whales can run five at once and crank through scenarios.
- **Training scenarios become content.** A new scenario (e.g., "Urban Assault" or "Night Raid") is a piece of DLC-like content that expands what your soldiers can learn. This is the battle pass lever.

### Training feels valuable because defeat is legible

This is the most important point in the whole document. The current game's core fairness problem is that **untrained soldiers and trained soldiers look nearly identical to a casual player.** A 5-star rocket brain and a fresh one both fire a rocket that arcs and explodes. Who can tell?

The base defense frame fixes this, because:

- The player builds their own layout. They know exactly where the weak spots are.
- A rival AI attacks their layout. The replay shows a specific soldier holding (or failing to hold) a specific chokepoint.
- **The player can say: "If only Rico's rocket brain were better, he would have hit that tank before it reached the Intel."** That sentence is the entire business model. That sentence converts to a compute purchase.
- We reinforce this with damage attribution UI: "Sgt. Rico landed 2 of 4 shots. Trained brains land 3 of 4. Train him."

**Training value becomes self-evident the first time a player watches their base lose.**

---

## Soldiers you care about

### Names, faces, accumulated history

Taking the XCOM / Darkest Dungeon lessons directly:

- **Every soldier has a procedural name and face**, and the player can rename them. Renaming hijacks real-world attachment.
- **Every soldier accumulates stats and quirks from battles:** kill counts, longest-held position, "the guy who never missed a rocket," "the one who took three hits and lived."
- **Visible scars.** A soldier who has survived 10 battles has battle damage on his model. A soldier who just arrived looks pristine. Small but enormous for attachment.
- **Friendships.** Soldiers who fight together accumulate "squad bond" meters. Bonded soldiers in the same battle get small combat bonuses and — more importantly — dialogue lines during battle and defeat screens. Fire Emblem's mechanic, transposed.
- **Brain genealogy.** When a trained brain produces a particularly strong offspring in the GA, the lineage is tracked. "Rico's brain is a descendant of Vasquez's Gen 42 rocket mind." This is a nerd-out feature but it makes real ML gameplay-legible and it's a story hook.

### Medical tent / injury cooldown (Andrew's idea, directly adopted)

- When a soldier "dies" in a defense, he is **injured**, not dead.
- He goes to the **medical tent** for a recovery cooldown — say, 30 minutes to 4 hours depending on injury severity.
- During recovery, he cannot defend the base.
- The medical tent has a limited number of beds. Too many injuries at once = lose soldiers to permadeath (they die in the queue).
- Compute (or gems, or a new "medical supplies" resource) can accelerate healing.

**Why this works:**
- It's a loss-aversion mechanic. You log in and see "Sgt. Rico is injured. 2h 14m until recovery."
- It's a social pressure mechanic without clans. You feel guilty for losing him.
- It's a soft permadeath mechanic. Losing too many at once has permanent consequences, but a single bad raid never erases a soldier you love unless you neglected him.
- It's a compute sink. Heal faster = pay compute.

### Permadeath — opt-in, or at the highest difficulty tier

Permadeath is a creative cheat code for attachment, but it's also a rage-quit vector. We default to "injury cooldown" permadeath — which is to say, it only happens if you neglect injured soldiers. A hardcore mode can enable true first-death permadeath for the XCOM diehards, but it must not be the default.

---

## The base you build

### What the base is, concretely

The base is built on the existing physics lab. We're already standing on a table. Add:

- **The Vault / Intel Core.** The thing you're defending. It contains your "intelligence" — narratively framed as the soldiers' brains themselves. If the vault is breached, you lose compute, gold, and possibly soldiers (to the injury queue).
- **The Training Grounds** (already described).
- **The Barracks** — where off-duty soldiers chill. Zoom in, see them in their bunks, cleaning rifles, playing cards. Dumb but important for life.
- **The Medical Tent** — where injured soldiers recover.
- **The Walls and defense placements** — the player-designed layout. Same unified destructible system we already have.
- **Resource generators** — gold mines, compute generators (scientist's tent — "your soldiers are learning from this terrain"). Clash-style collectors.
- **Defensive turrets / watchtowers** — auto-fire structures manned by your soldiers. Manned is key: a turret without a soldier doesn't fire. This makes soldiers *matter to the base*.

### Placement is creative, not constrained

Unlike the current /play flow where placement is a narrow green strip, the base is a free-form canvas on the table. You move buildings around, drag walls into chokepoints, create kill zones. **This is where the endowment effect kicks in** — the layout is yours, specifically, and that makes it precious.

### The base is visible to rivals

A key CoC lesson: your base is your public face. Rival AI squads attack your *specific* layout. The replay shows your layout surviving or failing. Over time, you develop a base "identity" — "I'm a choke-point player" or "I'm a turret-spam player." This is the endowment effect at maximum intensity.

### Grid vs free placement

Open question for the implementation phase, but I lean toward a **soft grid** (0.5-unit snaps) for buildings, **free placement** for walls. Grid makes the base feel architected; free walls give the player creative agency on the thing that matters most for defense.

---

## Social pressure without multiplayer (yet)

Human-vs-human multiplayer is explicitly out of scope for v1, but we cannot ship without the social pressure loop because that's 60% of CoC's retention. The answer is **simulated rivals with memory.**

### How it works

- When a player starts the game, the system generates ~5 "rival AI squads." Each rival has a name, a procedural leader, a flavor bio ("The Red Tide — they killed half the kitchen battalion").
- Rivals have **real, trained neural nets** — we run headless GA in the background on the server (or locally, for offline-first v1) and evolve them against generic bases.
- Rivals **remember you.** A rival who attacked your base yesterday and was defeated comes back tomorrow with a slightly better brain, trained against your exact last layout.
- Rivals **attack you between sessions.** You log in to "The Red Tide breached your east wall at 3:14am. 2 soldiers injured. Replay?"
- You can counter-attack — the "revenge" button CoC taught us.
- This is **narratively honest about the game's premise**: the enemies have real AI brains, like you. Problem #4 from Andrew's list is solved by the same feature that provides social pressure.

### Why this is better than real PvP for v1

- **No matchmaking problem.** No player waits for an opponent.
- **No toxic behavior.** Rivals can't grief, chat, or report you.
- **Full control of difficulty curve.** We can tune rival strength to the player's exact level, guaranteeing the 50/50 win-loss ratio that dopamine research says is ideal.
- **It makes our AI premise real.** The rivals are not bots, they are neural networks. Problem #4 goes away.
- **It's an upgrade path.** When we eventually add human PvP in a later push, rivals become an onboarding tier and PvP becomes the endgame. Nothing gets thrown away.

### Eventually, a clan-like system

Out of scope for v1, but the design should leave room for it: "Training Academies" where players pool compute to train shared specialist brains, or "Alliances" where everyone defends the same mega-base. Don't build it, but don't paint ourselves into a corner.

---

## The hook sequence (the first 10 minutes, specifically)

Directly copying the Last War playbook. The player's first 10 minutes decide everything.

**00:00-00:30 — Pure spectacle, zero strategy.**
You open the app. You see a toy soldier marching across a huge kitchen table, in first person from the soldier's perspective. The camera pulls back. You see the table. You see the base, far away, being attacked by tiny plastic tanks. Cinematic. Nothing to tap yet.

**00:30-01:30 — One tap.**
A toy soldier runs up to you. "Commander! We need rocket support on the east wall!" You tap one button to fire a rocket at an incoming tank. It explodes. The music swells. This is the bait.

**01:30-03:00 — Meet your soldiers.**
The attack ends. You meet 3 starter soldiers: a sergeant, a private, a corporal. Each has a name, a face, a short bio. You are asked to rename one of them. (The XCOM trick — you now care.)

**03:00-05:00 — Build your first wall.**
The game says "your base is vulnerable. Place this wall." You drag one wall. It snaps into place. Tap to confirm. A tutorial character (a grizzled drill sergeant) cheers.

**05:00-07:00 — Your first training run.**
"Your rocket soldier is bad at his job. Train him." The game opens the training view. You watch a 30-second sped-up GA run. The sparkline climbs. The soldier's accuracy visibly improves in a side-by-side demo. "Now he hits." Graduation moment. This is where we sell the entire business model in 2 minutes.

**07:00-10:00 — First rival attack.**
Your first rival is telegraphed — "The Red Tide is coming in 3 minutes. Prepare your base." You frantically place more walls, swap a soldier into a turret. The attack hits. You watch the replay. You barely survive, or you lose one soldier to injury. Your soldier is in the medical tent. You care.

**10:00+ — The loop.**
The game now reveals the base map, the progression systems, the compute economy, the list of training scenarios to unlock. But only now — after the player is already invested.

**This onboarding is the single highest-leverage thing we can build.** Last War went from 1-star reviews to $1.3B by nailing this.

---

## Monetization, in the new frame

Same compute economy, but the compute *does more* now and there are more sinks for it.

### What compute buys

- **Training runs** (existing — unchanged).
- **Training accelerators** — cut passive training timer by 2x/5x/10x.
- **Elite drill sergeants** — rare training characters that buff a specific soldier's training output. Gacha-ish. Cosmetic + stat.
- **Advanced training scenarios** — unlock "Night Raid," "Urban," "Moving Targets," etc. Expands the content ceiling.
- **Brain mutation resets** — take a trained brain and re-run its final generations for a chance at a better variant. Variable reward, like a loot box but tied to real math.
- **Medical bed expansions** — more beds = survive worse raids.
- **Extra builders** (CoC trick — parallelism is worth real money).
- **Cosmetics** — battle pass skins for soldiers, base decorations, parade-ground banners.

### What compute does NOT buy

- Compute should never buy you raw victory. **No direct "buy this brain" option.** Whales can train faster, run more scenarios in parallel, and heal faster — but they cannot skip the spectacle of training itself. The spectacle *is* the product.
- Compute should not buy defenses that F2P players cannot eventually earn. **No hard pay gates.**

### The battle pass equivalent

A monthly "Campaign Season." Each season adds:
- A themed rival faction.
- A new training scenario (compute sink).
- A new defense structure.
- Cosmetics tied to progression.
- A premium track with extra compute drip, bonus scenarios, unique skins.

This is where the bulk of the revenue comes from. CoC's battle pass equivalent drove a 145% revenue lift at Supercell. We are not going to leave that on the table.

### The first-time-pay bonus (Last War's trick)

A single first-purchase doubler at any tier. Industry standard. Drastically improves first-conversion.

### What we don't do

- **No energy systems.** Energy systems gate play itself and kill D1 retention in 2026. Training cycles happen in the background; the battle loop is free.
- **No mandatory ads.** Optional rewarded video for small compute bonuses is fine, but forced ads are a trust-breaker for a premium-feeling game.
- **No pay-to-win PvP** — we don't have PvP in v1 anyway.

---

## What we're building on (the existing code)

One huge advantage: almost everything we need is already built. This pivot is mostly a reframing of existing systems, not a from-scratch rewrite.

### What we keep and reuse

- **Physics stack** — `PhysicsTest.tsx`, `SoldierBody`, `Defenses.tsx`, `battlePhysics.ts`, `collisionGroups.ts`. This is our engine. It's clean, it's tested, and the audit I just did found it structurally sound.
- **Neural net + GA** — `engine/ml/neuralNet.ts`, `geneticAlgorithm.ts`, scenario files. Already working. 6→12→4 topology, 136 weights, adaptive mutation. Ships today.
- **SoldierProfile / roster system** — `rosterStore.ts` already has named soldiers, unlocked weapons, trained brains keyed by weapon. Add fields for injuries, kill counts, quirks, friendships, scars.
- **Compute / gold economy** — `gameStore.ts` already has addCompute, spendCompute, daily drip. The shop UI exists.
- **Tutorial / onboarding framework** — we have a spotlight system that can drive the 10-minute hook sequence.
- **Audio synthesis engine** — free content generation. Training fanfares, alarm sirens, medical tent sound beds — all synthesizable.
- **Visual effects** — explosions, bloom, screen shake, slow-mo. Everything the base-defense moment-to-moment feel needs.
- **World system** — `WorldRenderer`, kitchen and workshop worlds. The base lives on these same tables.

### What we build new for `/game-concept`

Listed roughly in order of importance to the core loop.

1. **Base layout system.** A persistent set of placed structures on a table. Serializable, mutable, scrollable, zoomable. The foundation of the whole concept.
2. **Base Edit vs Base Defend modes.** Drag-to-place UI for edit mode; time-ticking physics sim for defense.
3. **Soldier profile expansions.** Injuries, kill counts, friendships, quirks, scars, bond meters. Schema changes to `SoldierProfile`.
4. **The three-clock loop implementation.** Passive training ticks (even when app is closed), session loop (scout → attack → return), session rewards on open.
5. **Rival AI generation and memory system.** Procedural rivals with stored neural net brains that evolve against the player's base.
6. **The training grounds as a visible, zoomable building.** Camera rigging, pose work, neural net viz overlayed in the world.
7. **Medical tent + injury queue.** Soldier state machine extension. Cooldown UI.
8. **Rival attack replay system.** Records the sim, plays it back. The loss-aversion loop depends on this.
9. **The 10-minute hook sequence.** Scripted onboarding.
10. **Monetization shop update.** Compute sinks beyond weapon unlocks: accelerators, drill sergeants, scenarios, mutation resets.
11. **Campaign Season / battle pass scaffolding.** Doesn't need content yet, but the structure has to exist from day one.

### What we archive or retire

- The **current level-based campaign** (`level-01` through `level-06`). Doesn't get deleted — it can live as an alternate mode, or the tutorial can repurpose level-01. But it is no longer the core loop.
- The current `/play` flow and Result Screen. The results-stars model doesn't exist in the new concept; instead you have a persistent base that gets stronger over time.
- The **scripted enemy bots.** Replaced by real neural rivals. (Problem #4.)

### What we deliberately do NOT build for v1

- **Human vs. human multiplayer.** Leave room, don't build.
- **Real-money PvP leaderboards / trophies.** CoC's trophy system is great but it's a whole subsystem. V2.
- **Cross-player clans / alliances.** V2+.
- **Real payment integration.** Stripe can wait until the loop is proven. Placeholder BUY buttons until we have a working hook.

---

## Build sequence

Rough phases. The theme of the sequence is: **prove the hook first, scale the economy second.**

### Phase 0 — Audit and clean. *(We're here now.)*
- This document.
- A design doc pass on the base layout data structure.
- A one-page "retention math" note — target D1, D7, D30 and the metrics we'll instrument from day one. (D1 >= 40%, D7 >= 20%, D30 >= 10% is CoC-peer.)

### Phase 1 — `/game-concept` page scaffold.
- New route. Starts from the `PhysicsTest` page as the base. Same Rapier setup, same ground, same soldier bodies.
- Static base: vault in the center, 2 placeholder buildings, a handful of walls.
- Zoom + pan camera rig suited to base viewing.
- Three starter soldiers wandering around the base idly. (Visible life.)

### Phase 2 — Base edit mode.
- Drag-to-place walls and buildings on the table.
- Persistence (Zustand + localStorage).
- A second mode toggle (EDIT / DEFEND).

### Phase 3 — Training grounds building with real GA running inside the base.
- Visible training arena inside the base.
- Passive training ticks — cycles complete in real time whether app is open or not.
- Active observation mode — zoom in, time scale up to 100x.
- Graduation moment — when a brain clears a threshold, a cutscene-style celebration. Important for business model conversion.

### Phase 4 — Rival AI squads.
- Procedural rival generation.
- Headless GA training rivals against a generic base schema in the background.
- First rival attack on the player's base (scripted for the onboarding, random after).
- Replay recording and playback.

### Phase 5 — Soldier attachment systems.
- Injury / medical tent.
- Kill counts, rename, first quirks, simple squad bonds.
- The "Sgt. Rico is injured" log-in notification.

### Phase 6 — The 10-minute hook sequence.
- Scripted onboarding. This gets polished *after* all the underlying systems work, because you can only write the hook once you know what the game is.

### Phase 7 — Monetization shop redesign.
- Compute sinks expanded.
- First-time-pay doubler.
- Battle pass scaffolding.

### Phase 8 — Playtest, retention measurement, iterate.
- Instrument the three-clock loop.
- Measure actual D1/D7/D30.
- Ship to a small friends-and-family cohort.
- Tune timers, tune rival difficulty, tune onboarding.

### Phase 9 — Real payment integration.
- Only after the above loop is proven to retain.
- Stripe PWA, not app-store IAP, per the existing Archive.md plan.

### Phase 10+ — Expansion.
- Human PvP (if retention justifies).
- Alliances / clans.
- More themed worlds (bedroom, sandbox, workshop).
- Seasonal content treadmill.

---

## The risks and open questions

### Risks I'm watching

- **Complexity creep.** The research was unambiguous: complexity is the #1 killer of base-builders. We have to resist the urge to ship 8 buildings, 12 soldier types, and 6 resource currencies. V1 should feel almost *too simple*. One vault, one training ground, one medical tent, walls. Add more only when retention data says the loop is proven.
- **Passive training being boring.** "Come back in 30 minutes" is a contract with the player. If what they come back to is just a number going up, the contract is broken. We need the graduation moment to feel like a Matrix download every single time.
- **The real ML pitch leaking complexity into UX.** The neural net is a business-model hook, not a UX element. Players should *see* the spectacle but never have to understand gradient descent. The sparkline and the "your soldier got better" demo are enough. If we start exposing weights, we've lost.
- **The rival AI being too hard or too easy.** Dopamine research says a 50/50 win rate feels best. We have to actively tune rivals to the player, not let the GA run free. This is a design knob, not a feature.
- **Injury permadeath fatigue.** If players lose soldiers they love too often, they rage-quit. If they never lose them, there are no stakes. Needs playtest.
- **The engine handling background training.** JS has no real background thread, and the app going to sleep kills loops. We'll need a "compute next tick on app resume" pattern that uses wall-clock deltas to catch up, capped at some maximum. This is a real engineering problem, not a design problem, but it affects the design.
- **Dashboard drift (the perennial risk).** Every screen we build has a gravitational pull toward looking like a web app. Stat readouts want to become tables. Upgrade menus want to become card grids. Training progress wants to become a progress bar with a percentage. The engineering path of least resistance is always the dashboard path, and we have to actively resist it on every single surface. This is not a one-time design pass — it's a standing discipline. **Every screen must be re-checked against the UX non-negotiables section above.** When in doubt, cut the screen and rebuild it as a diegetic element of the 3D world.

### Open questions I want to answer before building

1. **Grid or free placement for the base?** (My lean: soft grid for buildings, free for walls.)
2. **Is the "rival has your exact last layout memorized" feature cool or creepy?** (My lean: framed right, it's cool. "The Red Tide studied your base. They know your weak spots. Train harder." This is the same feature as CoC's revenge button, dressed up.)
3. **How permadeathy is the default mode?** (My lean: injury-only in the default, true permadeath as an opt-in hardcore mode. Matches XCOM and Fire Emblem's industry-standard approach.)
4. **Do rivals train offline against the player when the app is closed?** (My lean: yes, but we simulate this as lazy evaluation on app resume — we don't literally run GA on a server the player never sees. Cheaper, same player experience.)
5. **Do friendships between soldiers affect gameplay or just flavor?** (My lean: flavor first, then if retention needs more, gameplay bonuses in Phase 5+.)
6. **Does the base exist on one table or multiple?** (My lean: one table per world, player can expand to more tables as progression. Kitchen → bedroom → workshop mirrors the existing world system.)
7. **Should the first rival attack be scripted (tutorial) or real?** (My lean: scripted for reliability in the hook sequence. The first *real* rival attack hits in session 2.)
8. **Where does the compute actually live in the fiction?** (My lean: the compute *is* the intelligence the soldiers are running on. The vault is literally storing "processed thought." The game's premise becomes self-consistent: compute = AI = what you're protecting.)

---

## Success criteria

### For the design doc itself
- Andrew reads this and the game-concept pivot snaps into focus. If it doesn't, this doc needs a rewrite, not the game.

### For the first playable build (end of Phase 4)
- A new player opens `/game-concept`, experiences the 10-minute hook, lays down one wall, trains one soldier, survives one rival attack, and wants to see what happens tomorrow.
- The author of this plan (me) and the author of the game (Andrew) both independently play it for a week without being paid to.
- **The squint test passes.** A stranger glances at any screenshot and says "that looks like a mobile game" — never "that looks like a web app." Every screen shipped in `/game-concept` passes the UX checklist in the non-negotiables section above. If any screen fails the squint test, Phase 4 is not complete, full stop.

### For the first retention benchmark (end of Phase 8)
- D1 ≥ 40%, D7 ≥ 20%, D30 ≥ 10%. Measured. Instrumented. Real.
- At least one playtester has named a soldier after a real person and felt something when that soldier went to the medical tent.

### For the business
- A plausible path to $0.05-$0.12 ARPDAU at 5,000 DAU before we burn another quarter on new features.
- A compute shop where players spend money because the spectacle earned it, not because they were squeezed.

---

## Closing note

The game we've been building is mechanically impressive and emotionally empty. The pivot to a base you protect, populated by soldiers with AI brains you trained, is not adding features — **it's giving every feature we already have a reason to exist.**

The physics lab becomes the place where your base lives.
The training system becomes the building in the middle of that base.
The soldiers become characters you remember.
The compute economy becomes the thing you spend money on because you saw your soldier's brain get better and now he defended your vault.

We already built the hard parts. We just hadn't built the reason to care.

Let's build that next.

---

# Updates

> Append-only. Per the preservation rule at the top of this doc, entries here add to the plan — they do not overwrite anything above. Dated. Newest at the bottom.

---

## 2026-04-08 — Decisions: scope, reuse, universal destructibility

Three directives from Andrew after the plan was approved. These are binding design decisions for the `/game-concept` build.

### 1. Scope: `/game-concept` is a full replacement, not a side experiment

The original plan already named `/game-concept` as the new route, but understated how big this build is. Clarifying now:

- **`/game-concept` is designed to eventually replace everything currently at `/play`.** It is not a parallel mode, not a sandbox, not a demo. It is the new game. The current `/play` campaign, BattleScene, ResultScreen, PlacementTray, level configs, etc. all eventually retire.
- **This is a huge build.** We should plan for it accordingly — multiple phases, multiple weeks, no shortcuts that would force us to throw work away when we delete the old surfaces.
- **During development the old game stays alive.** The `/play` route and its files do not get deleted until the new game hits its Phase 4 success criteria (first playable rival-attack loop, onboarding, base persistence). Running both in parallel costs us nothing and gives us an instant rollback if the new direction stalls.
- **Migration, not wholesale replacement, for persisted state.** `rosterStore` and `gameStore` already contain soldier profiles and economy data that real (future) players will have. When `/game-concept` eventually replaces `/play`, the persisted state migrates forward — we do not wipe player progress. This means any schema changes to `SoldierProfile` (injuries, kill counts, quirks, scars, friendships) must be written as versioned Zustand persist migrations from day one, not retrofitted later.
- **Deletion checklist (to execute at the end of Phase 4, not before):** remove `/play` route from `App.tsx`, delete `BattleScene.tsx`, `Game.tsx` scene router's battle branch, `ResultScreen.tsx`, `PlacementTray.tsx`, `TutorialOverlay.tsx`'s battle-specific steps, level JSON configs, campaign store slices. Keep anything in the Reuse list below untouched.

### 2. Reuse list — specific files and systems that carry forward

A huge amount of the current codebase is genuinely good and should be preserved across the rewrite. Listed here so nobody accidentally deletes them during cleanup, and so the Phase 1 scaffold knows exactly what to import.

**UI and visual assets — keep and reuse directly:**

- **`src/ui/ToyIcons.tsx`** — all SVG icons, especially `GoldCoinIcon` and `MicrochipIcon` (the compute icon — note the actual name is `MicrochipIcon`, not `ComputeIcon`; referenced via `HUD.tsx:35`). Also `SoldierIcon`, `RifleIcon`, `RocketLauncherIcon`, `StarIcon`, `BackArrowIcon`, `BattleIcon`, `TrainIcon` and the rest. These are our handmade icon system and they already match the non-negotiable UX rules.
- **`src/three/models/flexSoldier.ts`** and `equipmentPoses.ts`, `poseBlender.ts` — the entire flexSoldier system. Pose rig, idle animations, weapon-specific stances, rocket kneel/fire, aim, shoot, throw. This is the visual identity of the game and there's no reason to rebuild it.
- **`src/three/models/SoldierUnit.tsx`** — the React wrapper that drives a flexSoldier with a unit status. Already works with the Rapier physics system (see `physicsControlled` prop).
- **`src/three/models/weaponMeshes.ts`** — all weapon models (rifle, rocket launcher, grenade, machine gun) and the `applyWeaponToSoldier` function.
- **`src/three/models/materials.ts`** and `TOY` palette — the plastic-toy material look. Critical to the aesthetic.
- **`src/three/models/ProjectileMesh.tsx`**, `jeep.ts`, `TankUnit.tsx`, `BarracksScene.tsx`, `SoldierPreview.tsx` — reuse for rival attack units and the base-viewing camera.
- **`src/three/worlds/*`** — `WorldRenderer`, `WorldGround`, `WorldLighting`, kitchen/workshop world configs. The base lives on these tables.
- **`src/three/effects/*`** — `ExplosionEffect`, `ScreenShake`, `ConfettiEffect`, `DustCloud`, `ImpactSpark`. All VFX stay.
- **`src/audio/*`** — entire synth engine, `sfx.ts`, `synthEngine.ts`, `voicePool.ts`. Free content, directly reusable. Training grounds get new sound beds built on this same engine.

**Engine and physics — keep:**

- **`src/engine/physics/battlePhysics.ts`** — all tuning constants. The audit already confirmed these are solid.
- **`src/engine/physics/*`** — hitpause, stickyZones, propState, perfMonitor, collisionGroups. All survive.
- **`src/three/physics/SoldierBody.tsx`** — the Rapier wrapper. Unchanged.
- **`src/three/physics/collisionGroups.ts`** — unchanged.
- **`src/three/models/Defenses.tsx`** — the unified `DestructibleDefense` system. This becomes the foundation for universal destructibility (see §3 below).
- **`src/engine/ml/*`** — `neuralNet.ts`, `geneticAlgorithm.ts`, `simulationRunner.ts`, all four scenario files (rocket/grenade/machineGun/tank). Unchanged. Rivals use this same stack.

**Stores — keep, extend, and migrate:**

- **`src/stores/rosterStore.ts`** — keep the structure, add fields to `SoldierProfile` for injuries, kill counts, quirks, scars, bond meters, brain genealogy. Write a persist-migration (v1 → v2) so existing players don't lose their roster.
- **`src/stores/gameStore.ts`** — keep the compute/gold economy functions (`addCompute`, `spendCompute`, `claimDailyCompute`, `spendGold`). The economy survives the pivot intact.
- **`src/stores/trainingStore.ts`** — extend for passive/active training modes (real-time tick accumulation, active observation state, training queue per soldier).
- **`src/stores/tutorialStore.ts`** — reused for the 10-minute hook sequence (see below).

**Tutorial system — keep the framework, rewrite the steps:**

- **`src/ui/TutorialOverlay.tsx`** + **`src/styles/tutorial.css`** + **`src/stores/tutorialStore.ts`** — the spotlight/overlay system is genuinely good and already drives a 13-step onboarding. The framework carries forward directly. Only the *content* of the steps gets rewritten to match the new 10-minute hook sequence from the main plan.

**Styles — keep the ones that express the toy-box aesthetic:**

- `src/styles/global.css`, `barracks.css`, `training.css`, `tutorial.css`, `store.css`, `homepage.css` — audit each for dashboard drift (see UX non-negotiables) and keep anything chunky, beveled, textured. Rewrite anything that smells like a web app.

**What retires at the end of Phase 4 (listed here so we remember not to reuse):**

- `src/scenes/BattleScene.tsx` — its physics and rendering patterns get reborn inside the new base-defense scene, but the file itself goes away.
- `src/scenes/Game.tsx` scene router — replaced by `/game-concept`'s own root scene.
- `src/ui/PlacementTray.tsx`, `ResultScreen.tsx`, `HUD.tsx`, `BarracksScreen.tsx`, `SoldierDetail.tsx`, `WorldSelect.tsx` — all level-based game UI. Their good parts (layout patterns, resource pills) get cannibalized into new base-view UI. The files themselves retire.
- `src/config/levels/*` (if present), `src/config/store.ts` (gets rewritten for the new compute-sink shop), level JSON configs.

**The audit principle for reuse:**

> If a piece of code expresses the toy-soldier aesthetic or solves a hard physics/ML/audio problem, it survives. If it expresses the level-based game loop, it retires. When in doubt, keep it — we can always delete later, but we can't un-rebuild.

### 3. Universal destructibility — every game object is a block field

**Directive: every game object in `/game-concept` uses the `DestructibleDefense` system.** Walls, sandbags, towers, training grounds, barracks, medical tent, vault, resource collectors, turrets, decorations — every buildable thing is a collection of `WallBlock`s with the same physics, cascade, and debris behavior.

This is a big unification. Its consequences:

**Why this is the right call:**

1. **It makes rival attacks feel visceral.** Clash of Clans' peak experience is watching your base get chewed apart brick by brick. We already built exactly that system for walls. Extending it to every building means every attack replay is a demolition derby, not a UI animation of HP bars depleting.
2. **It eliminates the HP-bar trap.** HP bars are the #1 dashboard-drift vector in strategy games. If a building has an HP number floating above it, we've lost the aesthetic. If a building instead *visibly crumbles* as it takes damage, the UI becomes diegetic and the spectacle does the work.
3. **It unifies the codebase.** Instead of walls (block system) + buildings (meshes with HP state machines) + props (destroyable but with different debris), we have one system. `DestructibleDefense` with different `DefenseStyle` values. The `buildXBlocks` functions already exist as the extension pattern — we just add `buildTrainingGroundsBlocks`, `buildMedicalTentBlocks`, `buildVaultBlocks`, `buildCollectorBlocks`.
4. **It creates endowment-effect density.** Players invested in every block they placed. A base where *everything* can be torn apart is a base where every placement decision matters.

**What this means technically (not binding yet, but the shape of the work):**

- `Defenses.tsx` needs to extend `DefenseStyle` from `'wall' | 'sandbag' | 'tower'` to include `'trainingGrounds' | 'medicalTent' | 'vault' | 'barracks' | 'collector' | 'turret' | …`. Each gets a `buildXBlocks()` function that returns a `BlockSpec[]` describing the initial layout.
- The `supportedBy` explicit-support topology already supports complex shapes (it's how the watchtower's platform + railings work). A training grounds building with roof, walls, and supports can be modeled the same way.
- **Health-as-structural-integrity.** A building's "HP" becomes "how many blocks are still alive." When blocks fall below some threshold (say, 30% per building, tunable), the building stops functioning — the Training Grounds stops training, the Medical Tent stops healing, the Collector stops collecting. **This makes rival attacks strategically consequential without any UI at all.** A rival knocks 50% of your Medical Tent apart, and your soldiers now take twice as long to recover. No number on screen told the player that. They just lived it.
- **Block-count scales with building size and importance.** A small collector might be 30 blocks. A wall segment is ~56 blocks (`WALL_COLS=8 × WALL_ROWS=7`). The Training Grounds is maybe 200 blocks. The Vault (the thing you're defending) might be 400 blocks, heavily armored, placed behind everything else. This also gives us a natural "defense weight" — bigger buildings cost more to destroy, just like in CoC.
- **Debris behavior needs tuning per building type.** Wood buildings (Training Grounds roof, Barracks) spawn wood chip debris. Metal buildings (Vault) spawn sparks and twisted metal. Canvas buildings (Medical Tent) spawn fabric tatters. Extend the existing `DEBRIS` system with per-style particle types. This is not blocking for Phase 1 but should be in the plan before Phase 5.
- **Building repair becomes a core loop.** After a rival attack, players need to rebuild. Repair takes time (passive timer, like CoC) and costs resources (gold or compute). This is a compute sink and a session hook — "come back in 30 min, your Medical Tent is repaired."
- **Functional colliders still needed.** The existing `getStaticCollider()` function returns a single fixed AABB per defense, which gets removed at <30% block integrity. This pattern extends cleanly: every building gets a fixed collider that soldiers can't walk through until enough of the building is destroyed, at which point the collider drops and soldiers can walk through the wreckage. Elegant.

**What universal destructibility does NOT mean:**

- **Terrain is not destructible.** The kitchen table, the wooden floor, the sandbox — the *world* is permanent. Only the things the player places on it can be destroyed. This keeps the play area stable across attacks.
- **Soldiers are not "destructible blocks."** Soldiers are Rapier rigid bodies with the existing capsule collider. They don't shatter into blocks when killed — they ragdoll via the `RAGDOLL` system we already built. Universal destructibility is for *buildings and placed objects*, not units.
- **Not every building is equally destructible.** The Vault is deliberately the hardest — huge block count, armored material, placed deepest. The Training Grounds is medium. Collectors are soft targets. Walls are the "fuse" that rivals have to burn through first. Tunable per building.
- **This is not a Phase 1 ask.** The building block scaffolding should start with 2-3 building types (Vault, Training Grounds, Collector) so we prove the system before writing 10 `buildXBlocks` functions. Phase 3+ expands the roster.

### Updated open questions

Appending to the Risks/Open Questions section above without modifying the existing list:

9. **When exactly do we delete the old `/play` files?** My lean: end of Phase 4, gated on the new game hitting its playability criteria. Not earlier. Until then the old game is free insurance.
10. **Do we version-bump the Zustand persist key (`toy-soldiers-roster` → `toy-soldiers-roster-v2`), or write an in-place v1 → v2 migration function?** My lean: in-place migration. Players don't lose progress, and we get a natural regression-test checkpoint.
11. **What's the minimum viable building roster for Phase 1?** My lean: Vault (the thing you defend), Training Grounds (the thing that expresses the ML hook), and a single Collector (the thing that makes the economy legible). Walls already exist. That's four block-field types, all reusing `DestructibleDefense`. Enough to prove the universal-destructibility approach without sprawling.
12. **How do we express "this building is damaged but still functional"?** My lean: visually obvious (blocks are missing), but no HP bar. A functional check runs every N seconds on the block-alive ratio; below threshold, the building stops functioning and shows a diegetic broken state (the Training Grounds parade ground empties, the Collector's spout falls over). Diegetic over abstract, every time.
13. **Do the kitchen/workshop world props (pans, mugs, cans) become destructible blocks too, or stay as the current `propState` system?** My lean: props stay on `propState` for now — they're small, numerous, and the existing system works. Revisit in Phase 5 if the aesthetic mismatch feels bad.

---

## 2026-04-08 — Directive: production build, not prototype

**Binding rule from Andrew:** we are past prototyping. Everything built for `/game-concept` is production code that has to be ready to ship to real, paying players. This is not a sandbox, it is not a demo, it is not a "we'll clean it up later" build. It is the product.

### What "production-quality" means for this build, concretely

This is the standard every file, every commit, every PR gets held to. When something doesn't meet it, we fix it immediately — we do not file a TODO and move on.

**Code organization:**

- **Every new file lives where a reader would expect to find it.** Domain-driven folders: `engine/base/`, `engine/rivals/`, `engine/training/`, `three/base/`, `three/rivals/`, `ui/base/`, `ui/training/`, etc. No "misc" folders. No files named `helpers.ts` or `utils.ts` that become dumping grounds.
- **Clear module boundaries.** `engine/*` stays renderer-free (zero `three` imports). `three/*` stays game-logic-free. `stores/*` owns state. `ui/*` owns React chrome. These layers already exist and the rewrite must preserve them.
- **No circular imports, no barrel re-exports that hide dependencies.** Each file's imports should be readable and trace a clean dependency tree.
- **Public vs. internal exports are explicit.** If a helper is only used inside one module, it is not exported. If a store slice is only used by one screen, it is colocated with that screen until a second consumer appears.

**Type safety:**

- **Zero `any`, zero `@ts-ignore`, zero `as unknown as X` hacks.** The current codebase has one or two of these — we do not add more, and we fix them as we touch surrounding code.
- **Discriminated unions for every state machine.** `SoldierStatus`, `BuildingState`, `TrainingPhase`, `RivalAttackPhase`, etc. No boolean flags that should have been enums.
- **Every Zustand store action has a strict return type.** No implicit `void` when it should be `boolean` (spend functions, etc.).
- **Schema versions are typed.** Persist migrations carry explicit `v1`/`v2`/`v3` types. No shape drift.

**State management:**

- **Persisted state is versioned from day one.** Every Zustand store that persists to localStorage has a version number, a migration function, and tests. We are not rewriting migrations later. If a field is added, the migration is written in the same PR.
- **No ephemeral data in persisted stores.** The line between "this survives a reload" and "this is per-session" is drawn explicitly in each store's `partialize`. Session-only state never accidentally leaks into localStorage.
- **Mutable refs for per-frame data, Zustand for UI state.** This pattern is already in place in BattleScene and it's correct — we extend it, we don't rewrite it. The 60fps loop never touches Zustand.

**Error handling and edge cases:**

- **Every async boundary handles failure.** Persist rehydration, image loading, audio context unlock, Rapier world init — each has a graceful failure path. Nothing silently breaks.
- **Loading and empty states are first-class.** Every screen has a defined "still loading" state, a "nothing to show" state, and a "something went wrong" state. Not placeholders, not `null` returns — actual designed states that match the UX non-negotiables.
- **No `console.log` in shipped code.** Dev-only logging goes behind `import.meta.env.DEV`. The `Archive.md` cleanup sprint already did this once; we enforce it from day one on the new build.
- **Null/undefined is handled explicitly.** No optional chaining into silent failure. If a soldier profile is missing, we show a meaningful error; we do not render `undefined undefined` in the UI.

**Performance:**

- **The 60fps target is a budget, not a goal.** Every new system in `/game-concept` gets measured via `perfMonitor` during development. Frame budget is 16.67ms; if a new feature burns 4ms, we know and we decide consciously whether to ship it.
- **Reusable temp vectors in hot loops, as already established.** The allocation-avoidance pattern from the current BattleScene carries into every new `useFrame` loop.
- **Lazy-load what can be lazy-loaded.** Training scenario code, rival AI training, building models — loaded on demand, not upfront. The existing `React.lazy` pattern in `App.tsx` extends to new routes.
- **DPR capped at 2, max units respected, draw call budget tracked.** Same targets as the existing spec (`Archive.md` §PERFORMANCE TARGETS).

**Persistence and data integrity:**

- **Player progress never regresses.** Every change to `SoldierProfile`, `GameState`, or any persisted schema includes a migration that preserves existing data. A player who installs today and updates in six months does not lose their roster.
- **Defensive schema reads.** Persisted data is parsed, not trusted. If a field is missing or malformed, the migration catches it and defaults gracefully. We never crash on a bad localStorage blob.
- **No unbounded arrays.** Kill logs, attack histories, rival memory — all capped at reasonable sizes with a rolling window. No "we'll clean this up in v2."

**Code review discipline:**

- **Every PR is reviewed against the UX non-negotiables section.** New screens get the squint test before merge.
- **Every PR is reviewed against these production standards.** No "just for now" comments that outlive the PR.
- **Dead code gets deleted in the PR that makes it dead.** We do not leave commented-out blocks, unused imports, or orphaned helper functions. The `Archive.md` cleanup sprint already demonstrated this is doable and worth it.
- **Commits are coherent.** One logical change per commit. Descriptive messages. Clean history.

**Testing approach:**

- **Unit tests for pure logic.** Neural net forward pass, GA selection/crossover/mutation, fitness functions, block support integrity checks, economy math (spend/earn/migrate). These are cheap to test and they're where silent bugs hide.
- **Integration smoke tests for the main loop.** "Does a battle run from spawn to victory without throwing?" "Does a training cycle graduate?" "Does a rival attack record a replay?" These run in CI on every commit.
- **No UI snapshot tests.** They're high-maintenance and low-value for a game this visual. We rely on the squint-test design review instead.
- **Manual QA gates at phase boundaries.** End of Phase 1, Phase 4, Phase 7 — a full hand-playtest checklist before the phase is called done.

**Observability (for when real players arrive):**

- **Analytics hooks wired in from day one, even if not connected yet.** Every key event (training started, training graduated, rival attack survived, compute spent, first-time-pay) has a typed event emitter. We don't retrofit instrumentation.
- **Error reporting.** A crash in production should produce a useful stack trace with game state context, not a silent white screen.
- **Privacy-respecting.** No PII in analytics. No telemetry the player didn't consent to. The doc says we want to be commercially successful; being predatory is the fast path to not being commercially successful.

### The production principle, in one sentence

> **Build every file as if it were going to be read by a stranger six months from now who has to maintain it under deadline pressure.** That stranger might be us.

### What this does NOT mean

- **It does not mean over-engineering.** Production quality is not the same as architectural maximalism. We still follow the rule from the main CLAUDE instructions: three similar lines is better than a premature abstraction. Production quality means the code we *do* write is correct, typed, testable, and maintainable — not that we add layers of indirection "for the future."
- **It does not mean we design for features we don't have.** Human PvP is out of scope; we do not add a "multiplayer abstraction layer" now. When we add it, we refactor. YAGNI still applies.
- **It does not mean we ship slower.** Good production discipline is faster than prototype discipline over the span of the project, because we don't eat the cleanup tax at the end. The only thing it costs is the impulse to skip the types, skip the migration, skip the review. We do not skip.

### Updated open questions

14. **Do we set up CI from day one, or wait until there's code to test?** My lean: day one. Type-check, lint, and the first unit test for the GA fitness function should all run in CI before Phase 1 lands. Getting the pipeline green on trivial code is cheap; getting it green on a sprawling codebase later is not.
15. **Do we adopt a stricter tsconfig (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`) at the start of the rewrite?** My lean: yes, and we fix any fallout in the reused modules in the same PR that adds the flag. The pain is front-loaded but capped.
16. **What's the error boundary strategy?** My lean: one top-level `ErrorBoundary` around the `/game-concept` route that shows a "Something went wrong — reload" toy-styled fallback. Plus local boundaries around the Rapier `<Physics>` tree and the training scenario code (the two places a runtime error would otherwise nuke the whole app).

---

## 2026-04-08 — Shipped: Phase 1a — `/game-concept` foundation slice

First code-writing sprint after plan approval. Carved Phase 1 of the build sequence into a tight "foundation only" slice that proves the three architectural bets (universal destructibility, production-quality from day one, heavy reuse of existing assets) before sprawling.

**What shipped:**

- New `/game-concept` route, lazy-loaded alongside `/play` and `/physics-test`
- New `@game/*` path alias added to `tsconfig.json` and `vite.config.ts`
- New domain folder `src/game/` with clean subfolders: `base/`, `buildings/`, `soldiers/`, `ui/`
- New `baseKitchenWorld` config in `src/config/worlds/baseKitchen.ts` — clone of kitchen theme/ground/edges with an empty `props: []` because level-01 clutter doesn't belong on a peaceful base
- New `GroundConfig.flat` flag added to `src/config/worlds/types.ts`; `WorldGround.tsx` honors it by skipping the procedural bump generator. Set `true` on baseKitchen. **Directly fixed the soldier-base-embedding bug** — visual ground was bumping up to 0.12 units tall where the flat physics collider couldn't match, so soldiers settled into visible hills. Combat worlds keep their bumps; base worlds are now perfectly flat.
- Extended `DefenseStyle` union in `src/three/models/Defenses.tsx` from `'wall' | 'sandbag' | 'tower'` to also include `'vault' | 'trainingGrounds' | 'collector'`. Added three new `buildXBlocks()` layout functions, extended the `buildBlocks()` and `getStaticCollider()` dispatchers, added three new convenience wrapper exports (`VaultDefense`, `TrainingGroundsDefense`, `CollectorDefense`). **Additive only — zero changes to existing wall/sandbag/tower runtime.** Universal destructibility architectural bet validated on first use: all new building types render through the same `DestructibleDefense` pipeline with the same cascade, debris, static-collider-removal, and support-topology logic that walls already use.
- New base-building wrapper components: `Vault.tsx`, `TrainingGrounds.tsx`, `Collector.tsx` (thin pass-through wrappers for forward-compat)
- New `StarterBuildings.tsx` — hardcoded Phase 1a layout (vault at `[-5, 0, 0]`, training grounds at `[0, 0, -1]`, collector at `[4, 0, 2]`)
- New `StarterSquad.tsx` — three idle toy soldiers at loiter positions around the buildings, rendered via existing `SoldierBody` + `SoldierUnit` + `flexSoldier` stack with `status: 'idle'` and `weapon: 'rifle'`
- New `BaseCameraRig.tsx` — a fresh `OrbitControls` wrapper with base-viewing defaults. Simpler than the existing `src/three/camera/CameraRig.tsx` because it has no battle-state coupling (no result phase, no auto-rotate on victory, no game store reads). Pan disabled to anchor the player on their base.
- New `BaseScene.tsx` — composes `WorldRenderer` (with `baseKitchenWorld`), `BaseCameraRig`, `StarterBuildings`, `StarterSquad`. Derives `tableBounds` from `baseKitchenWorld.ground.size` so the table size lives in one place.
- New `GameConcept.tsx` — page entry with full-bleed `<Canvas>`, `<Physics gravity={[0, -15, 0]}>` (same gravity as `/play` and `/physics-test`), `<BaseScene />` inside, `<BaseHUD />` as HTML overlay outside
- New minimal `BaseHUD.tsx` + `base-hud.css` — toy-styled back button (React Router `<Link>`) and "COMMAND BASE" title in Black Ops One gold. Beveled gradient button with 3D press state. Mobile breakpoint drops the title below the back button on narrow viewports.
- Dev-only homepage link `[DEV] /game-concept` gated behind `import.meta.env.DEV` so iteration doesn't require typing the URL

**Production discipline enforced from the first commit:**
- Zero `any`, zero `console.log`, zero `TODO`, zero `@ts-ignore` across all of `src/game/`
- File-level header docstrings on every new file
- Clean module boundaries (`engine/` still renderer-free, `three/` still logic-free, new `game/` consumes both)
- `tsc --noEmit` exits clean

**Reuse instead of rebuild:**
- `WorldRenderer`, `WorldGround`, `WorldLighting` — rendered as-is
- `flexSoldier`, `SoldierBody`, `SoldierUnit` — the existing soldier rendering stack works with no changes
- `DestructibleDefense`, `WallBlock` — the entire destructible block system accepts the new styles with zero runtime changes
- `Physics` + Rapier — same gravity, same collision groups, same physics feel across scenes
- `BackArrowIcon` from `ToyIcons` — reused for the back button
- Global CSS variables (`--font-display`, `--gold-text`, `--text-white`) — reused for the HUD chrome
- `HomePage.tsx` `<Link>`-based navigation pattern — reused (not PhysicsTest's plain `<a href>`)

**Verified end-to-end via preview MCP tools:**
- Route loads without console or server errors
- Scene renders the kitchen table, three destructible buildings, three idle soldiers
- Orbit camera works (drag rotates)
- Back button navigates to homepage
- Squint test passes at mobile (375×812) — after fixing a title/back button collision with a media query
- `/play` regression check clean — barracks and tutorial modal still load identically

**Files:** 12 new files in `src/game/` + `src/config/worlds/baseKitchen.ts` (~624 lines), 6 existing files modified additively.

---

## 2026-04-08 — Shipped: Phase 2a — drag-to-place base editing

The endowment effect loop. Player can now toggle into BUILD mode, pick a brush (Vault / Training Grounds / Collector / Wall), see a live ghost preview that colors green/red based on validity, and commit placements to a persistent base layout. Reloading the page restores what they built. This is where "my base" becomes a real thing.

**What shipped:**

- New persisted store `src/game/stores/baseStore.ts` using Zustand with the `persist` middleware. Schema `version: 1`, seeded with the Phase 1a starter layout as the first-time-user default. `partialize` exports only `layout` so session-only state (mode, brush) never leaks to localStorage. Actions: `setMode`, `toggleMode`, `selectBuildingBrush`, `selectWallBrush`, `clearBrush`, `rotateBrush`, `placeBuilding`, `placeWall`, `resetToStarterLayout`. Every placement action runs validation through the pure helper and returns `boolean`.
- New `Brush` discriminated union: `{ kind: 'building'; buildingKind: BuildingKind; rotation: number } | { kind: 'wall'; rotation: number } | null`. TypeScript enforces exhaustive handling at every call site.
- New pure math module `src/game/base/footprints.ts` — zero React, zero Three.js, zero Zustand imports. Exports: `FootprintAABB`, `getBuildingFootprint`, `getWallFootprint`, `aabbOverlap`, `withinTableBounds`, `snapToGrid`, and `isValidPlacement`. The full validation function is the single source of truth called by both the store (on commit) and the ghost preview (for green/red coloring) — the two cannot disagree.
- Rotation math (`rotateHalfExtents` internal helper) handles all four 90° quadrants exactly, plus negative rotations and rotations > 2π via normalization. Arbitrary angles fall through to a conservative axis-aligned bounding rectangle.
- New exported `BUILDING_FOOTPRINTS` constant in `Defenses.tsx` — `Record<DefenseStyle, { halfW, halfD }>` derived from the existing `getStaticCollider` data. Single source of truth for XZ-plane footprints. Adding a new DefenseStyle is now a compile-time error until this record is extended, which keeps footprint math and collider data from drifting.
- New `GhostPlacement.tsx` — module-level raycaster + mouse vec + ground plane (allocation-free per frame), module-level `window.addEventListener('pointermove')` listener, pre-built shared valid/invalid materials. `useFrame` reads the current brush from the store, raycasts to the Y=0 plane, snaps to the 0.5 grid, runs `isValidPlacement`, updates geometry/material/position/rotation on a single mesh. When no brush is active the mesh is hidden.
- New `PlacementSurface.tsx` — an invisible plane covering the table that captures commit taps via R3F's `onPointerUp`. Uses `e.point.x/z` (world-space) — no manual raycasting. Only rendered when mode is 'build' AND a brush is active.
- New `BuildGridOverlay.tsx` — a single `lineSegments` mesh drawing a subtle 0.5-unit dotted grid on the table in BUILD mode only. Uses the global `--text-white` color at 0.08 opacity.
- New `LoadingFallback.tsx` + `loading-fallback.css` — toy-styled overlay with "DEPLOYING COMMAND BASE..." pulsing gold text. CSS `@keyframes` handles the pulse + fade-out sequence; fade starts at 600ms and completes at 1.6s. No React state, no Suspense restructuring.
- Refactored `StarterBuildings.tsx` → renamed to `BaseBuildings.tsx`. Now reads `layout.buildings` from the store and dispatches each instance to the appropriate wrapper. The Phase 1a hardcoded layout moved into `baseStore.ts` as `STARTER_LAYOUT`.
- New `BaseWalls.tsx` — reads `layout.walls` from the store and renders each via the existing `WallDefense` component. Walls use the exact same destructible pipeline as buildings.
- Updated `BaseCameraRig.tsx` to accept a `brushActive: boolean` prop. When true, `enableRotate={false}` and `enableZoom={false}` so the player's drag-to-place input isn't competing with camera orbit. Pan was already off.
- Updated `BaseScene.tsx` to wire everything together: reads `mode` and `brush` from the store, passes `brushActive` to the camera, conditionally renders `PlacementSurface`, `GhostPlacement`, and `BuildGridOverlay` when in build mode.
- New `BuildTray.tsx` + `build-tray.css` — bottom-of-screen brush selection with four chunky beveled buttons (VAULT, TRAINING, COLLECTOR, WALL). The selected brush has a gold glow border. Tapping the already-selected brush clears it. Color swatches on each button match the building's body color.
- Updated `BaseHUD.tsx` to add the `ModeToggle` (VIEW ↔ BUILD button top-right), `BuildTray` (bottom-center, visible in BUILD mode), `Rotate` and `Cancel` corner buttons (visible when a brush is active), and a dev-only `RESET BASE` button under the back button gated behind `import.meta.env.DEV`.
- Updated `GameConcept.tsx` to render `LoadingFallback` as a sibling overlay to `BaseHUD`. CSS fade-out dismisses it cleanly without any React state management.

**Verified end-to-end via preview MCP tools:**
- Store seeds starter layout on first load (localStorage cleared → three Phase 1a buildings appear)
- Mode toggle flips VIEW ↔ BUILD, `BuildTray` appears/disappears, HUD button color changes to gold in BUILD mode
- All four brushes selectable; gold border highlights the active selection
- Ghost preview follows pointer via raycast-to-Y=0-plane, 0.5 grid snap working
- Ghost colors **red over existing buildings** (verified by screenshot with wall ghost over the Collector)
- Ghost colors **green in empty areas** (verified by screenshot with wall ghost on empty right side of table)
- CANCEL and ROTATE buttons appear in bottom corners when brush is active
- Placement commits work via the store action (verified by direct action call → `BaseWalls` reactively renders the new wall in the scene)
- Persistence verified: placed wall survives page reload with `mode: 'view'`, `brush: null`, but `layout.walls: [{ position: [6, 0, -3], rotation: 0 }]`
- Dev reset button wipes placed walls and restores the exact starter 3-building layout
- Mobile viewport layout verified via DOM bounding rects: BuildTray at y=741-800 (thumb zone), Cancel/Rotate at y=691-722, no collisions with back button or title
- `/play` regression check clean — barracks and tutorial modal still load identically

**Files:** 10 new files (`baseStore.ts`, `footprints.ts`, `GhostPlacement.tsx`, `PlacementSurface.tsx`, `BuildGridOverlay.tsx`, `LoadingFallback.tsx`, `BaseBuildings.tsx`, `BaseWalls.tsx`, `BuildTray.tsx`, three CSS files), 7 modified files. `StarterBuildings.tsx` deleted in the same commit that made it dead. Zero `any`, zero `console.log`, zero `TODO` across all new code. `tsc --noEmit` clean.

---

## 2026-04-08 — Shipped: Phase 1b — housekeeping sprint

Closed the "day one" drift from the production-build directive (open questions 14, 15, 16) before Phase 3 could compound it. All additive — no runtime behavior changes to existing features.

**Testing infrastructure:**

- Added `vitest` as a dev dependency (latest 4.1.3)
- New `vitest.config.ts` that extends `vite.config.ts` via `mergeConfig` so tests inherit all `@game/*`, `@engine/*`, `@three/*` etc. path aliases. `environment: 'node'` by default since we're only unit-testing pure logic.
- New `package.json` scripts: `typecheck` (whole project), `typecheck:game` (scoped strict), `test` (one-shot), `test:watch`
- First test file `src/game/base/footprints.test.ts` — **33 tests, all passing** in ~300ms:
  - `snapToGrid`: correct rounding, always-zero Y, idempotent, handles signed-zero
  - `aabbOverlap`: clear overlap, no overlap, strict edge-touching (not counted), single-axis overlap, short-circuit on Z
  - `getBuildingFootprint` rotation: unchanged at 0°/180°, swapped at 90°/270°, normalized for negative rotations, normalized for rotations > 2π, correct footprint center placement
  - `getWallFootprint`: correctly long-along-X at 0°, swapped long-along-Z at 90°
  - `withinTableBounds`: inside, past X edge, past Z edge, exactly at max, past negative edge, inset margin scaling
  - `isValidPlacement`: null brush rejected, empty base accepts, past-edge rejected, overlap rejected, starter-layout integrity (all three hardcoded starter positions verified mutually valid), rotation-dependent overlap (same position valid at 0° but invalid at 90° — the exact class of silent bug that would make a green ghost lie)
- Writing the tests caught two genuine test-side bugs (JavaScript signed-zero in `Math.round(-0.2)/2`, and a miscalculation of wall footprint reach) — neither was a code bug, but both were assertions I'd have been wrong about without the test runner catching me.

**CI:**

- New `.github/workflows/ci.yml` — runs on push to main and on pull requests
- Node 20, `npm ci`, cached
- Three gates: `npm run typecheck`, `npm run typecheck:game`, `npm test`
- Pipeline will fail loudly if any of the three breaks. No more manual `tsc --noEmit` runs as the only safety net.

**Strict types for new code:**

- New `tsconfig.game.json` — extends main tsconfig, adds `noUncheckedIndexedAccess: true`, includes only `src/game` and `src/vite-env.d.ts`
- Main `tsconfig.json` deliberately left alone — flipping `noUncheckedIndexedAccess` globally produces 318 errors across 24 files of pre-existing legacy code (BattleScene, jeep.ts, neural net visualizations, etc). Fixing that is over-engineering per the plan.md YAGNI rule; all of it retires in Phase 4. The scoped config enforces the stricter bar on new code only.
- Fallout on new code was minimal but real:
  - `buildTrainingGroundsBlocks` in `Defenses.tsx` was using indexed post-position access + dispatched destructuring — restructured to use a `pushPost(pos, col) → index` helper with named locals (`plFL`, `plFR`, `plBL`, `plBR`). Cleaner code as a side effect.
  - The tower-legs loop `buildTowerBlocks` had the same indexed-access pattern — added an `if (!legPos) continue` guard.
  - **Caught a genuine latent bug in the pending-collapse loop** (`DestructibleDefense` `useFrame`): the loop iterated backwards for splicing but dereferenced `pendingCollapses.current[i]` without checking for undefined. The iteration invariant makes it technically safe today, but strict indexed access surfaced the missing guard — added `if (!pc) continue`. This is exactly the class of silent bug the flag exists to catch.

**Typed analytics event emitter:**

- New `src/game/analytics/events.ts` — `EventMap` catalog with compile-time-checked payloads for every game event: `base_mode_toggled`, `base_brush_selected`, `base_brush_cleared`, `base_brush_rotated`, `base_building_placed`, `base_building_place_rejected`, `base_wall_placed`, `base_wall_place_rejected`, `base_reset_to_starter`
- `track<K>(event, data)` function with generic type narrowing: TypeScript will refuse to compile if the payload shape doesn't match `EventMap[K]`
- Dev-only ring buffer capped at 500 entries, exposed on `window.__events` for inspection during development. Production telemetry sink is a single swap point — no retrofitting every call site later.
- Wired `track()` calls into every mutating action in `baseStore.ts`: mode toggle, brush selection/clear/rotate, successful placements, rejected placements, dev reset
- **Verified end-to-end:** toggled mode + selected wall brush in the preview, read `window.__events` → two entries present: `base_mode_toggled { to: 'build' }` and `base_brush_selected { kind: 'wall' }`. Typed payloads flowing correctly.

**Error boundary:**

- New `src/game/GameConceptBoundary.tsx` — class component (React error boundaries only work as classes) with `getDerivedStateFromError` and `componentDidCatch`. Toy-styled fallback: "COMMAND BASE OFFLINE" headline in gold, chunky "REDEPLOY" (reload) and "HOME" (back to `/`) buttons with beveled gradients and 3D press states, dev-only stack-trace panel. No white-screen-of-death if anything in the render tree throws.
- Dev-only `console.error` in `componentDidCatch` for stack visibility — gated behind `import.meta.env.DEV` per the no-console-log-in-prod rule.
- Wired into `App.tsx`: `/game-concept` route now renders `<GameConceptBoundary><GameConcept /></GameConceptBoundary>`. Old routes (`/`, `/play`, `/physics-test`) unchanged.

**Security:**

- `npm audit` caught a pre-existing high-severity vulnerability in Vite 8.0.3 (path traversal in dev server). Patched to 8.0.7 via `npm audit fix`. Zero vulnerabilities post-patch.

**Verified end-to-end:**
- `npm run typecheck` → clean (0 errors across whole project)
- `npm run typecheck:game` → clean under strict `noUncheckedIndexedAccess`
- `npm test` → 33/33 passing in ~300ms
- `/game-concept` renders with full Phase 2a visual parity after the refactoring (verified by screenshot)
- Analytics events fire correctly end-to-end (verified `window.__events` population in preview)
- `/play` regression check clean
- No server errors, no console errors

