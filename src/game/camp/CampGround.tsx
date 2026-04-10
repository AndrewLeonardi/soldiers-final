/**
 * CampGround — the tabletop ground plane for the base camp diorama.
 *
 * Sprint 1, Subsystem 1. Single textured plane sized to BASE_HALF.
 * Includes the physics ground collider and the decorative table edge trim.
 */
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { GROUP_ENV } from '@three/physics/collisionGroups'
import { BASE_HALF_W, BASE_HALF_D } from './campConstants'

/** The sandy ground plane — visual + physics */
function GroundPlane() {
  return (
    <>
      {/* Visual ground */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[BASE_HALF_W * 2, BASE_HALF_D * 2]} />
        <meshStandardMaterial color={0xd2b48c} roughness={0.9} />
      </mesh>

      {/* Physics ground collider */}
      <RigidBody type="fixed" position={[0, -0.05, 0]} collisionGroups={GROUP_ENV}>
        <CuboidCollider args={[BASE_HALF_W, 0.05, BASE_HALF_D]} />
      </RigidBody>
    </>
  )
}

/** Decorative wooden trim around the table edges — visual only, no collider */
function TableEdgeTrim() {
  const edgeColor = 0x8b4513
  const trimHeight = 0.08
  const trimThick = 0.15
  const w = BASE_HALF_W * 2
  const d = BASE_HALF_D * 2

  const borders: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, trimHeight / 2, -BASE_HALF_D + trimThick / 2], size: [w, trimHeight, trimThick] },
    { pos: [0, trimHeight / 2, BASE_HALF_D - trimThick / 2], size: [w, trimHeight, trimThick] },
    { pos: [-BASE_HALF_W + trimThick / 2, trimHeight / 2, 0], size: [trimThick, trimHeight, d] },
    { pos: [BASE_HALF_W - trimThick / 2, trimHeight / 2, 0], size: [trimThick, trimHeight, d] },
  ]

  return (
    <group>
      {borders.map((b, i) => (
        <mesh key={`trim-${i}`} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={edgeColor} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function CampGround() {
  return (
    <>
      <GroundPlane />
      <TableEdgeTrim />
    </>
  )
}
