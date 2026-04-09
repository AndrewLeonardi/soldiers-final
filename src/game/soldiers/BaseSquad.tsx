/**
 * StarterSquad — three idle toy soldiers standing around the base.
 *
 * Pure window-dressing for Phase 1a: no AI, no walking, no patrol routes.
 * Soldiers exist to establish the "my toy soldiers live here" feeling from
 * the first moment the player sees the base. Phase 2+ will add idle
 * behaviors (patrol between buildings, cluster at training grounds, react
 * to rival attack warnings).
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
interface StarterSoldier {
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
): StarterSoldier {
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

// Placed near the buildings defined in StarterBuildings.tsx — vault at
// x=-5, training grounds at x=0, collector at x=4. Soldiers loiter between
// them, facing roughly toward the center of the base so the squad feels
// alert rather than asleep.
const STARTER_SOLDIERS: StarterSoldier[] = [
  makeSoldier('starter-1', [-2.5, 0.5, 1.5], Math.PI), // near vault, facing right-ish
  makeSoldier('starter-2', [1.0, 0.5, 1.6], Math.PI),  // between TG and collector
  makeSoldier('starter-3', [3.5, 0.5, 0.5], Math.PI),  // near collector
]

export function StarterSquad() {
  // Each soldier's Rapier RigidBody handle is registered here on mount.
  // Phase 1a doesn't consume this map, but keeping the pattern in place
  // means Phase 2+ (drag-to-place) and Phase 4+ (rival reactions) can
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
      {STARTER_SOLDIERS.map((s) => (
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
