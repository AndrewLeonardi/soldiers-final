/**
 * BaseProps — personality objects scattered around the garrison half of the
 * 24×16 toy soldier base.
 *
 * All static meshes, no physics, no colliders. Pure visual texture:
 * a flag pole in the back-left corner, barrel clusters, supply crates,
 * and sandbag piles. Everything lives in the LEFT half of the base
 * (x: -12 to -2) so the right half (x: +2 to +12) stays open for the
 * permanent BaseTrainingZone.
 *
 * Geometry is dead-simple (BoxGeometry + CylinderGeometry) — no GLTF
 * imports so there's zero async loading cost. The toy aesthetic is
 * achieved through color + proportion, not polygon detail.
 */

import * as THREE from 'three'

// ── Shared materials ──────────────────────────────────────

const matFlagPole  = new THREE.MeshLambertMaterial({ color: 0x888880 })
const matPennant   = new THREE.MeshLambertMaterial({ color: 0x5a7030, side: THREE.DoubleSide })
const matBarrel    = new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
const matBarrelTop = new THREE.MeshLambertMaterial({ color: 0x2e2015 })
const matCrate     = new THREE.MeshLambertMaterial({ color: 0xc8b070 })
const matCrateEdge = new THREE.MeshLambertMaterial({ color: 0x8a7040 })
const matSandbag   = new THREE.MeshLambertMaterial({ color: 0xc4a86a })

// ── Sub-components ────────────────────────────────────────

/** Tall flag pole with an olive pennant at the tip. */
function FlagPole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="flag-pole">
      {/* Pole shaft */}
      <mesh material={matFlagPole} castShadow position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.5, 8]} />
      </mesh>
      {/* Pennant — flat plane parented to tip */}
      <mesh material={matPennant} position={[0.28, 2.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.55, 0.3]} />
      </mesh>
    </group>
  )
}

/** A single oil drum barrel. */
function Barrel({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} name="barrel">
      {/* Body */}
      <mesh material={matBarrel} castShadow position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.18, 0.20, 0.42, 10]} />
      </mesh>
      {/* Top cap */}
      <mesh material={matBarrelTop} position={[0, 0.435, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 10]} />
      </mesh>
    </group>
  )
}

/**
 * A supply crate (box with visible edge strips).
 * height multiplier lets us stack them cleanly.
 */
function Crate({
  position,
  w = 0.55,
  h = 0.38,
  d = 0.45,
}: {
  position: [number, number, number]
  w?: number
  h?: number
  d?: number
}) {
  return (
    <group position={position} name="crate">
      <mesh material={matCrate} castShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Top edge strip */}
      <mesh material={matCrateEdge} position={[0, h / 2 - 0.015, 0]}>
        <boxGeometry args={[w + 0.01, 0.03, d + 0.01]} />
      </mesh>
      {/* Bottom edge strip */}
      <mesh material={matCrateEdge} position={[0, -h / 2 + 0.015, 0]}>
        <boxGeometry args={[w + 0.01, 0.03, d + 0.01]} />
      </mesh>
    </group>
  )
}

/** A rounded sandbag — squashed sphere stand-in via scaled box. */
function Sandbag({ position }: { position: [number, number, number] }) {
  return (
    <mesh material={matSandbag} castShadow position={position}>
      <boxGeometry args={[0.45, 0.18, 0.22]} />
    </mesh>
  )
}

// ── Main component ────────────────────────────────────────

export function BaseProps() {
  return (
    <group name="base-props">

      {/* ── Flag pole — back-left corner ── */}
      <FlagPole position={[-10.2, 0, -6.2]} />

      {/* ── Barrel cluster — near vault ── */}
      <Barrel position={[-6.4, 0, -4.5]} rotation={0} />
      <Barrel position={[-6.0, 0, -4.0]} rotation={0.4} />
      <Barrel position={[-6.8, 0, -3.8]} rotation={-0.3} />

      {/* ── Supply crate stack — near collector ── */}
      {/* Bottom crate */}
      <Crate position={[-6.3, 0.19, 4.2]} />
      {/* Stacked crate (smaller, offset) */}
      <Crate position={[-6.0, 0.57, 4.0]} w={0.40} h={0.30} d={0.35} />

      {/* ── Ammo crates — left of training grounds building ── */}
      <Crate position={[-5.2, 0.19, -3.8]} w={0.50} h={0.38} d={0.40} />
      <Crate position={[-4.8, 0.19, -3.3]} w={0.45} h={0.38} d={0.38} />

      {/* ── Sandbag pile — back-left, near fence corner ── */}
      {/* Bottom row */}
      <Sandbag position={[-9.8, 0.09, 5.5]} />
      <Sandbag position={[-9.35, 0.09, 5.5]} />
      <Sandbag position={[-8.90, 0.09, 5.5]} />
      {/* Top row (offset) */}
      <Sandbag position={[-9.57, 0.27, 5.5]} />
      <Sandbag position={[-9.12, 0.27, 5.5]} />

    </group>
  )
}
