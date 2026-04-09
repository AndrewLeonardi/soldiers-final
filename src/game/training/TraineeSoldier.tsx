/**
 * TraineeSoldier — a single physicsless soldier rendered inside the
 * Training Grounds interior.
 *
 * This is the visual payload for the Phase 3a "dumb soldier" spectacle.
 * It does exactly one thing: render a soldier whose pose, rotation, and
 * firing state mirror whatever the training store's live GA evaluation
 * says the current best-individual's brain is doing. When no training
 * run is active, it renders with an idle pose and doesn't move — the
 * statue moment.
 *
 * ─ Why physicsless ─
 *
 * The trainee lives inside a tiny enclosed arena (the Training Grounds
 * interior, roughly 1.8m × 0.95m). Wrapping them in a Rapier `SoldierBody`
 * would mean capsule collisions against the building blocks, the table
 * edge, and eventually rival units. None of that is what we want: the
 * trainee should never move from their spawn point except when the
 * GA's `applyOutputs` says they should, and they should never interact
 * with anything physically. A plain `<group position>` driven by the
 * sim state is cleaner and cheaper.
 *
 * ─ How the pose is driven ─
 *
 * When `phase === 'idle'`:
 *   - `unit.position = [0, 0, 0]` (rooted to the TG floor)
 *   - `unit.facingAngle = 0` (facing toward the target can)
 *   - `unit.status = 'idle'` → animates with `poseIdle`
 *   - `stateAge` is frozen, so no muzzle flash
 *   - This is the statue. The player sees a soldier holding a rocket
 *     launcher, breathing subtly (flexSoldier's idle pose includes a
 *     small vertical bob), doing absolutely nothing with the weapon.
 *
 * When `phase === 'running'`:
 *   - Read `live.simState` from the store every frame.
 *   - The rocket scenario tracks `soldierRotation` — we map that to
 *     `facingAngle` so the trainee visibly aims where the GA says.
 *   - When `simState.justFired` flips true, we set `status: 'firing'`
 *     and reset `stateAge` to 0, which triggers the muzzle flash in
 *     SoldierUnit for ~0.1s. The flexSoldier pose system blends to
 *     the fire pose automatically.
 *   - Otherwise we hold `status: 'aiming'` during a run, which
 *     flexSoldier treats as a ready-to-fire stance.
 *
 * When `phase === 'graduated'`:
 *   - Back to `idle` until the cutscene clears. (Step 8 will play a
 *     triumphant idle or victory pose.)
 *
 * ─ Local vs world space ─
 *
 * TraineeSoldier's `SoldierUnit` uses `physicsControlled={false}`, which
 * means `unit.position` drives the SoldierUnit's internal group via
 * `position.lerp(target, ...)`. That lerp happens in the SoldierUnit's
 * local coordinate space — so if we wrap TraineeSoldier in a parent
 * `<group position={tgWorldPosition}>`, the trainee's `position: [0, 0, 0]`
 * places the feet on the TG floor in world space. That's exactly how
 * `TrainingGroundsInterior` composes us.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SoldierUnit } from '@three/models/SoldierUnit'
import type { WeaponType } from '@config/types'
import { useTrainingStore } from '@game/stores/trainingStore'

interface TraineeSoldierProps {
  /** The slot this trainee represents — used to read phase and live state. */
  slotId: string
  /** The weapon the trainee is equipped with (visual only; brain is upstream). */
  weapon: WeaponType
}

/**
 * Minimal `UnitLike` shape that drives the SoldierUnit render. Fields
 * outside the SoldierUnit interface stay local.
 */
interface TraineeUnit {
  id: string
  team: 'green'
  position: [number, number, number]
  rotation: number
  facingAngle: number
  status: 'idle' | 'aiming' | 'firing'
  weapon: string
  stateAge: number
  spinSpeed: 0
  velocity: [0, 0, 0]
  health: 100
  maxHealth: 100
}

/**
 * Default facing: +X direction in TG-local space, toward the parade
 * ground target. In Three.js Y-up with `facingAngle` passed to
 * `lerp(y, targetRot, ...)`, a rotation of `Math.PI / 2` rotates the
 * soldier's forward vector (which starts pointing -Z) to point +X.
 */
const FACING_TOWARD_TARGET = Math.PI / 2

export function TraineeSoldier({ slotId, weapon }: TraineeSoldierProps) {
  // Mutable unit state driven from the live GA evaluation each frame.
  // Allocated once on mount; SoldierUnit reads it every frame.
  const unitRef = useRef<TraineeUnit>({
    id: `trainee-${slotId}`,
    team: 'green',
    position: [0, 0, 0],
    rotation: FACING_TOWARD_TARGET,
    facingAngle: FACING_TOWARD_TARGET,
    status: 'idle',
    weapon,
    stateAge: 0,
    spinSpeed: 0,
    velocity: [0, 0, 0],
    health: 100,
    maxHealth: 100,
  })

  // Scratch: last-seen `justFired` value so we can detect rising edges
  // and bump `stateAge` to 0 when the GA fires. Frozen at module load
  // cost: one boolean.
  const lastJustFiredRef = useRef(false)

  useFrame((_, dt) => {
    const store = useTrainingStore.getState()
    const slot = store.slots[slotId]
    if (!slot) return

    const unit = unitRef.current

    // Idle path: statue. No mutation, no animation drive, just advance
    // stateAge so muzzle flash (if any was pending) decays out. Keep
    // facing toward the target direction so the player can read
    // "this soldier is aimed where he'll fire once trained."
    if (slot.phase !== 'running') {
      unit.status = 'idle'
      unit.facingAngle = FACING_TOWARD_TARGET
      unit.stateAge = (unit.stateAge ?? 0) + dt
      lastJustFiredRef.current = false
      return
    }

    // Running path: mirror the live sim state.
    const live = store.live
    if (!live || live.slotId !== slotId) return

    const sim = live.simState
    // Every weapon scenario exposes `soldierX / soldierZ / soldierRotation`
    // (the tank scenario aliases `tankX/Z/Angle` into these same fields).
    // We read through the shared surface so all four weapons Just Work
    // when 3c adds multi-weapon observation.
    //
    // The scenario's `soldierRotation` is computed via `atan2(dx, dz)`
    // where (dx, dz) is target - soldier in scenario space. In
    // scenario space the soldier faces +Z at rotation 0. In TG-local
    // space the trainee faces +X (toward the parade target) at the
    // baseline FACING_TOWARD_TARGET rotation. We add the baseline
    // offset so the sim's aim adjustments show up relative to "facing
    // the target" rather than relative to "facing north."
    unit.facingAngle = sim.soldierRotation + FACING_TOWARD_TARGET

    // For the spectacle we keep the trainee rooted at the TG center
    // regardless of where the sim puts them — the sim's "soldier" is
    // the origin of the scenario's coordinate system, but we want the
    // visual anchor to stay put. The scenario targets move around the
    // sim origin; for rendering purposes we treat the trainee as
    // stationary at (0, 0, 0) in local space and let the target can
    // move (step 4.2 — TargetCan reads target[0] from simState).
    unit.position[0] = 0
    unit.position[1] = 0
    unit.position[2] = 0

    // Detect a fresh fire event (rising edge on justFired). When the
    // GA's `applyOutputs` decided to fire this tick, the scenario sets
    // `state.justFired = true` for exactly that tick. We catch it here
    // and trigger a one-shot 'firing' status with stateAge=0 so the
    // muzzle flash kicks in.
    const justFired = sim.justFired === true
    if (justFired && !lastJustFiredRef.current) {
      unit.status = 'firing'
      unit.stateAge = 0
    } else {
      // Between fires during a run, use a firing-stance idle. The
      // soldier is aiming, adjusting, but not actively recoiling.
      unit.stateAge = (unit.stateAge ?? 0) + dt
      if (unit.stateAge > 0.15) {
        unit.status = 'idle' // brief cool-down → ready pose
      }
    }
    lastJustFiredRef.current = justFired
  })

  return <SoldierUnit unit={unitRef.current} physicsControlled={false} />
}
