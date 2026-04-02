// ============================================================
// Plastic Wall — Colorful wall segment defense
// ============================================================

import * as THREE from 'three'
import { getPlasticMat, TOY, disposeGroup } from './materials'
import { dampenedShake } from './easing'

const WALL_GREEN = 0x5a8a5a
const WALL_ACCENT = 0x7aaa7a

export interface PlasticWallInstance {
  group: THREE.Group
  parts: Record<string, never>
  dispose: () => void
}

export function createPlasticWall(): PlasticWallInstance {
  const group = new THREE.Group()
  const wallMat = getPlasticMat(WALL_GREEN)
  const accentMat = getPlasticMat(WALL_ACCENT)
  const metalMat = getPlasticMat(TOY.metalDark)

  // MAIN WALL SEGMENT
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.25, 0.08),
    wallMat,
  )
  wall.position.y = 0.125
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // TOP EDGE
  const topEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.03, 0.1),
    accentMat,
  )
  topEdge.position.y = 0.265
  topEdge.castShadow = true
  group.add(topEdge)

  // PILLARS
  for (const x of [-0.24, 0.24]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.3, 0.1),
      accentMat,
    )
    pillar.position.set(x, 0.15, 0)
    pillar.castShadow = true
    group.add(pillar)

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      metalMat,
    )
    cap.position.set(x, 0.3, 0)
    group.add(cap)
  }

  // HORIZONTAL GROOVES
  for (const y of [0.08, 0.16]) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.008, 0.085),
      accentMat,
    )
    groove.position.y = y
    group.add(groove)
  }

  return {
    group,
    parts: {},
    dispose: () => disposeGroup(group),
  }
}

export function animatePlasticWall(instance: PlasticWallInstance, state: string, elapsed: number): void {
  if (state === 'hit') {
    if (instance.group.userData._hitStart == null) instance.group.userData._hitStart = elapsed
    const hitAge = elapsed - (instance.group.userData._hitStart as number)
    const shake = dampenedShake(hitAge)
    instance.group.rotation.z = shake * 0.03
    instance.group.rotation.x = dampenedShake(hitAge, 16, 7) * 0.02
  } else {
    instance.group.userData._hitStart = null
    instance.group.rotation.z = 0
    instance.group.rotation.x = 0
  }
}
