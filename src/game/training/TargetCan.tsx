/**
 * TargetCan — a single destructible target inside the Training Grounds
 * interior, driven by the live simulation state.
 *
 * Visual mirror of the target cans used by the existing TrainingScene
 * at `/play` — red cylinder, metal rim, white band — placed at the
 * position the current GA scenario says the target is at, and hidden
 * (with a small explosion burst) when the scenario marks it destroyed.
 *
 * For Phase 3a we render exactly one target: the first entry of
 * `simState.targets`. The scenarios spawn 3-6 cans at random, so
 * `targets[0]` is arbitrary but stable within a generation — when the
 * generation rolls over and `initSim` runs, the new targets array has
 * fresh randomized positions, which gives the trainee a new target to
 * chase. That visual variety is a happy accident of the GA loop, and
 * it reinforces the "he's trying against different targets every time"
 * narrative without any special casing.
 *
 * When `phase !== 'running'`, the component reads a default target
 * position 4m in front of the trainee (toward +x in local space) so
 * the player sees a fixed can while in idle/graduated/observing state
 * — important for the statue moment, where the trainee stares at a
 * target that sits completely still.
 *
 * Positioned in local space relative to the Training Grounds interior
 * parent `<group>`. When no parent group wraps it, the positions are
 * interpreted in world space; the interior composition provides the
 * parent transform.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTrainingStore } from '@game/stores/trainingStore'

/**
 * The scenario's coordinate frame places the soldier at (0, 0). In
 * our TG-local frame the trainee sits at `TRAINEE_LOCAL_POS.x`, so
 * every sim-space target position must be translated by this much on
 * the X axis to render correctly relative to the parade strip.
 *
 * Kept in sync with `TRAINEE_LOCAL_POS[0]` in TrainingGroundsInterior.
 * If that constant ever moves, this one moves with it.
 */
const SIM_TO_LOCAL_X_OFFSET = 2.2

const TARGET_RED = '#cc3333'
const EXPLOSION_COLOR = '#ff8800'

/**
 * Default position when no run is active. Matches `TARGET_LOCAL_POS`
 * in `TrainingGroundsInterior` so the idle (statue) view and the
 * running view share the same visual layout until the GA's scenario
 * starts randomizing target placement mid-run.
 */
const DEFAULT_TARGET_POS: readonly [number, number, number] = [5.5, 0, 0]

interface TargetCanProps {
  /** The slot this target corresponds to — used to read the live sim state. */
  slotId: string
}

export function TargetCan({ slotId }: TargetCanProps) {
  const rootRef = useRef<THREE.Group>(null)
  const visibleRef = useRef<THREE.Group>(null)
  const explosionRef = useRef<THREE.Mesh>(null)
  const wasAliveRef = useRef(true)
  const explosionAgeRef = useRef(0)

  useFrame((_, dt) => {
    if (!rootRef.current) return

    const store = useTrainingStore.getState()
    const slot = store.slots[slotId]
    if (!slot) return

    const live = store.liveSlots[slotId]
    const running = slot.phase === 'running' && live !== undefined

    // Position: read from the live sim's first target, or fall back to
    // the default position when idle/graduated/observing.
    let tx = DEFAULT_TARGET_POS[0]
    let ty = DEFAULT_TARGET_POS[1]
    let tz = DEFAULT_TARGET_POS[2]
    let alive = true
    if (running && live) {
      const entities = 'enemies' in live.simState
        ? (live.simState as any).enemies
        : (live.simState as any).targets
      const firstTarget = entities?.[0]
      if (firstTarget) {
        // Translate scenario-space coordinates (soldier at origin)
        // into TG-local coordinates (trainee at TRAINEE_LOCAL_POS).
        tx = firstTarget.x + SIM_TO_LOCAL_X_OFFSET
        ty = 0
        tz = firstTarget.z
        alive = firstTarget.alive
      }
    }

    rootRef.current.position.set(tx, ty, tz)

    // Alive/dead visual transition + explosion burst.
    const group = visibleRef.current
    const explosion = explosionRef.current
    if (!group || !explosion) return

    if (alive) {
      group.visible = true
      wasAliveRef.current = true
      explosionAgeRef.current = 0
    } else if (wasAliveRef.current) {
      wasAliveRef.current = false
      group.visible = false
      explosionAgeRef.current = 0.01
      // SFX intentionally omitted for Phase 3a step 4/5. The audio
      // pass lands in step 11 (polish) once the visible spectacle is
      // proven to read correctly without sound.
    }

    if (explosionAgeRef.current > 0) {
      explosionAgeRef.current += dt
      const t = explosionAgeRef.current
      explosion.scale.setScalar(Math.min(1.5, t * 4))
      explosion.visible = t < 0.4
      if (explosion.material instanceof THREE.MeshBasicMaterial) {
        explosion.material.opacity = Math.max(0, 1 - t * 2.5)
      }
    }
  })

  return (
    <group ref={rootRef}>
      <group ref={visibleRef}>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 12]} />
          <meshStandardMaterial color={TARGET_RED} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.04, 12]} />
          <meshStandardMaterial color="#888888" roughness={0.2} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.08, 12]} />
          <meshStandardMaterial color="white" roughness={0.4} />
        </mesh>
      </group>
      <mesh ref={explosionRef} visible={false}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={EXPLOSION_COLOR} transparent opacity={1} />
      </mesh>
    </group>
  )
}
