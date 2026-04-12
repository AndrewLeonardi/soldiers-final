/**
 * BattleDiorama — rotating 3D floating island preview for the level selector.
 *
 * Sprint 8. Shows a tiny themed island with enemy soldiers and decorations.
 * Rendered inside its own <Canvas> in the BattlePickerSheet.
 *
 * The island rotates slowly to give the player a 360° preview of the
 * enemy base they're about to attack.
 */
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTheme } from '@config/battleThemes'
import type { BattleTheme } from '@config/battleThemes'
import { createFlexSoldier } from '@three/models/flexSoldier'
import { createDecoration } from '@three/models/themeDecorations'
import { getPlasticMat } from '@three/models/materials'
import { TOY } from '@three/models/materials'

// ── Seeded PRNG (same as levelGenerator) ────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Island Scene ────────────────────────────────────────────────

function DioramaIsland({ theme, level }: { theme: BattleTheme; level: number }) {
  const groupRef = useRef<THREE.Group>(null!)

  const sceneGroup = useMemo(() => {
    const group = new THREE.Group()
    const rng = mulberry32(level * 1337 + 42)

    // ── Island platform (top surface)
    const platformGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.12, 24)
    const platform = new THREE.Mesh(platformGeo, getPlasticMat(theme.groundColor))
    platform.position.y = 0
    platform.receiveShadow = true
    platform.castShadow = true
    group.add(platform)

    // ── Island underbelly (inverted cone below)
    const bellyGeo = new THREE.ConeGeometry(1.6, 0.9, 12)
    const belly = new THREE.Mesh(bellyGeo, getPlasticMat(theme.edgeColor))
    belly.position.y = -0.5
    belly.rotation.x = Math.PI // flip cone
    belly.castShadow = true
    group.add(belly)

    // ── Rocky edges (small bumps around platform rim)
    const bumpGeo = new THREE.SphereGeometry(0.12, 6, 4)
    const bumpMat = getPlasticMat(theme.edgeColor)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + rng() * 0.5
      const bump = new THREE.Mesh(bumpGeo, bumpMat)
      bump.position.set(
        Math.cos(angle) * 1.35,
        -0.1 + rng() * 0.05,
        Math.sin(angle) * 1.35,
      )
      bump.scale.set(0.8 + rng() * 0.4, 0.5 + rng() * 0.3, 0.8 + rng() * 0.4)
      group.add(bump)
    }

    // ── Tiny enemy soldiers (tan team, scale 0.25)
    const soldierCount = 2 + Math.floor(rng() * 3) // 2-4
    for (let i = 0; i < soldierCount; i++) {
      const soldier = createFlexSoldier(TOY.sandBrown)
      const angle = (i / soldierCount) * Math.PI * 1.2 + rng() * 0.4 - 0.3
      const radius = 0.4 + rng() * 0.5
      soldier.group.position.set(
        Math.cos(angle) * radius,
        0.06,
        Math.sin(angle) * radius,
      )
      soldier.group.scale.setScalar(0.25)
      soldier.group.rotation.y = angle + Math.PI + (rng() - 0.5) * 0.6
      group.add(soldier.group)
    }

    // ── Theme decorations (oversized for toy feel)
    for (const decDef of theme.decorations) {
      for (let i = 0; i < decDef.count; i++) {
        const colorIdx = Math.floor(rng() * decDef.colorVariants.length)
        const color = decDef.colorVariants[colorIdx] ?? decDef.colorVariants[0] ?? 0x888888
        const scale = decDef.scaleRange[0] + rng() * (decDef.scaleRange[1] - decDef.scaleRange[0])

        const dec = createDecoration(decDef.type, color, scale)
        if (!dec) continue

        // Place around island — mostly on the outer ring
        const angle = rng() * Math.PI * 2
        const radius = 0.7 + rng() * 0.7
        dec.position.set(
          Math.cos(angle) * radius,
          0.06,
          Math.sin(angle) * radius,
        )
        dec.rotation.y = rng() * Math.PI * 2
        group.add(dec)
      }
    }

    return group
  }, [theme, level])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={sceneGroup} />
    </group>
  )
}

// ── Public Component ────────────────────────────────────────────

interface BattleDioramaProps {
  themeId: string
  level: number
  width?: number
  height?: number
}

export function BattleDiorama({ themeId, level, width = 280, height = 220 }: BattleDioramaProps) {
  const theme = getTheme(themeId)

  return (
    <Canvas
      camera={{ position: [0, 1.8, 3.0], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width, height }}
      frameloop="always"
    >
      <ambientLight intensity={0.6} color={0xffeedd} />
      <directionalLight position={[2, 3, 3]} intensity={1.0} castShadow />
      <directionalLight position={[-2, 2, -1]} intensity={0.25} color={0xddeeff} />
      <DioramaIsland theme={theme} level={level} />
    </Canvas>
  )
}
