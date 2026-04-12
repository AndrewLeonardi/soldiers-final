/**
 * BattleArena — themed battle environment that replaces the camp
 * during fighting phase.
 *
 * Sprint 8. When a battle starts, the camp structures (walls, towers,
 * training tent, medical tent) are hidden and replaced with this
 * themed arena. The ground color matches the level's theme, and
 * oversized decorations are placed around the edges.
 *
 * The arena uses the same table dimensions as the camp so that
 * spawn positions, bounds clamping, and physics all continue to work.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { GROUP_ENV } from '@three/physics/collisionGroups'
import { BASE_HALF_W, BASE_HALF_D } from './campConstants'
import { getTheme, type BattleTheme } from '@config/battleThemes'
import { createDecoration } from '@three/models/themeDecorations'
import { getPlasticMat } from '@three/models/materials'

// ── Seeded PRNG ─────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Edge Decorations ────────────────────────────────────────────

/**
 * Build a group of oversized themed decorations placed around the
 * edges of the arena. These are the "giant flowers next to tiny
 * soldiers" that sell the toy scale.
 */
function buildEdgeDecorations(theme: BattleTheme, level: number): THREE.Group {
  const group = new THREE.Group()
  const rng = mulberry32(level * 9973 + 7)

  // Place decorations around the perimeter in 4 edge zones
  const zones: { xRange: [number, number]; zRange: [number, number] }[] = [
    // North edge
    { xRange: [-BASE_HALF_W + 2, BASE_HALF_W - 2], zRange: [-BASE_HALF_D - 0.5, -BASE_HALF_D + 1.5] },
    // South edge
    { xRange: [-BASE_HALF_W + 2, BASE_HALF_W - 2], zRange: [BASE_HALF_D - 1.5, BASE_HALF_D + 0.5] },
    // East edge
    { xRange: [BASE_HALF_W - 1.5, BASE_HALF_W + 0.5], zRange: [-BASE_HALF_D + 2, BASE_HALF_D - 2] },
    // West edge
    { xRange: [-BASE_HALF_W - 0.5, -BASE_HALF_W + 1.5], zRange: [-BASE_HALF_D + 2, BASE_HALF_D - 2] },
  ]

  // Corners get extra large decorations
  const corners: [number, number][] = [
    [-BASE_HALF_W + 1, -BASE_HALF_D + 1],
    [BASE_HALF_W - 1, -BASE_HALF_D + 1],
    [-BASE_HALF_W + 1, BASE_HALF_D - 1],
    [BASE_HALF_W - 1, BASE_HALF_D - 1],
  ]

  for (const decDef of theme.decorations) {
    // Edge decorations — spread along perimeter
    const totalCount = decDef.count * 2 // More for battle arena than diorama
    for (let i = 0; i < totalCount; i++) {
      const zone = zones[Math.floor(rng() * zones.length)]!
      const colorIdx = Math.floor(rng() * decDef.colorVariants.length)
      const color = decDef.colorVariants[colorIdx] ?? decDef.colorVariants[0] ?? 0x888888

      // Battle arena decorations are 2-4x larger than diorama ones
      const baseScale = decDef.scaleRange[0] + rng() * (decDef.scaleRange[1] - decDef.scaleRange[0])
      const scale = baseScale * (2.5 + rng() * 1.5)

      const dec = createDecoration(decDef.type, color, scale)
      if (!dec) continue

      const x = zone.xRange[0] + rng() * (zone.xRange[1] - zone.xRange[0])
      const z = zone.zRange[0] + rng() * (zone.zRange[1] - zone.zRange[0])
      dec.position.set(x, 0, z)
      dec.rotation.y = rng() * Math.PI * 2
      group.add(dec)
    }
  }

  // Corner accent pieces — always the first decoration type, extra large
  const cornerDec = theme.decorations[0]
  if (cornerDec) {
    for (const [cx, cz] of corners) {
      const colorIdx = Math.floor(rng() * cornerDec.colorVariants.length)
      const color = cornerDec.colorVariants[colorIdx] ?? cornerDec.colorVariants[0] ?? 0x888888
      const scale = cornerDec.scaleRange[1] * 4

      const dec = createDecoration(cornerDec.type, color, scale)
      if (!dec) continue

      dec.position.set(cx, 0, cz)
      dec.rotation.y = rng() * Math.PI * 2
      group.add(dec)
    }
  }

  return group
}

// ── Arena Component ─────────────────────────────────────────────

interface BattleArenaProps {
  themeId: string
  level: number
}

export function BattleArena({ themeId, level }: BattleArenaProps) {
  const theme = getTheme(themeId)

  const decorations = useMemo(
    () => buildEdgeDecorations(theme, level),
    [theme, level],
  )

  const groundColor = theme.battleGroundTint ?? theme.groundColor

  return (
    <group>
      {/* Themed ground plane */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[BASE_HALF_W * 2, BASE_HALF_D * 2]} />
        <meshStandardMaterial color={groundColor} roughness={0.85} />
      </mesh>

      {/* Table edge trim — styled to theme */}
      <ArenaEdgeTrim edgeColor={theme.edgeColor} />

      {/* Physics ground collider */}
      <RigidBody type="fixed" position={[0, -0.05, 0]} collisionGroups={GROUP_ENV}>
        <CuboidCollider args={[BASE_HALF_W, 0.05, BASE_HALF_D]} />
      </RigidBody>

      {/* Oversized themed decorations around edges */}
      <primitive object={decorations} />
    </group>
  )
}

// ── Edge Trim ───────────────────────────────────────────────────

function ArenaEdgeTrim({ edgeColor }: { edgeColor: number }) {
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
        <mesh key={`arena-trim-${i}`} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={edgeColor} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}
