/**
 * TrainingGroundsInterior — the visual spectacle rendered on the
 * parade ground ADJACENT to a Training Grounds building when the
 * player is observing a slot there.
 *
 * Composition: a sand-colored parade ground strip extending forward
 * from the Training Grounds, one `TraineeSoldier` standing on it,
 * and one `TargetCan` further forward. The whole thing is laid out
 * in local space relative to the Training Grounds' world position,
 * extending in the +x direction (which, with the default rotation,
 * points "out" from the building into open table).
 *
 * ─ Why not literally inside the building ─
 *
 * The Training Grounds is a destructible block structure — 4 corner
 * posts, 2 cross-beams, 3 canvas roof panels. Its internal volume is
 * ~1.8m × 0.95m × 1.17m tall, which is too small to comfortably
 * frame a soldier + a target at the cinematic 5-6m camera distance
 * we want. Squeezing the trainee between the table legs also clips
 * the camera view and makes the spectacle hard to read. The honest
 * solution: use the building as a visual anchor ("your Training
 * Grounds is here, and training happens here, adjacent to it"),
 * with the actual trainee standing on a parade ground extending
 * beside it. Reads cinematic, never clips, and the destructible
 * block structure still visibly belongs to the same scene.
 *
 * ─ Local coordinate frame ─
 *
 * The parent wrapper calls this component like:
 *   <group position={[worldX, 0, worldZ]}>
 *     <TrainingGroundsInterior slotId={...} />
 *   </group>
 *
 * Inside that frame:
 *   - Origin is the center of the Training Grounds footprint at
 *     y=0 (the table surface).
 *   - The trainee spawns at `[+2.2, 0, 0]` — 2.2m out in +x from
 *     the TG center, comfortably past the building's 0.95m
 *     half-width so the soldier stands on open table next to the
 *     building, not inside it.
 *   - The target can's default position is `[+5.5, 0, 0]` — 3.3m
 *     further along the parade ground from the trainee. This
 *     matches the rocket scenario's default target range of 2-6m
 *     and keeps both the trainee and the target in the camera
 *     frame at the ~5.5m observation distance.
 *   - The parade ground strip is a rectangle centered at [+3.85, 0, 0],
 *     aligned with the trainee→target line, wide enough to read as
 *     "a training lane" and long enough to visually connect them.
 *
 * When a training run is live, the scenarios update
 * `simState.targets[0]` to randomized positions and `TargetCan`
 * reads through that override. The trainee stays rooted at the
 * parade-ground spawn point because `TraineeSoldier` deliberately
 * pins position to origin (see that file for the rationale).
 */
import type { WeaponType } from '@config/types'
import { useTrainingStore } from '@game/stores/trainingStore'
import { ConfettiEffect } from '@three/effects/ConfettiEffect'
import { TraineeSoldier } from './TraineeSoldier'
import { TargetCan } from './TargetCan'

interface TrainingGroundsInteriorProps {
  slotId: string
  weapon: WeaponType
}

const PARADE_STRIP_COLOR = '#c7a86a'

/** Trainee spawn in the TG's local frame. */
export const TRAINEE_LOCAL_POS: readonly [number, number, number] = [2.2, 0, 0]

/** Default target position in the TG's local frame (overridden during runs). */
export const TARGET_LOCAL_POS: readonly [number, number, number] = [5.5, 0, 0]

/** Parade strip midpoint (between trainee and default target). */
const STRIP_CENTER_X = (TRAINEE_LOCAL_POS[0] + TARGET_LOCAL_POS[0]) / 2
const STRIP_LENGTH = TARGET_LOCAL_POS[0] - TRAINEE_LOCAL_POS[0] + 1.5
const STRIP_WIDTH = 1.4

export function TrainingGroundsInterior({ slotId, weapon }: TrainingGroundsInteriorProps) {
  // Only spawn the confetti burst while the slot is in the graduated
  // phase. When the player commits the graduation (via the cutscene's
  // Save & Continue button), phase flips back to `observing`, this
  // boolean goes false, the ConfettiEffect unmounts, and its cleanup
  // useEffect removes any remaining particle meshes from the scene.
  // We skip atomic selectors here for a tiny win — one subscription on
  // the slot phase is all we need.
  const phase = useTrainingStore((s) =>
    s.observing === slotId ? s.slots[slotId]?.phase : null,
  )
  const showConfetti = phase === 'graduated'

  return (
    <group>
      {/* Parade ground strip — thin flat rectangle connecting trainee to target */}
      <mesh
        position={[STRIP_CENTER_X, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[STRIP_LENGTH, STRIP_WIDTH]} />
        <meshStandardMaterial color={PARADE_STRIP_COLOR} roughness={0.85} />
      </mesh>

      {/* The trainee — stands at the near end of the parade strip */}
      <group position={TRAINEE_LOCAL_POS}>
        <TraineeSoldier slotId={slotId} weapon={weapon} />
      </group>

      {/* The target — rendered in TG-local coordinates (default or live sim) */}
      <TargetCan slotId={slotId} />

      {/* Graduation confetti — bursts from above the trainee when the
       * slot transitions to graduated. Self-cleans after ~5 seconds;
       * unmounts entirely when phase leaves 'graduated'. */}
      {showConfetti && (
        <ConfettiEffect
          position={[TRAINEE_LOCAL_POS[0], 2.5, TRAINEE_LOCAL_POS[2]]}
          onComplete={() => {
            /* Self-cleaning — no action needed. The component's own
             * useEffect cleanup removes particle meshes; the parent
             * unmount on phase change does the rest. */
          }}
        />
      )}
    </group>
  )
}
