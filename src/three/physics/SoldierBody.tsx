/**
 * Wraps a soldier in a Rapier RigidBody for proper collision.
 *
 * ALL soldiers are dynamic bodies with gravity enabled. Rapier handles:
 * - Ground collision (soldiers stand on the table surface)
 * - Wall collision (enemies blocked by walls, no manual AABB needed)
 * - Table edge falls (ground collider is finite — past the edge, soldiers fall)
 * - Ragdoll physics (explosions apply impulses, gravity + ground do the rest)
 *
 * BattleScene drives alive soldiers via setLinvel() each frame.
 * Dead soldiers are fully physics-driven (gravity + impulse + collisions).
 */
import { useRef, useEffect, type ReactNode } from 'react'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { GROUP_SOLDIER } from './collisionGroups'

interface SoldierBodyProps {
  unitId: string
  position: [number, number, number]
  isDead: boolean
  /** 'capsule' for soldiers, 'box' for tanks */
  colliderType?: 'capsule' | 'box'
  /** Register the rigid body handle so BattleScene can drive it */
  onBodyReady: (id: string, body: RapierRigidBody) => void
  onBodyRemoved: (id: string) => void
  children: ReactNode
}

export function SoldierBody({
  unitId, position, isDead, colliderType = 'capsule',
  onBodyReady, onBodyRemoved, children,
}: SoldierBodyProps) {
  const bodyRef = useRef<RapierRigidBody>(null!)
  const wasDead = useRef(false)

  // Register body handle when ready
  useEffect(() => {
    if (bodyRef.current) {
      onBodyReady(unitId, bodyRef.current)
    }
    return () => onBodyRemoved(unitId)
  }, [unitId])

  // When transitioning to dead: slightly lower damping for slide
  useEffect(() => {
    if (isDead && !wasDead.current && bodyRef.current) {
      wasDead.current = true
      bodyRef.current.setLinearDamping(2.0)
      bodyRef.current.wakeUp()
    }
  }, [isDead])

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={position}
      colliders={false}
      collisionGroups={GROUP_SOLDIER}
      restitution={0.3}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={10}
      gravityScale={1}
      lockRotations
      ccd
      mass={1}
    >
      {colliderType === 'box'
        ? <CuboidCollider args={[0.5, 0.2, 0.35]} position={[0, 0.2, 0]} />
        // Soldier collider: a chunky box that fully encompasses the visual silhouette,
        // including any pose lean / arm extension / rifle. Half-extents [0.32, 0.5, 0.32]
        // → total 0.64 × 1.0 × 0.64, centered at y=0.5 → bottom at y=0, top at y=1.0.
        // Wider than the bare body so soldiers physically cannot clip into walls.
        : <CuboidCollider args={[0.32, 0.5, 0.32]} position={[0, 0.5, 0]} />
      }
      {children}
    </RigidBody>
  )
}
