/**
 * WorldGround — renders the table surface and border walls.
 *
 * The ground is a finite Rapier collider (soldiers fall off edges).
 * Borders can be open (fall-off edge) or closed (wall that blocks).
 * Table frame is visual decoration around the perimeter.
 */
import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { GROUP_ENV } from '@three/physics/collisionGroups'
import type { GroundConfig, EdgeConfig } from '@config/worlds/types'

interface WorldGroundProps {
  ground: GroundConfig
  edges: EdgeConfig[]
  tableFrame: { color: number; thickness: number }
}

export function WorldGround({ ground, edges, tableFrame }: WorldGroundProps) {
  const [gw, gd] = ground.size
  const hw = gw / 2  // half-width
  const hd = gd / 2  // half-depth
  const wallThick = tableFrame.thickness
  const wallHeight = 1.0 // default, overridden per edge

  // Generate ground mesh. When `ground.flat` is true, use a perfectly flat
  // plane so units sit cleanly on the surface (the physics collider is always
  // flat, so bumpy visuals mean units visually embed in hills that physics
  // doesn't know about). When false, add subtle procedural bumps for
  // combat-scene terrain variation — accepting the cosmetic embedding.
  const flat = ground.flat === true
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(gw, gd, 40, 30)
    if (!flat) {
      const pos = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        // Subtle height variation for visual interest
        let h = (Math.random() - 0.5) * 0.04
        h += 0.12 * Math.exp(-((x + 2) ** 2 + (y - 1) ** 2) / 4)
        h += 0.08 * Math.exp(-((x - 3) ** 2 + (y + 1) ** 2) / 5)
        pos.setZ(i, pos.getZ(i) + h)
      }
      geo.computeVertexNormals()
    }
    return geo
  }, [gw, gd, flat])

  // Build border configs
  const borders = edges.map(edge => {
    const h = edge.wallHeight ?? wallHeight
    const halfH = h / 2

    switch (edge.side) {
      case 'front':
        return {
          side: edge.side,
          open: edge.open,
          pos: [0, halfH, -hd + wallThick / 2] as [number, number, number],
          half: [hw, halfH, wallThick / 2] as [number, number, number],
          size: [gw, h, wallThick] as [number, number, number],
        }
      case 'back':
        return {
          side: edge.side,
          open: edge.open,
          pos: [0, halfH, hd - wallThick / 2] as [number, number, number],
          half: [hw, halfH, wallThick / 2] as [number, number, number],
          size: [gw, h, wallThick] as [number, number, number],
        }
      case 'left':
        return {
          side: edge.side,
          open: edge.open,
          pos: [-hw + wallThick / 2, halfH, 0] as [number, number, number],
          half: [wallThick / 2, halfH, hd] as [number, number, number],
          size: [wallThick, h, gd] as [number, number, number],
        }
      case 'right':
        return {
          side: edge.side,
          open: edge.open,
          pos: [hw - wallThick / 2, halfH, 0] as [number, number, number],
          half: [wallThick / 2, halfH, hd] as [number, number, number],
          size: [wallThick, h, gd] as [number, number, number],
        }
    }
  })

  // Apply tilt if configured
  const groundRotation: [number, number, number] = ground.tilt
    ? [
        ground.tilt.axis === 'x' ? ground.tilt.angle : -Math.PI / 2,
        0,
        ground.tilt.axis === 'z' ? ground.tilt.angle : 0,
      ]
    : [-Math.PI / 2, 0, 0]

  return (
    <>
      {/* Visual ground mesh */}
      <mesh geometry={geometry} rotation={groundRotation} receiveShadow>
        <meshStandardMaterial color={tableFrame.color === 0x8B4513 ? 0xd2b48c : 0xd2b48c} roughness={0.9} metalness={0} />
      </mesh>

      {/* Physics ground collider (finite — soldiers fall off open edges) */}
      <RigidBody type="fixed" position={[0, -0.05, 0]} collisionGroups={GROUP_ENV}>
        <CuboidCollider args={[hw, 0.05, hd]} />
      </RigidBody>

      {/* Border walls — only on non-open edges */}
      {borders.map((b) =>
        b.open ? null : (
          <RigidBody key={`border-${b.side}`} type="fixed" position={b.pos} collisionGroups={GROUP_ENV}>
            <CuboidCollider args={b.half} />
            <mesh castShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial color={tableFrame.color} roughness={0.7} />
            </mesh>
          </RigidBody>
        )
      )}
    </>
  )
}
