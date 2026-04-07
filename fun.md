# FUN.md -- The Vision

## One Sentence

You're a kid playing with toy soldiers on a kitchen table, training
them to fight, watching them learn, laughing when they fail, and
feeling like a genius when a crazy plan actually works.

---

## The Two Loops

This game has two core loops. Both must be fun on their own, and
they must feed each other.

### Loop 1: TRAINING (watching soldiers learn)

You pick a soldier, pick a weapon, and drop them into a training
arena. The arena IS the world they'll fight in -- the Kitchen Table
with its coffee mug, cereal boxes, and table edges. They fire at
practice targets using a neural net brain that starts completely
random.

**Generation 1:** Your rocket soldier fires at the ceiling. A rocket
sails off the table. Another one hits the cereal box and sends chunks
flying. You're laughing because it's absurd.

**Generation 10:** They're getting closer. Rockets land near targets
but the arc is wrong. One accidentally hits the coffee mug and it
rolls into a target. Interesting.

**Generation 20:** They've figured it out. Tight groupings. Learned
to use elevation for distance. They even seem to "prefer" shooting
near the table edge because targets there get knocked off and that
scores higher.

You WATCH this happen in real time. The training arena is a 3D
spectacle with the same props, physics, and comedy as the real
battles. Training isn't a loading bar -- it's a show. You're
watching your little plastic soldier go from idiot to expert, and
every generation has moments that make you laugh or say "wait, did
they just figure that out?"

**Why this is fun (mapped to research):**
- *Every level teaches something new (#7):* Each generation IS a
  lesson. The brain visibly improves. You learn what the weapon can
  do by watching the NN discover it.
- *Near-miss architecture (#3):* Early generations produce constant
  near-misses. "So close!" drives you to watch more generations.
- *Emotional arc (#9):* Assessment (watch gen fire) -> Realization
  ("they're getting better!") -> Anticipation -> Payoff (graduation!)

### Loop 2: BATTLE (watching the plan collide with reality)

You pick your trained army. You place them on the Kitchen Table.
You hit FIGHT. And then physics happens.

Your trained rocket soldier fires a perfect shot at the enemy
cluster. The rocket hits -- but the blast knocks a coffee mug
sideways. The mug rolls into YOUR rifle soldier and pushes him
to the table edge. He teeters. Falls off. Tiny scream.

Meanwhile, your untrained grenadier (you couldn't afford to train
everyone) throws a grenade at a completely wrong angle. It bounces
off the cereal box, lands in the syrup puddle, and explodes right
under three enemies. Triple kill. By accident.

**You didn't script any of this. The physics did.**

**Why this is fun (mapped to research):**
- *Surprise engine (#2):* physics interactions create unexpected
  outcomes from simple, consistent rules.
- *Interesting compromises (#1):* powerful weapons near edges risk
  your own soldiers. Trained soldiers are precise but expensive.
  Untrained soldiers are cheap but chaotic.
- *Input randomness, output determinism (#6):* the level setup
  varies, but once you hit FIGHT, physics is deterministic. Same
  placement = same outcome. Your CHOICES determined the result.

---

## The Connection: Training Makes Battle Personal

The research says players project personality onto units they invest
in (XCOM apophenia). Training IS the investment.

When SGT RICO -- who you watched stumble through 20 generations of
training, who finally graduated with a 0.85 fitness score, who you
equipped with your only rocket launcher -- gets knocked off the table
by his own rocket's blast radius... that HURTS. And it's funny. And
you immediately want to retry with better placement.

When PVT NEWBIE -- untrained, using a basic rifle, deployed because
you were out of budget -- somehow gets the final kill with a lucky
headshot... that's the screenshot you send to a friend.

**Training creates the emotional stakes. Battle creates the comedy.
Together, they create stories.**

---

## How Physics Creates Comedy

### Rule 1: Everything Responds to Force

Every object in the world is a Rapier rigid body. When an explosion
happens, it applies impulse to EVERYTHING in radius:

- Soldiers (friend AND foe) get knocked back
- Props (mugs, cans, bottles) tip, roll, or fly
- Wall blocks shatter into debris that can hit things
- Dead soldiers topple and slide

This means every explosion has consequences the player didn't fully
predict. The research calls this "chain reaction potential" -- System
A triggers System B triggers System C.

### Rule 2: The Table Edge Is The Universal Punchline

Every world is a table. Tables have edges. Falling off = death + a
tiny scream + the player laughing.

This one mechanic creates ALL the interesting compromises:

- **Placement near edge:** better sight lines but higher fall risk
- **Powerful weapons:** more damage but more knockback (for everyone)
- **Grenadiers near edge:** can push enemies off but grenades bounce
  unpredictably if untrained
- **Trained soldiers near edge:** precise enough to push enemies off
  deliberately, but one miscalculation and THEY fall
- **Props near edge:** a rolling mug can push enemies off... or you

### Rule 3: Destruction Creates Chaos

Walls break into individual blocks. Each block is a physics object.
When a wall gets hit by a rocket:

- Some blocks are destroyed (gone)
- Some blocks fly outward (debris that can hit soldiers)
- Some blocks lose support and cascade-collapse downward
- The cover you built is now a hazard to your own soldiers

This means walls are a TRADEOFF: protection that becomes shrapnel.

### Rule 4: Props Are Weapons, Not Scenery

Giant household objects on the table aren't decoration. They're
physics objects with tags that determine behavior:

| Tag | Behavior | Examples |
|-----|----------|----------|
| knockable | Tips/rolls when hit by force | Coffee mug, soda can |
| explosive | Detonates at damage threshold | Oil barrel, shaken soda |
| destructible | Shatters into block debris | Cereal box, flower pot |
| sticky | Slows movement through zone | Spilled syrup puddle |
| launcher | Applies upward force | Spoon catapult, spring pad |

Players learn these tags through play and start planning around them:
"If I put my rocket soldier THERE, the blast will tip the mug into
the enemy cluster and push them all toward the edge."

---

## How Training Creates Fun

### Training Happens In The Real World

Training arenas should NOT be flat empty rooms. They should be
simplified versions of the actual battle worlds. The Kitchen Table
training arena has the table edges, a cereal box or two, and some
targets. The soldier learns to aim IN the world they'll actually
fight in.

This means:
- The NN can learn to use table edges (knock targets off = high score)
- The NN can learn that shooting near props creates consequences
- When you see a trained soldier "prefer" certain angles in battle,
  you recognize those angles from watching them train
- Training and battle feel like the same game, not separate modes

### The Comedy Of Learning

Genetic algorithm training is inherently funny because Generation 1
is ALWAYS terrible. Every training session starts with comedy:

- Rocket soldiers firing straight up
- Grenadiers dropping grenades at their own feet
- Machine gunners spraying in circles
- Tanks driving into walls

And then it gets better. Watching a neural net go from "fires at the
sky" to "precision strikes" in real time is genuinely satisfying.
It's the same dopamine hit as watching a speedrun -- witnessing
mastery develop.

**Key insight:** we should show the BEST and WORST of each generation.
"Gen 5 MVP: 3 target hits, 2 edge kills" vs "Gen 5 WORST: 0 hits,
fell off table." The contrast is comedy AND motivation.

### Training Informs Battle Decisions

Because the player WATCHES training, they learn what their soldiers
can do. They saw SGT RICO figure out the perfect rocket angle for
edge-pushing during Gen 15. Now in battle, they KNOW to place Rico
near the right edge. The training loop TEACHES the battle loop.

---

## The Untrained Chaos Strategy

Untrained soldiers shouldn't be useless. They should be a VIABLE
alternative strategy:

- Untrained soldiers cost less to deploy
- They fire with wild random offsets (comedy value)
- Sometimes they accidentally discover things trained soldiers wouldn't
  (a stray grenade bouncing off a prop into an enemy)
- "5 cheap untrained rookies" vs "2 expensive trained specialists"
  should BOTH be valid approaches to the same level

This maps to the Timmy/Johnny/Spike framework:
- **Timmy (spectacle):** brings the maxed-out tank. BOOM.
- **Johnny (creativity):** brings 4 untrained grenadiers. Chaos = art.
- **Spike (optimization):** brings 2 trained rocket soldiers, edge-pushes
  everything with surgical precision.

All three should get 3 stars on the same level through different paths.

---

## The Three Worlds

### World 1: Kitchen Table
*Teaches: placement, knockback, edges, basic props*

**Props:** Cereal box (destructible cover), coffee mug (knockable,
rolls when hit), syrup bottle (breaks into sticky zone), spoon
(launcher at table edge)

**What the player learns:**
- Edges are dangerous AND useful
- Props react to explosions
- Placement matters more than firepower

**Battle 1-1: "Breakfast Skirmish"** -- Simple. Enemies march through
cereal boxes. Teach placement and edge awareness.

**Battle 1-2: "Syrup Trap"** -- Syrup bottle, spoon catapult active.
Enemies from the side. Teach prop interactions and chain reactions.

### World 2: Workshop Bench
*Teaches: prop chains, multiple threat types, elevation*

**Props:** Tape measure (wall/cover), hammer (knockable, area crush
when toppled), rolling dowel (rolls across bench when hit), scattered
nuts/bolts (small knockable debris)

**What the player learns:**
- Heavy props are weapons (hammer)
- Rolling objects create moving hazards
- Faster enemies require different strategies

**Battle 2-1: "Nuts and Bolts"** -- Jeeps appear (fast enemies).
Spinning ruler hazard. Nuts/bolts as mini-props.

**Battle 2-2: "Hammer Time"** -- Loose hammer. Tanks appear. The
hammer can crush a whole squad if you topple it right. Multiple
placement elevations.

### World 3: Backyard Picnic Table
*Teaches: slopes, wind, advanced multi-hazard management*

**Props:** Flower pot (destructible, shatters into chunks), soda can
(explosive, accumulates shake), garden hose (pushes soldiers when
"on"), book under one leg (creates slope)

**What the player learns:**
- Slopes change everything (grenades roll, soldiers drift)
- Multiple hazards can chain together
- Wind adds a layer of prediction to every shot

**Battle 3-1: "Garden Party"** -- Tilted table. Grenades roll
downhill. Soda can as timed explosive.

**Battle 3-2: "The Last Stand"** -- Everything active. Wind gusts.
Multiple soda cans for chain eruptions. All enemy types.

---

## Soldiers Interact With The World

Right now soldiers walk in straight lines. That's boring and
predictable — the opposite of what the research says creates fun.
Soldiers need to USE the world, not just walk through it.

### The Scaling Path (lean, each layer builds on the last):

**Layer A: Physics IS pathfinding (FREE — already built)**
Soldiers are Rapier dynamic bodies. Props are Rapier dynamic bodies.
They already collide. When an enemy marches toward Intel and there's
a cereal box in the way, Rapier pushes them around it. No pathfinding
code needed. The physics engine IS the navigation system.

**Layer B: Steering behaviors (thin, ~30 lines per behavior)**
Simple rules layered on top of the march-to-Intel velocity:
- **Cover seeking:** "If being shot at and a prop is within 3 units,
  move behind it." Enemies duck behind cereal boxes under fire.
- **Spread:** "If within 1 unit of another soldier, nudge apart."
  Prevents clumping (and makes explosions less devastating).
- **Survival:** "If health < 30%, prefer paths near cover."
  Wounded enemies play smarter, creating tension.
- **Flanking:** "If blocked by a wall for >2 seconds, try going
  around." Enemies route around defenses instead of stacking up.

These modify the desired velocity before calling setLinvel(). They
don't replace Rapier — they guide it. Each behavior is independent,
stackable, and trivially cheap (distance checks, no pathfinding grid).

**Layer C: NN world awareness (expands training)**
The same sensors steering behaviors use (nearest prop, nearest edge,
cover direction) become neural net inputs for player soldiers:
- Current 6 inputs → expand to 10-12
- Add: edge distance, nearest prop distance, prop direction, cover angle
- Trained soldiers learn to USE the world (stand near edges for
  knockback kills, bounce grenades off props, take cover)
- This makes TRAINING more fun — you watch them discover environment
  tactics, not just learn to aim

**Why this scales:**
- Layer A is free (already have it)
- Layer B is additive (doesn't replace A)
- Layer C reuses B's sensor data (doesn't replace B)
- Each layer makes soldiers feel smarter without throwing away work
- Enemy types can mix layers: infantry gets B, tanks ignore B (they
  just drive through everything), jeeps get B with "flanking" only

**The payoff for fun.md goals:**
- Enemies hiding behind your own cereal boxes = interesting placement
  decisions (do you destroy the cover to hit them?)
- Trained soldiers learning edge-push tactics = training is MORE fun
- Enemies spreading out = explosions require better aim
- Different enemy behaviors per type = each wave feels different

---

## Restrictions = Creativity

The research is clear: restrictions force creative thinking. Each
battle restricts differently:

- **3-5 soldier slots** per battle (every slot matters)
- **Tight gold budget** (can't afford the "ideal" army)
- **Some battles restrict weapons** ("no rockets" forces new thinking)
- **Placement zones vary** (can't always stack left side)
- **Star challenges encourage completely different approaches:**
  - 1 star: just win
  - 2 star: win while doing X (use prop, get edge kills, etc.)
  - 3 star: win with brutal restriction (2 soldiers only, no walls)

---

## The Retry Loop

- **Instant:** death-to-gameplay under 1 second
- **Reframed:** button says "TRY DIFFERENT ARMY?" not "Retry"
- **No punishment:** losing costs nothing
- **Short battles:** 2-3 minutes max
- **Near-miss feedback:** "ENEMIES REMAINING: 1" not "YOU LOST"

---

## The North Star

A player trains SGT RICO for 20 generations on the Kitchen Table.
Watches him learn to arc rockets over cereal boxes. Deploys him in
Battle 1-2. Rico fires a perfect rocket at an enemy cluster near
the syrup bottle. The bottle shatters. Syrup puddle forms. Three
enemies get stuck. Rico fires again. The blast knocks a coffee mug.
The mug rolls through the stuck enemies, pushing them all off the
table edge. Five kills from two rockets.

The player screenshots it. Sends it to a friend. The friend downloads
the game because they want to train THEIR soldier to do that.

**That's the game.**

---

## Implementation Priority (updated post-audit)

### P0: Make the surprise engine WORK (unblocks everything)
- [ ] Battle explosions (rockets/grenades) affect ALL Rapier bodies,
      not just soldiers — props fly, mugs roll, chain reactions happen
- [ ] Prop tags actually do things: destructible shatters, explosive
      chains, sticky creates slow zones
- [ ] Table edge fall scream sound (sfx.fallScream already exists)

### P1: Soldiers interact with the world
- [ ] Layer A: verify Rapier collision pathfinding works naturally
- [ ] Layer B: cover seeking + spread + survival steering behaviors
- [ ] Different enemy types use different behaviors

### P2: Training becomes entertainment
- [ ] Training arena uses simplified world geometry (Kitchen Table
      with edges + 1-2 props instead of flat room)
- [ ] Fitness rewards edge-push kills and prop interactions
- [ ] Show best/worst of each generation for comedy contrast

### P3: Workshop + Backyard worlds
- [ ] Workshop config + props (hammer, dowel, tape measure)
- [ ] Backyard config + props (soda can, flower pot, garden hose)
- [ ] Slope + wind mechanics for Backyard

### P4: Polish + juice
- [ ] Kill feed messages ("SGT RICO fell off the table!")
- [ ] Near-miss feedback (visual + audio)
- [ ] Soldier stat tracking across battles
- [ ] Victory celebration improvements
- [ ] Sound variety (death sounds, impact variation)

---

*Written: 2026-04-06, updated 2026-04-07*
