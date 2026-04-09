/**
 * BaseSquad — three idle toy soldiers standing around the base.
 *
 * Pure window-dressing for Phase 1a/2a: no AI, no walking, no patrol
 * routes. Soldiers exist to establish the "my toy soldiers live here"
 * feeling from the first moment the player sees the base. Phase 3+ will
 * swap this hardcoded trio for soldiers read from the roster store, and
 * add idle behaviors (loiter between buildings, cluster at the Training
 * Grounds during active observation, react to rival attack warnings).
 *
 * Renamed from StarterSquad in the Phase 1b/2a housekeeping sprint for
 * consistency with the rest of `src/game/` — the squad is persistent,
 * not "starter", once Phase 3 wires it to the roster.
 *
 * Reuses the existing SoldierBody + SoldierUnit + flexSoldier stack
 * exactly like `src/pages/PhysicsTest.tsx` does — same Rapier capsule
 * collider, same idle pose animation, same materials.
 */
import { useCallback, useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { SoldierBody } from '@three/physics/SoldierBody'
import { SoldierUnit } from '@three/models/SoldierUnit'

/**
 * Minimum shape SoldierUnit's UnitLike interface requires. Kept local so we
 * don't drag in the full GameUnit type from the old game — this slice has
 * no need for fire rates, damage, speed, etc.
 */
interface BaseSquadSoldier {
  id: string
  team: 'green'
  position: [number, number, number]
  rotation: number
  status: 'idle'
  weapon: 'rifle'
  facingAngle: number
  spinSpeed: number
  velocity: [number, number, number]
  stateAge: number
  health: number
  maxHealth: number
}

function makeSoldier(
  id: string,
  position: [number, number, number],
  facingAngle: number,
): BaseSquadSoldier {
  return {
    id,
    team: 'green',
    position,
    rotation: facingAngle,
    status: 'idle',
    weapon: 'rifle',
    facingAngle,
    spinSpeed: 0,
    velocity: [0, 0, 0],
    stateAge: 0,
    health: 100,
    maxHealth: 100,
  }
}

// Placed near the starter buildings seeded in baseStore.ts — vault at
// x=-5, training grounds at x=0, collector at x=4. Soldiers loiter
// between them, facing roughly toward the center of the base so the
// squad feels alert rather than asleep.
const BASE_SOLDIERS: BaseSquadSoldier[] = [
  makeSoldier('base-soldier-1', [-2.5, 0.5, 1.5], Math.PI), // near vault, facing right-ish
  makeSoldier('base-soldier-2', [1.0, 0.5, 1.6], Math.PI),  // between TG and collector
  makeSoldier('base-soldier-3', [3.5, 0.5, 0.5], Math.PI),  // near collector
]

export function BaseSquad() {
  // Each soldier's Rapier RigidBody handle is registered here on mount.
  // Phase 2a doesn't consume this map, but keeping the pattern in place
  // means Phase 3+ (idle behaviors) and Phase 4+ (rival reactions) can
  // extend without a refactor.
  const bodyMapRef = useRef<Map<string, RapierRigidBody>>(new Map())

  const handleBodyReady = useCallback((id: string, body: RapierRigidBody) => {
    bodyMapRef.current.set(id, body)
  }, [])

  const handleBodyRemoved = useCallback((id: string) => {
    bodyMapRef.current.delete(id)
  }, [])

  return (
    <>
      {BASE_SOLDIERS.map((s) => (
        <SoldierBody
          key={s.id}
          unitId={s.id}
          position={s.position}
          isDead={false}
          onBodyReady={handleBodyReady}
          onBodyRemoved={handleBodyRemoved}
        >
          <SoldierUnit unit={s} physicsControlled />
        </SoldierBody>
      ))}
    </>
  )
}
