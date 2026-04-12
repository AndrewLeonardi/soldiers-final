/**
 * themeDecorations — procedural 3D decoration factory for diorama islands.
 *
 * Sprint 8. Each function returns a THREE.Group built from primitives,
 * matching the toy soldier aesthetic (plastic materials, chunky proportions).
 *
 * Geometries and materials are cached for reuse across multiple diorama
 * instances. All decorations are designed to be oversized relative to
 * the tiny soldiers — emphasizing the toy scale.
 */
import * as THREE from 'three'
import { getPlasticMat } from './materials'

// ── Geometry Cache ──────────────────────────────────────────────

const _geoCache = new Map<string, THREE.BufferGeometry>()

function cachedGeo(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const existing = _geoCache.get(key)
  if (existing) return existing
  const geo = factory()
  _geoCache.set(key, geo)
  return geo
}

// ── Garden Decorations ──────────────────────────────────────────

export function createFlower(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Stem — thin green cylinder
  const stemGeo = cachedGeo('flower_stem', () => new THREE.CylinderGeometry(0.02, 0.025, 0.5, 6))
  const stem = new THREE.Mesh(stemGeo, getPlasticMat(0x3d8b37))
  stem.position.y = 0.25
  stem.castShadow = true
  group.add(stem)

  // Center — yellow sphere
  const centerGeo = cachedGeo('flower_center', () => new THREE.SphereGeometry(0.06, 8, 6))
  const center = new THREE.Mesh(centerGeo, getPlasticMat(0xffcc00))
  center.position.y = 0.52
  center.castShadow = true
  group.add(center)

  // Petals — 5 spheres in a ring
  const petalGeo = cachedGeo('flower_petal', () => new THREE.SphereGeometry(0.07, 6, 5))
  const petalMat = getPlasticMat(color)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.set(Math.cos(angle) * 0.09, 0.52, Math.sin(angle) * 0.09)
    petal.scale.set(1, 0.6, 1)
    petal.castShadow = true
    group.add(petal)
  }

  // Leaf — flattened sphere on stem
  const leafGeo = cachedGeo('flower_leaf', () => new THREE.SphereGeometry(0.05, 6, 4))
  const leaf = new THREE.Mesh(leafGeo, getPlasticMat(0x4a9a42))
  leaf.position.set(0.06, 0.2, 0)
  leaf.scale.set(1.5, 0.3, 1)
  leaf.rotation.z = -0.4
  group.add(leaf)

  group.scale.setScalar(scale)
  return group
}

export function createRock(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const rockGeo = cachedGeo(`rock_${color}`, () => {
    const geo = new THREE.DodecahedronGeometry(0.15, 0)
    // Jitter vertices for organic feel
    const pos = geo.attributes.position
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + (((i * 7 + 3) % 11) / 11 - 0.5) * 0.04)
        pos.setY(i, pos.getY(i) * 0.7 + (((i * 13 + 5) % 9) / 9 - 0.5) * 0.03)
        pos.setZ(i, pos.getZ(i) + (((i * 11 + 7) % 13) / 13 - 0.5) * 0.04)
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()
    }
    return geo
  })

  const rock = new THREE.Mesh(rockGeo, getPlasticMat(color))
  rock.position.y = 0.06
  rock.castShadow = true
  rock.receiveShadow = true
  group.add(rock)

  group.scale.setScalar(scale)
  return group
}

export function createGrassTuft(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const bladeGeo = cachedGeo('grass_blade', () => new THREE.ConeGeometry(0.015, 0.25, 4))

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, getPlasticMat(color))
    const angle = (i / 4) * Math.PI * 2 + i * 0.3
    blade.position.set(Math.cos(angle) * 0.03, 0.12, Math.sin(angle) * 0.03)
    blade.rotation.x = (i % 2 === 0 ? 0.15 : -0.1)
    blade.rotation.z = (i % 3 === 0 ? 0.1 : -0.15)
    blade.castShadow = true
    group.add(blade)
  }

  group.scale.setScalar(scale)
  return group
}

// ── Desert Decorations ──────────────────────────────────────────

export function createCactus(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Main body
  const bodyGeo = cachedGeo('cactus_body', () => new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8))
  const body = new THREE.Mesh(bodyGeo, getPlasticMat(color))
  body.position.y = 0.22
  body.castShadow = true
  group.add(body)

  // Top dome
  const topGeo = cachedGeo('cactus_top', () => new THREE.SphereGeometry(0.06, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2))
  const top = new THREE.Mesh(topGeo, getPlasticMat(color))
  top.position.y = 0.45
  group.add(top)

  // Left arm
  const armGeo = cachedGeo('cactus_arm', () => new THREE.CylinderGeometry(0.035, 0.04, 0.2, 6))
  const leftArm = new THREE.Mesh(armGeo, getPlasticMat(color))
  leftArm.position.set(-0.1, 0.3, 0)
  leftArm.rotation.z = Math.PI / 3
  leftArm.castShadow = true
  group.add(leftArm)

  // Right arm (higher)
  const rightArm = new THREE.Mesh(armGeo, getPlasticMat(color))
  rightArm.position.set(0.1, 0.35, 0)
  rightArm.rotation.z = -Math.PI / 4
  rightArm.castShadow = true
  group.add(rightArm)

  group.scale.setScalar(scale)
  return group
}

export function createSkull(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Cranium
  const craniGeo = cachedGeo('skull_crani', () => new THREE.SphereGeometry(0.08, 8, 6))
  const crani = new THREE.Mesh(craniGeo, getPlasticMat(color))
  crani.position.y = 0.08
  crani.scale.set(1, 0.85, 0.9)
  crani.castShadow = true
  group.add(crani)

  // Jaw
  const jawGeo = cachedGeo('skull_jaw', () => new THREE.BoxGeometry(0.08, 0.03, 0.06))
  const jaw = new THREE.Mesh(jawGeo, getPlasticMat(color))
  jaw.position.set(0, 0.02, 0.04)
  group.add(jaw)

  // Eye sockets (dark)
  const eyeGeo = cachedGeo('skull_eye', () => new THREE.SphereGeometry(0.02, 6, 4))
  const eyeMat = getPlasticMat(0x1a1a1a)
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-0.03, 0.09, 0.065)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.03, 0.09, 0.065)
  group.add(rightEye)

  group.scale.setScalar(scale)
  return group
}

// ── Arctic Decorations ──────────────────────────────────────────

export function createSnowpile(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const pileGeo = cachedGeo('snowpile', () => new THREE.SphereGeometry(0.18, 8, 5))
  const pile = new THREE.Mesh(pileGeo, getPlasticMat(color))
  pile.position.y = 0.06
  pile.scale.set(1, 0.45, 1)
  pile.castShadow = true
  pile.receiveShadow = true
  group.add(pile)

  // Small mound on top
  const bumpGeo = cachedGeo('snowbump', () => new THREE.SphereGeometry(0.1, 6, 4))
  const bump = new THREE.Mesh(bumpGeo, getPlasticMat(color))
  bump.position.set(0.06, 0.1, 0.04)
  bump.scale.set(1, 0.5, 1)
  group.add(bump)

  group.scale.setScalar(scale)
  return group
}

export function createIceCrystal(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const crystalGeo = cachedGeo('ice_crystal', () => new THREE.OctahedronGeometry(0.1, 0))
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.15, metalness: 0.2,
    transparent: true, opacity: 0.8,
  })
  const crystal = new THREE.Mesh(crystalGeo, mat)
  crystal.position.y = 0.12
  crystal.scale.set(0.8, 1.4, 0.8)
  crystal.rotation.y = 0.5
  crystal.castShadow = true
  group.add(crystal)

  // Smaller shard
  const shardGeo = cachedGeo('ice_shard', () => new THREE.OctahedronGeometry(0.06, 0))
  const shard = new THREE.Mesh(shardGeo, mat)
  shard.position.set(0.08, 0.08, 0.04)
  shard.scale.set(0.6, 1.2, 0.6)
  shard.rotation.z = 0.3
  group.add(shard)

  group.scale.setScalar(scale)
  return group
}

export function createPineStump(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const stumpGeo = cachedGeo('pine_stump', () => new THREE.CylinderGeometry(0.06, 0.08, 0.15, 8))
  const stump = new THREE.Mesh(stumpGeo, getPlasticMat(color))
  stump.position.y = 0.075
  stump.castShadow = true
  group.add(stump)

  // Top ring
  const ringGeo = cachedGeo('stump_ring', () => new THREE.CylinderGeometry(0.07, 0.07, 0.01, 8))
  const ring = new THREE.Mesh(ringGeo, getPlasticMat(0x8b6b3d))
  ring.position.y = 0.15
  group.add(ring)

  group.scale.setScalar(scale)
  return group
}

// ── Volcanic Decorations ────────────────────────────────────────

export function createLavaRock(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const rockGeo = cachedGeo(`lavarock_${color}`, () => {
    const geo = new THREE.DodecahedronGeometry(0.14, 0)
    const pos = geo.attributes.position
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + (((i * 5 + 1) % 7) / 7 - 0.5) * 0.06)
        pos.setY(i, pos.getY(i) * 0.65)
        pos.setZ(i, pos.getZ(i) + (((i * 3 + 2) % 11) / 11 - 0.5) * 0.05)
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()
    }
    return geo
  })

  const rock = new THREE.Mesh(rockGeo, getPlasticMat(color))
  rock.position.y = 0.06
  rock.castShadow = true
  group.add(rock)

  group.scale.setScalar(scale)
  return group
}

export function createSmokeVent(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Vent cone
  const ventGeo = cachedGeo('smoke_vent', () => new THREE.CylinderGeometry(0.03, 0.08, 0.12, 8))
  const vent = new THREE.Mesh(ventGeo, getPlasticMat(color))
  vent.position.y = 0.06
  vent.castShadow = true
  group.add(vent)

  // Smoke puff (translucent sphere)
  const smokeGeo = cachedGeo('smoke_puff', () => new THREE.SphereGeometry(0.06, 6, 4))
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, roughness: 1, metalness: 0,
    transparent: true, opacity: 0.35,
  })
  const smoke = new THREE.Mesh(smokeGeo, smokeMat)
  smoke.position.y = 0.18
  group.add(smoke)

  group.scale.setScalar(scale)
  return group
}

export function createEmber(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  const emberGeo = cachedGeo('ember', () => new THREE.SphereGeometry(0.03, 6, 4))
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.3, metalness: 0,
    emissive: color, emissiveIntensity: 1.5,
  })
  const ember = new THREE.Mesh(emberGeo, mat)
  ember.position.y = 0.04
  group.add(ember)

  group.scale.setScalar(scale)
  return group
}

// ── Jungle Decorations ──────────────────────────────────────────

export function createFern(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // 3 frond blades fanning out
  const frondGeo = cachedGeo('fern_frond', () => new THREE.BoxGeometry(0.15, 0.01, 0.04))
  const mat = getPlasticMat(color)

  for (let i = 0; i < 3; i++) {
    const frond = new THREE.Mesh(frondGeo, mat)
    const angle = (i / 3) * Math.PI * 2
    frond.position.set(Math.cos(angle) * 0.06, 0.12 + i * 0.03, Math.sin(angle) * 0.06)
    frond.rotation.set(0.3, angle, -0.4 + i * 0.1)
    frond.castShadow = true
    group.add(frond)
  }

  // Stem
  const stemGeo = cachedGeo('fern_stem', () => new THREE.CylinderGeometry(0.015, 0.02, 0.2, 6))
  const stem = new THREE.Mesh(stemGeo, getPlasticMat(0x2d5a2d))
  stem.position.y = 0.1
  group.add(stem)

  group.scale.setScalar(scale)
  return group
}

export function createMushroom(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Stem
  const stemGeo = cachedGeo('mush_stem', () => new THREE.CylinderGeometry(0.025, 0.03, 0.15, 6))
  const stem = new THREE.Mesh(stemGeo, getPlasticMat(0xe8e0d0))
  stem.position.y = 0.075
  stem.castShadow = true
  group.add(stem)

  // Cap
  const capGeo = cachedGeo('mush_cap', () => new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2))
  const cap = new THREE.Mesh(capGeo, getPlasticMat(color))
  cap.position.y = 0.15
  cap.castShadow = true
  group.add(cap)

  // White spots
  const spotGeo = cachedGeo('mush_spot', () => new THREE.SphereGeometry(0.012, 4, 3))
  const spotMat = getPlasticMat(0xffffff)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3
    const spot = new THREE.Mesh(spotGeo, spotMat)
    spot.position.set(Math.cos(a) * 0.045, 0.17, Math.sin(a) * 0.045)
    group.add(spot)
  }

  group.scale.setScalar(scale)
  return group
}

export function createVine(color: number, scale: number): THREE.Group {
  const group = new THREE.Group()

  // Curved vine — approximated with 3 tilted cylinders
  const segGeo = cachedGeo('vine_seg', () => new THREE.CylinderGeometry(0.012, 0.015, 0.15, 5))
  const mat = getPlasticMat(color)

  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(segGeo, mat)
    seg.position.set(i * 0.04 - 0.04, 0.08 + i * 0.12, 0)
    seg.rotation.z = 0.2 - i * 0.15
    seg.castShadow = true
    group.add(seg)
  }

  // Small leaf at top
  const leafGeo = cachedGeo('vine_leaf', () => new THREE.SphereGeometry(0.03, 5, 3))
  const leaf = new THREE.Mesh(leafGeo, getPlasticMat(0x3a8a3a))
  leaf.position.set(0.02, 0.4, 0)
  leaf.scale.set(1.5, 0.4, 1)
  group.add(leaf)

  group.scale.setScalar(scale)
  return group
}

// ── Factory Dispatcher ──────────────────────────────────────────

type DecorationFactory = (color: number, scale: number) => THREE.Group

const FACTORIES: Record<string, DecorationFactory> = {
  // Garden
  flower: createFlower,
  rock: createRock,
  grass_tuft: createGrassTuft,
  // Desert
  cactus: createCactus,
  skull: createSkull,
  // Arctic
  snowpile: createSnowpile,
  ice_crystal: createIceCrystal,
  pine_stump: createPineStump,
  // Volcanic
  lava_rock: createLavaRock,
  smoke_vent: createSmokeVent,
  ember: createEmber,
  // Jungle
  fern: createFern,
  mushroom: createMushroom,
  vine: createVine,
}

/**
 * Create a decoration mesh by type name.
 * Returns null if the type is unknown.
 */
export function createDecoration(type: string, color: number, scale: number): THREE.Group | null {
  const factory = FACTORIES[type]
  if (!factory) return null
  return factory(color, scale)
}
