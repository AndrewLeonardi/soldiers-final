// ============================================================
// Flexible Toy Soldier — Proper skeletal hierarchy
// Head/arms are CHILDREN of torso, so the whole upper body
// moves together. Each part can still animate independently.
// ============================================================

import * as THREE from 'three'
import { getPlasticMat, TOY } from './materials'

// ============================================================
// Shared geometry (same shapes, cached once)
// ============================================================

interface GeoCache {
  base: THREE.CylinderGeometry
  upperLeg: THREE.CylinderGeometry
  lowerLeg: THREE.CylinderGeometry
  boot: THREE.BoxGeometry
  torso: THREE.BoxGeometry
  belt: THREE.BoxGeometry
  shoulders: THREE.BoxGeometry
  neck: THREE.CylinderGeometry
  head: THREE.SphereGeometry
  helmetDome: THREE.SphereGeometry
  helmetBrim: THREE.CylinderGeometry
  upperArm: THREE.CylinderGeometry
  forearm: THREE.CylinderGeometry
  hand: THREE.SphereGeometry
  stock: THREE.BoxGeometry
  rifleBody: THREE.BoxGeometry
  barrel: THREE.CylinderGeometry
}

let _geo: GeoCache | null = null

function geo(): GeoCache {
  if (_geo) return _geo
  _geo = {
    base:       new THREE.CylinderGeometry(0.35, 0.45, 0.05, 24),
    upperLeg:   new THREE.CylinderGeometry(0.07, 0.065, 0.24, 8),
    lowerLeg:   new THREE.CylinderGeometry(0.065, 0.06, 0.22, 8),
    boot:       new THREE.BoxGeometry(0.13, 0.1, 0.19),
    torso:      new THREE.BoxGeometry(0.28, 0.30, 0.17),
    belt:       new THREE.BoxGeometry(0.3, 0.055, 0.19),
    shoulders:  new THREE.BoxGeometry(0.34, 0.07, 0.18),
    neck:       new THREE.CylinderGeometry(0.05, 0.06, 0.07, 8),
    head:       new THREE.SphereGeometry(0.1, 12, 10),
    helmetDome: new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    helmetBrim: new THREE.CylinderGeometry(0.14, 0.14, 0.018, 16),
    upperArm:   new THREE.CylinderGeometry(0.05, 0.045, 0.16, 8),
    forearm:    new THREE.CylinderGeometry(0.045, 0.035, 0.16, 8),
    hand:       new THREE.SphereGeometry(0.035, 6, 6),
    stock:      new THREE.BoxGeometry(0.04, 0.1, 0.07),
    rifleBody:  new THREE.BoxGeometry(0.03, 0.05, 0.42),
    barrel:     new THREE.CylinderGeometry(0.013, 0.013, 0.28, 6),
  }
  return _geo
}

// ============================================================
// Types
// ============================================================

export interface SoldierParts {
  root: THREE.Group
  base: THREE.Mesh
  hips: THREE.Group
  leftLeg: THREE.Group
  leftKnee: THREE.Group
  rightLeg: THREE.Group
  rightKnee: THREE.Group
  spine: THREE.Group
  headGrp: THREE.Group
  leftArm: THREE.Group
  leftElbow: THREE.Group
  rightArm: THREE.Group
  rightElbow: THREE.Group
  rifleGrp: THREE.Group
  muzzleFlash: THREE.Mesh
}

export interface FlexSoldierResult {
  group: THREE.Group
  parts: SoldierParts
}

// ============================================================
// Factory
// ============================================================

export function createFlexSoldier(color: number = TOY.armyGreen): FlexSoldierResult {
  const g = geo()
  const mat = getPlasticMat(color)
  const beltMat = getPlasticMat(color === TOY.armyGreen ? TOY.darkGreen : 0x8B4513)

  const root = new THREE.Group()

  // ── BASE (stand plate) ──
  const base = new THREE.Mesh(g.base, mat)
  base.position.y = 0.025
  base.scale.set(1.15, 1, 1)
  root.add(base)

  // ── HIPS (pivot for legs + spine) ──
  const hips = new THREE.Group()
  hips.position.y = 0.52
  root.add(hips)

  // ── LEFT LEG ──
  const leftLeg = new THREE.Group()
  leftLeg.position.set(-0.1, 0, 0)
  hips.add(leftLeg)

  const lUpperMesh = new THREE.Mesh(g.upperLeg, mat)
  lUpperMesh.position.y = -0.12
  leftLeg.add(lUpperMesh)

  const leftKnee = new THREE.Group()
  leftKnee.position.y = -0.24
  leftLeg.add(leftKnee)

  const lLowerMesh = new THREE.Mesh(g.lowerLeg, mat)
  lLowerMesh.position.y = -0.11
  leftKnee.add(lLowerMesh)

  const lBoot = new THREE.Mesh(g.boot, mat)
  lBoot.position.set(0, -0.24, 0.02)
  leftKnee.add(lBoot)

  // ── RIGHT LEG ──
  const rightLeg = new THREE.Group()
  rightLeg.position.set(0.1, 0, 0)
  hips.add(rightLeg)

  const rUpperMesh = new THREE.Mesh(g.upperLeg, mat)
  rUpperMesh.position.y = -0.12
  rightLeg.add(rUpperMesh)

  const rightKnee = new THREE.Group()
  rightKnee.position.y = -0.24
  rightLeg.add(rightKnee)

  const rLowerMesh = new THREE.Mesh(g.lowerLeg, mat)
  rLowerMesh.position.y = -0.11
  rightKnee.add(rLowerMesh)

  const rBoot = new THREE.Mesh(g.boot, mat)
  rBoot.position.set(0, -0.24, 0.02)
  rightKnee.add(rBoot)

  // ── SPINE (torso pivot — upper body parent) ──
  const spine = new THREE.Group()
  spine.position.y = 0.04
  hips.add(spine)

  const torsoMesh = new THREE.Mesh(g.torso, mat)
  torsoMesh.position.y = 0.17
  spine.add(torsoMesh)

  const beltMesh = new THREE.Mesh(g.belt, beltMat)
  beltMesh.position.y = 0.02
  spine.add(beltMesh)

  const shoulderMesh = new THREE.Mesh(g.shoulders, mat)
  shoulderMesh.position.y = 0.33
  spine.add(shoulderMesh)

  // ── HEAD GROUP (child of spine) ──
  const headGrp = new THREE.Group()
  headGrp.position.y = 0.40
  spine.add(headGrp)

  const neckMesh = new THREE.Mesh(g.neck, mat)
  neckMesh.position.y = 0.0
  headGrp.add(neckMesh)

  const headMesh = new THREE.Mesh(g.head, mat)
  headMesh.position.y = 0.10
  headGrp.add(headMesh)

  const helmetDome = new THREE.Mesh(g.helmetDome, mat)
  helmetDome.position.y = 0.17
  headGrp.add(helmetDome)

  const helmetBrim = new THREE.Mesh(g.helmetBrim, mat)
  helmetBrim.position.y = 0.11
  headGrp.add(helmetBrim)

  // ── LEFT ARM (child of spine) ──
  const leftArm = new THREE.Group()
  leftArm.position.set(-0.18, 0.30, 0)
  spine.add(leftArm)

  const lUpperArmMesh = new THREE.Mesh(g.upperArm, mat)
  lUpperArmMesh.position.y = -0.08
  leftArm.add(lUpperArmMesh)

  const leftElbow = new THREE.Group()
  leftElbow.position.y = -0.16
  leftArm.add(leftElbow)

  const lForearmMesh = new THREE.Mesh(g.forearm, mat)
  lForearmMesh.position.y = -0.08
  leftElbow.add(lForearmMesh)

  const lHand = new THREE.Mesh(g.hand, mat)
  lHand.position.y = -0.18
  leftElbow.add(lHand)

  // ── RIGHT ARM (child of spine) ──
  const rightArm = new THREE.Group()
  rightArm.position.set(0.18, 0.30, 0)
  spine.add(rightArm)

  const rUpperArmMesh = new THREE.Mesh(g.upperArm, mat)
  rUpperArmMesh.position.y = -0.08
  rightArm.add(rUpperArmMesh)

  const rightElbow = new THREE.Group()
  rightElbow.position.y = -0.16
  rightArm.add(rightElbow)

  const rForearmMesh = new THREE.Mesh(g.forearm, mat)
  rForearmMesh.position.y = -0.08
  rightElbow.add(rForearmMesh)

  const rHand = new THREE.Mesh(g.hand, mat)
  rHand.position.y = -0.18
  rightElbow.add(rHand)

  // ── RIFLE (attached near right hand) ──
  const rifleGrp = new THREE.Group()
  rifleGrp.position.set(0, -0.14, 0.08)
  rightElbow.add(rifleGrp)

  const stock = new THREE.Mesh(g.stock, mat)
  stock.position.set(0, 0.06, -0.04)
  rifleGrp.add(stock)

  const rifleBody = new THREE.Mesh(g.rifleBody, mat)
  rifleBody.position.set(0, 0, 0.16)
  rifleGrp.add(rifleBody)

  const barrel = new THREE.Mesh(g.barrel, mat)
  barrel.position.set(0, 0, 0.50)
  barrel.rotation.x = Math.PI / 2
  rifleGrp.add(barrel)

  // Muzzle flash (hidden by default, shown during shoot animation)
  const flashGeo = new THREE.SphereGeometry(0.025, 6, 6)
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat)
  muzzleFlash.position.set(0, 0, 0.62)
  muzzleFlash.visible = false
  rifleGrp.add(muzzleFlash)

  // Shadows on everything
  root.traverse(child => {
    if ((child as THREE.Mesh).isMesh && child !== muzzleFlash) (child as THREE.Mesh).castShadow = true
  })

  return {
    group: root,
    parts: {
      root, base, hips,
      leftLeg, leftKnee, rightLeg, rightKnee,
      spine, headGrp,
      leftArm, leftElbow, rightArm, rightElbow,
      rifleGrp, muzzleFlash,
    },
  }
}

// ============================================================
// Pose helpers — set specific poses on the skeleton
// ============================================================

/** Arms down, relaxed idle */
export function poseIdle(p: SoldierParts, t: number): void {
  p.spine.rotation.x = Math.sin(t * 0.8) * 0.02
  p.spine.rotation.z = Math.sin(t * 0.5) * 0.01
  p.headGrp.rotation.y = Math.sin(t * 0.3) * 0.15
  p.headGrp.rotation.x = Math.sin(t * 0.5) * 0.05
  p.leftArm.rotation.x = 0.05
  p.leftArm.rotation.z = 0.15
  p.leftElbow.rotation.x = -0.2
  p.rightArm.rotation.x = 0.05
  p.rightArm.rotation.z = -0.15
  p.rightElbow.rotation.x = -0.2
  p.leftLeg.rotation.x = 0
  p.leftKnee.rotation.x = 0
  p.rightLeg.rotation.x = 0
  p.rightKnee.rotation.x = 0
}

/** Walking cycle */
export function poseWalk(p: SoldierParts, t: number, speed: number = 6): void {
  const s = t * speed
  const stride = 0.5
  p.leftLeg.rotation.x = Math.sin(s) * stride
  p.leftKnee.rotation.x = Math.max(0, -Math.sin(s)) * stride * 0.8
  p.rightLeg.rotation.x = Math.sin(s + Math.PI) * stride
  p.rightKnee.rotation.x = Math.max(0, -Math.sin(s + Math.PI)) * stride * 0.8
  p.leftArm.rotation.x = Math.sin(s + Math.PI) * 0.4
  p.leftArm.rotation.z = 0.1
  p.leftElbow.rotation.x = -0.3
  p.rightArm.rotation.x = Math.sin(s) * 0.4
  p.rightArm.rotation.z = -0.1
  p.rightElbow.rotation.x = -0.3
  p.spine.rotation.z = Math.sin(s) * 0.06
  p.spine.rotation.x = 0.08 + Math.sin(s * 2) * 0.03
  p.headGrp.rotation.x = -0.08 + Math.sin(s * 2) * 0.02
  p.headGrp.rotation.y = 0
  p.hips.position.y = 0.52 + Math.abs(Math.sin(s)) * 0.03
}

/** Rifle aimed, ready to fire */
export function poseAim(p: SoldierParts, t: number): void {
  const spineX = 0.15
  p.spine.rotation.x = spineX
  p.spine.rotation.z = 0
  const armX = -Math.PI / 2
  const elbowX = -0.2
  p.rightArm.rotation.x = armX
  p.rightArm.rotation.z = -0.1
  p.rightElbow.rotation.x = elbowX
  p.leftArm.rotation.x = -Math.PI / 2 + 0.1
  p.leftArm.rotation.z = 0.3
  p.leftElbow.rotation.x = -0.3
  p.rifleGrp.rotation.x = -(spineX + armX + elbowX)
  p.headGrp.rotation.x = -0.1
  p.headGrp.rotation.y = 0.05
  p.headGrp.rotation.z = -0.05
  p.spine.rotation.x += Math.sin(t * 1.5) * 0.01
  p.leftLeg.rotation.x = 0.1
  p.leftKnee.rotation.x = -0.15
  p.rightLeg.rotation.x = -0.15
  p.rightKnee.rotation.x = -0.1
}

/** Fire recoil (call after poseAim, give a progress 0-1) */
export function poseFireRecoil(p: SoldierParts, progress: number): void {
  let kick: number
  if (progress < 0.3) {
    kick = Math.sin((progress / 0.3) * Math.PI)
  } else {
    const settle = (progress - 0.3) / 0.7
    kick = Math.exp(-settle * 5) * Math.sin(settle * 12) * 0.4
  }
  const armKick = kick * 0.15
  p.rightArm.rotation.x = -Math.PI / 2 + armKick
  p.spine.rotation.x = 0.15 - kick * 0.06
  p.headGrp.rotation.x = -0.1 + kick * 0.04
  p.spine.rotation.z = kick * 0.03
  p.rifleGrp.rotation.x = -(p.spine.rotation.x + p.rightArm.rotation.x + (-0.2))
}

/** Shoot — aim + fire recoil combined, with muzzle flash visibility. */
export function poseShoot(p: SoldierParts, progress: number): void {
  poseAim(p, 0)
  poseFireRecoil(p, progress)
  if (p.muzzleFlash) {
    p.muzzleFlash.visible = progress < 0.15
    if (p.muzzleFlash.visible) {
      p.muzzleFlash.scale.setScalar(0.8 + Math.random() * 0.4)
      p.muzzleFlash.rotation.z = Math.random() * Math.PI
    }
  }
}

/** Hit stagger — dampened shake with envelope */
export function poseHit(p: SoldierParts, age: number): void {
  const envelope = Math.exp(-age * 7)
  const freq = Math.max(8, 22 - age * 30)
  const shake = Math.sin(age * freq * Math.PI * 2) * envelope
  const stagger = Math.exp(-age * 4) * 0.2
  p.spine.rotation.z = shake * 0.15
  p.spine.rotation.x = stagger + shake * 0.08
  p.headGrp.rotation.x = shake * 0.2 + stagger * 0.5
  p.headGrp.rotation.y = shake * 0.08
  p.leftArm.rotation.x = 0.3 + shake * 0.2
  p.leftArm.rotation.z = 0.15
  p.rightArm.rotation.x = 0.3 - shake * 0.15
  p.rightArm.rotation.z = -0.15
  p.leftKnee.rotation.x = -stagger * 0.5
  p.rightKnee.rotation.x = -stagger * 0.3
  p.leftLeg.rotation.x = stagger * 0.2
  p.rightLeg.rotation.x = -stagger * 0.1
}

/** Death — staged fall: stagger -> knees buckle -> topple sideways (progress 0-1) */
export function poseDeath(p: SoldierParts, progress: number): void {
  p.root.position.y = 0
  if (progress < 0.15) {
    const t = progress / 0.15
    const stagger = t * t
    p.spine.rotation.x = stagger * 0.4
    p.spine.rotation.z = stagger * 0.05
    p.headGrp.rotation.x = stagger * 0.3
    p.leftArm.rotation.x = stagger * 0.5
    p.rightArm.rotation.x = stagger * 0.3
    p.leftLeg.rotation.x = 0
    p.rightLeg.rotation.x = 0
    p.leftKnee.rotation.x = -stagger * 0.2
    p.rightKnee.rotation.x = -stagger * 0.15
    p.root.rotation.z = 0
    p.root.rotation.x = 0
  } else if (progress < 0.4) {
    const t = (progress - 0.15) / 0.25
    const ease = t * t * (3 - 2 * t)
    p.spine.rotation.x = 0.4 - ease * 0.1
    p.spine.rotation.z = ease * 0.1
    p.headGrp.rotation.x = 0.3 + ease * 0.2
    p.leftArm.rotation.x = 0.5 + ease * 0.3
    p.leftArm.rotation.z = ease * 0.5
    p.rightArm.rotation.x = 0.3 + ease * 0.2
    p.rightArm.rotation.z = -ease * 0.3
    p.leftLeg.rotation.x = -ease * 0.3
    p.leftKnee.rotation.x = -0.2 - ease * 0.4
    p.rightLeg.rotation.x = ease * 0.15
    p.rightKnee.rotation.x = -0.15 - ease * 0.3
    p.root.rotation.z = ease * 0.15
    p.root.rotation.x = ease * 0.1
  } else {
    const t = (progress - 0.4) / 0.6
    const ease = 1 - Math.pow(1 - t, 3)
    p.root.rotation.z = 0.15 + ease * (Math.PI / 2 * 0.85 - 0.15)
    p.root.rotation.x = 0.1 + ease * 0.15
    p.spine.rotation.x = 0.3 + ease * 0.1
    p.spine.rotation.z = 0.1 - ease * 0.05
    p.headGrp.rotation.x = 0.5 + ease * 0.3
    p.headGrp.rotation.y = ease * 0.15
    p.leftArm.rotation.z = 0.5 + ease * 0.8
    p.leftArm.rotation.x = 0.8 - ease * 0.3
    p.rightArm.rotation.z = -0.3 - ease * 0.6
    p.rightArm.rotation.x = 0.5 - ease * 0.2
    p.leftLeg.rotation.x = -0.3 + ease * 0.1
    p.rightLeg.rotation.x = 0.15 + ease * 0.1
    p.leftKnee.rotation.x = -0.6 + ease * 0.2
    p.rightKnee.rotation.x = -0.45 + ease * 0.1
  }
}

/** Crouch behind cover */
export function poseCrouch(p: SoldierParts, t: number): void {
  p.leftLeg.rotation.x = -0.35
  p.leftKnee.rotation.x = 0.65
  p.rightLeg.rotation.x = -0.3
  p.rightKnee.rotation.x = 0.6
  p.hips.position.y = 0.48
  p.spine.rotation.x = 0.4 + Math.sin(t * 1.2) * 0.015
  p.spine.rotation.z = 0
  p.headGrp.rotation.x = -0.2
  p.headGrp.rotation.y = Math.sin(t * 0.6) * 0.1
  p.rightArm.rotation.x = -0.9
  p.rightArm.rotation.z = -0.15
  p.rightElbow.rotation.x = -0.7
  p.leftArm.rotation.x = -0.8
  p.leftArm.rotation.z = 0.25
  p.leftElbow.rotation.x = -0.5
  const spineX = 0.4 + Math.sin(t * 1.2) * 0.015
  const armX = -0.9
  const elbowX = -0.7
  p.rifleGrp.rotation.x = -(spineX + armX + elbowX)
}

/** Dodge — lateral lean with fast sprint */
export function poseDodge(p: SoldierParts, t: number, age: number): void {
  const s = t * 10
  const stride = 0.65
  p.leftLeg.rotation.x = Math.sin(s) * stride
  p.leftKnee.rotation.x = Math.max(0, -Math.sin(s)) * stride * 0.9
  p.rightLeg.rotation.x = Math.sin(s + Math.PI) * stride
  p.rightKnee.rotation.x = Math.max(0, -Math.sin(s + Math.PI)) * stride * 0.9
  const leanIntensity = Math.min(1, age * 4)
  p.spine.rotation.z = leanIntensity * 0.35
  p.spine.rotation.x = 0.2
  p.headGrp.rotation.x = -0.15
  p.headGrp.rotation.y = 0
  p.leftArm.rotation.x = -0.4
  p.leftArm.rotation.z = 0.6
  p.leftElbow.rotation.x = -0.3
  p.rightArm.rotation.x = -0.3
  p.rightArm.rotation.z = -0.5
  p.rightElbow.rotation.x = -0.4
  p.hips.position.y = 0.52 + Math.abs(Math.sin(s)) * 0.04
}

/** Dive / Hit the Deck */
export function poseDive(p: SoldierParts, _t: number, age: number): void {
  if (age < 0.2) {
    const dropProgress = age / 0.2
    p.hips.position.y = 0.55 - dropProgress * 0.45
    p.spine.rotation.x = dropProgress * 1.2
    p.leftArm.rotation.x = -dropProgress * 1.5
    p.rightArm.rotation.x = -dropProgress * 1.5
    p.leftLeg.rotation.x = dropProgress * 0.3
    p.rightLeg.rotation.x = dropProgress * 0.3
    p.headGrp.rotation.x = -dropProgress * 0.4
    p.headGrp.rotation.y = 0
  } else if (age < 0.6) {
    p.hips.position.y = 0.1
    p.spine.rotation.x = 1.2
    p.leftArm.rotation.x = -1.5
    p.leftArm.rotation.z = 0.3
    p.rightArm.rotation.x = -1.5
    p.rightArm.rotation.z = -0.3
    p.leftElbow.rotation.x = -0.8
    p.rightElbow.rotation.x = -0.8
    p.leftLeg.rotation.x = 0.3
    p.rightLeg.rotation.x = 0.3
    p.leftKnee.rotation.x = 0
    p.rightKnee.rotation.x = 0
    p.headGrp.rotation.x = -0.4
    p.headGrp.rotation.y = 0
  } else {
    const upProgress = (age - 0.6) / 0.2
    p.hips.position.y = 0.1 + upProgress * 0.45
    p.spine.rotation.x = 1.2 * (1 - upProgress)
    p.leftArm.rotation.x = -1.5 * (1 - upProgress)
    p.rightArm.rotation.x = -1.5 * (1 - upProgress)
    p.leftLeg.rotation.x = 0.3 * (1 - upProgress)
    p.rightLeg.rotation.x = 0.3 * (1 - upProgress)
    p.leftKnee.rotation.x = 0
    p.rightKnee.rotation.x = 0
    p.headGrp.rotation.x = -0.4 * (1 - upProgress)
    p.headGrp.rotation.y = 0
  }
}

/** Rush — forward charge, rifle low */
export function poseRush(p: SoldierParts, t: number): void {
  const s = t * 9
  const stride = 0.6
  p.leftLeg.rotation.x = Math.sin(s) * stride
  p.leftKnee.rotation.x = Math.max(0, -Math.sin(s)) * stride * 0.85
  p.rightLeg.rotation.x = Math.sin(s + Math.PI) * stride
  p.rightKnee.rotation.x = Math.max(0, -Math.sin(s + Math.PI)) * stride * 0.85
  p.spine.rotation.x = 0.35
  p.spine.rotation.z = Math.sin(s) * 0.05
  p.headGrp.rotation.x = -0.2
  p.headGrp.rotation.y = 0
  p.rightArm.rotation.x = -0.8
  p.rightArm.rotation.z = -0.1
  p.rightElbow.rotation.x = -0.4
  p.leftArm.rotation.x = Math.sin(s + Math.PI) * 0.5
  p.leftArm.rotation.z = 0.15
  p.leftElbow.rotation.x = -0.4
  const spineX = 0.35
  const armX = -0.8
  const elbowX = -0.4
  p.rifleGrp.rotation.x = -(spineX + armX + elbowX)
  p.hips.position.y = 0.52 + Math.abs(Math.sin(s)) * 0.04
}

/** Throwing grenade (progress 0->1) */
export function poseThrow(p: SoldierParts, progress: number): void {
  const t = progress * progress * (3 - 2 * progress)
  if (t < 0.5) {
    const wind = t * 2
    p.spine.rotation.x = -0.15 * wind
    p.spine.rotation.z = 0.1 * wind
    p.rightArm.rotation.x = -0.3 - wind * 1.8
    p.rightArm.rotation.z = -0.2 - wind * 0.3
    p.rightElbow.rotation.x = -0.5 - wind * 1.0
    p.leftArm.rotation.x = -0.4 - wind * 0.5
    p.leftArm.rotation.z = 0.3
    p.leftElbow.rotation.x = -0.8
    p.leftLeg.rotation.x = 0.15 * wind
    p.rightLeg.rotation.x = -0.2 * wind
    p.leftKnee.rotation.x = 0
    p.rightKnee.rotation.x = -0.15 * wind
    p.headGrp.rotation.x = 0.1 * wind
    p.headGrp.rotation.y = 0
  } else {
    const release = (t - 0.5) * 2
    p.spine.rotation.x = -0.15 + release * 0.45
    p.spine.rotation.z = 0.1 - release * 0.2
    p.rightArm.rotation.x = -2.1 + release * 2.4
    p.rightArm.rotation.z = -0.5 + release * 0.4
    p.rightElbow.rotation.x = -1.5 + release * 1.2
    p.leftArm.rotation.x = -0.9 + release * 0.5
    p.leftArm.rotation.z = 0.3
    p.leftElbow.rotation.x = -0.8
    p.leftLeg.rotation.x = 0.15 + release * 0.15
    p.rightLeg.rotation.x = -0.2 + release * 0.1
    p.leftKnee.rotation.x = 0
    p.rightKnee.rotation.x = -0.15 + release * 0.15
    p.headGrp.rotation.x = 0.1 - release * 0.2
    p.headGrp.rotation.y = 0
  }
  p.rifleGrp.rotation.x = 0.5
  p.rifleGrp.rotation.z = 0.3
  p.hips.position.y = 0.52
}

/** Get down — hide behind cover, rifle down, waiting to pop up. */
export function poseGetDown(p: SoldierParts, t: number, progress: number): void {
  const ease = progress * progress * (3 - 2 * progress)

  p.hips.position.y = 0.52 - ease * 0.20
  p.leftLeg.rotation.x = ease * -0.55
  p.leftKnee.rotation.x = ease * 0.95
  p.rightLeg.rotation.x = ease * -0.50
  p.rightKnee.rotation.x = ease * 0.90

  p.spine.rotation.x = ease * 0.75
  p.spine.rotation.z = ease * 0.05

  const idleWeight = ease
  p.headGrp.rotation.x = ease * -0.35 + idleWeight * Math.sin(t * 0.8) * 0.05
  p.headGrp.rotation.y = idleWeight * Math.sin(t * 0.4) * 0.12

  p.rightArm.rotation.x = ease * -0.3
  p.rightArm.rotation.z = ease * -0.2
  p.rightElbow.rotation.x = ease * -1.2
  p.leftArm.rotation.x = ease * -0.2
  p.leftArm.rotation.z = ease * 0.35
  p.leftElbow.rotation.x = ease * -0.9

  p.rifleGrp.rotation.x = ease * 0.8
  p.rifleGrp.rotation.z = ease * 0.1
}

/** Turret operator pose (crouching behind turret) */
export function poseTurretOperator(p: SoldierParts, t: number): void {
  p.leftLeg.rotation.x = -0.4
  p.leftKnee.rotation.x = 0.7
  p.rightLeg.rotation.x = -0.35
  p.rightKnee.rotation.x = 0.65
  p.hips.position.y = 0.45
  p.spine.rotation.x = 0.3
  p.spine.rotation.z = 0
  p.headGrp.rotation.x = -0.15
  p.headGrp.rotation.y = Math.sin(t * 0.4) * 0.08
  p.rightArm.rotation.x = -1.2
  p.rightArm.rotation.z = -0.1
  p.rightElbow.rotation.x = -0.5
  p.leftArm.rotation.x = -1.1
  p.leftArm.rotation.z = 0.2
  p.leftElbow.rotation.x = -0.4
  const spineX = 0.3
  const armX = -1.2
  const elbowX = -0.5
  p.rifleGrp.rotation.x = -(spineX + armX + elbowX)
}

/** Unified animation dispatcher -- maps UnitStatus to pose functions */
export function animateFlexSoldier(
  soldier: FlexSoldierResult,
  status: string,
  elapsed: number,
  _dt: number,
): void {
  const p = soldier.parts
  switch (status) {
    case 'idle':
      poseIdle(p, elapsed)
      break
    case 'walking':
      poseWalk(p, elapsed)
      break
    case 'firing': {
      const cycle = (elapsed % 1.2) / 1.2
      if (cycle < 0.3) {
        poseShoot(p, cycle / 0.3)
      } else {
        poseAim(p, elapsed)
      }
      if (p.muzzleFlash) {
        p.muzzleFlash.visible = cycle > 0.1 && cycle < 0.2
      }
      break
    }
    case 'hit':
      poseHit(p, elapsed % 0.5)
      break
    case 'dead': {
      const deathProgress = Math.min(1, (elapsed % 3) / 1.5)
      poseDeath(p, deathProgress)
      break
    }
    default:
      poseIdle(p, elapsed)
  }
}
