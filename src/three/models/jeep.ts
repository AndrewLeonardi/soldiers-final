// ============================================================
// Jeep — Willys-style military jeep (two variants)
// 1) Transport Jeep — 4 soldiers, exit animation
// 2) Gun Jeep — 2 soldiers + mounted MG, firing + exit
// ============================================================

import * as THREE from 'three'
import { getPlasticMat, plasticMat, TOY, disposeGroup } from './materials'
import { dampenedShake } from './easing'
import { createFlexSoldier } from './flexSoldier'
import type { SoldierParts } from './flexSoldier'
import {
  poseJeepDriver,
  poseJeepPassenger,
  poseJeepGunner,
  poseJeepJumping,
  poseJeepLanded,
} from './equipmentPoses'

const MUZZLE_FLASH_COLOR = 0xFFAA22
const SOLDIER_SCALE = 0.22

interface SoldierSlot {
  group: THREE.Group
  parts: SoldierParts
  seatPos: THREE.Vector3
  jumpDir: THREE.Vector3
  delay: number
}

interface JeepBody {
  group: THREE.Group
  wheelGroups: THREE.Group
}

export interface TransportJeepInstance {
  group: THREE.Group
  parts: { wheelGroups: THREE.Group }
  dispose: () => void
}

export interface GunJeepInstance {
  group: THREE.Group
  parts: { wheelGroups: THREE.Group; gunPivot: THREE.Group; muzzleFlash: THREE.Mesh }
  dispose: () => void
}

// ── Shared Jeep Body Builder ──

function buildJeepBody(): JeepBody {
  const group = new THREE.Group()

  const greenMat = getPlasticMat(TOY.armyGreen)
  const darkMat = getPlasticMat(TOY.darkGreen)
  const blackMat = getPlasticMat(TOY.black)
  const metalMat = getPlasticMat(TOY.metalDark)
  const khakiMat = getPlasticMat(TOY.khaki)
  const whiteMat = getPlasticMat(0xFFFFFF)

  // CHASSIS
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.55), greenMat)
  chassis.position.set(0, 0.08, 0); chassis.castShadow = true; group.add(chassis)

  // HOOD
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.18), greenMat)
  hood.position.set(0, 0.14, -0.19); hood.castShadow = true; group.add(hood)

  // GRILLE
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.02), darkMat)
  grille.position.set(0, 0.12, -0.28); grille.castShadow = true; group.add(grille)
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.025), metalMat)
    slat.position.set(0, 0.08 + i * 0.035, -0.282); group.add(slat)
  }

  // HEADLIGHTS
  const headlightGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.015, 8)
  for (const sx of [-0.09, 0.09]) {
    const light = new THREE.Mesh(headlightGeo, getPlasticMat(0xDDDD88))
    light.position.set(sx, 0.13, -0.29); light.rotation.x = Math.PI / 2; group.add(light)
  }

  // FENDERS
  const fenderGeo = new THREE.BoxGeometry(0.08, 0.04, 0.12)
  const fenderPositions: [number, number, number][] = [[-0.165, 0.12, -0.18], [0.165, 0.12, -0.18], [-0.165, 0.12, 0.16], [0.165, 0.12, 0.16]]
  for (const [fx, fy, fz] of fenderPositions) {
    const fender = new THREE.Mesh(fenderGeo, greenMat)
    fender.position.set(fx, fy, fz); fender.castShadow = true; group.add(fender)
  }

  // BODY TUB — side walls
  const sideGeo = new THREE.BoxGeometry(0.02, 0.1, 0.28)
  const leftSide = new THREE.Mesh(sideGeo, greenMat)
  leftSide.position.set(-0.165, 0.15, 0.07); leftSide.castShadow = true; group.add(leftSide)
  const rightSide = new THREE.Mesh(sideGeo, greenMat)
  rightSide.position.set(0.165, 0.15, 0.07); rightSide.castShadow = true; group.add(rightSide)

  // REAR PANEL
  const rearPanel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.02), greenMat)
  rearPanel.position.set(0, 0.15, 0.21); rearPanel.castShadow = true; group.add(rearPanel)

  // WINDSHIELD FRAME
  for (const sx of [-0.12, 0.12]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.1, 0.015), metalMat)
    post.position.set(sx, 0.23, -0.1); group.add(post)
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.015, 0.015), metalMat)
  crossbar.position.set(0, 0.28, -0.1); group.add(crossbar)

  // DASHBOARD
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), darkMat)
  dashboard.position.set(0, 0.17, -0.09); group.add(dashboard)

  // STEERING WHEEL
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 12), metalMat)
  steeringWheel.position.set(-0.06, 0.2, -0.08); steeringWheel.rotation.x = Math.PI / 2 - 0.3; group.add(steeringWheel)
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6), metalMat)
  column.position.set(-0.06, 0.18, -0.08); column.rotation.x = -0.3; group.add(column)

  // WHEELS
  const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8)
  wheelGeo.rotateZ(Math.PI / 2)
  const wheelPositions: [number, number, number][] = [[-0.185, 0.055, -0.18], [0.185, 0.055, -0.18], [-0.185, 0.055, 0.16], [0.185, 0.055, 0.16]]
  const wheelGroups = new THREE.Group()
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, blackMat)
    wheel.position.set(wx, wy, wz); wheel.castShadow = true; wheelGroups.add(wheel)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.042, 6), metalMat)
    hub.position.set(wx, wy, wz); hub.rotation.z = Math.PI / 2; wheelGroups.add(hub)
  }
  group.add(wheelGroups)

  // SPARE TIRE
  const spareTire = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.018, 8, 12), blackMat)
  spareTire.position.set(0, 0.17, 0.23); spareTire.castShadow = true; group.add(spareTire)
  const spareHub = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6), metalMat)
  spareHub.position.set(0, 0.17, 0.23); spareHub.rotation.x = Math.PI / 2; group.add(spareHub)

  // STAR DECAL
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), whiteMat)
  star.position.set(0, 0.18, -0.19); star.rotation.x = -Math.PI / 2; star.rotation.z = Math.PI / 2; group.add(star)

  return { group, wheelGroups }
}

// ── Soldier exit animation ──

const EXIT_DURATION = 2.5
const STAND_PHASE = 0.15
const JUMP_PHASE = 0.35
const LAND_PHASE = 0.20
const READY_PHASE = 0.30
const JUMP_HEIGHT = 0.12
const JUMP_LATERAL = 0.22

function animateSoldierExit(slot: SoldierSlot, exitTime: number, t: number): void {
  const localTime = exitTime - slot.delay
  if (localTime < 0) return

  const progress = Math.min(localTime / EXIT_DURATION, 1)

  if (progress < STAND_PHASE) {
    const p = progress / STAND_PHASE
    const seatY = slot.seatPos.y
    slot.group.position.set(slot.seatPos.x, seatY + p * 0.04, slot.seatPos.z)
    poseJeepPassenger(slot.parts, t)
    slot.parts.hips.position.y = 0.36 + p * 0.12
    slot.parts.leftKnee.rotation.x = -0.75 + p * 0.4
    slot.parts.rightKnee.rotation.x = -0.7 + p * 0.4
  } else if (progress < STAND_PHASE + JUMP_PHASE) {
    const p = (progress - STAND_PHASE) / JUMP_PHASE
    const arcY = Math.sin(p * Math.PI) * JUMP_HEIGHT
    const lateralDist = p * JUMP_LATERAL
    slot.group.position.set(
      slot.seatPos.x + slot.jumpDir.x * lateralDist,
      slot.seatPos.y + 0.04 + arcY,
      slot.seatPos.z + slot.jumpDir.z * lateralDist,
    )
    poseJeepJumping(slot.parts, t, p)
  } else if (progress < STAND_PHASE + JUMP_PHASE + LAND_PHASE) {
    const p = (progress - STAND_PHASE - JUMP_PHASE) / LAND_PHASE
    const landX = slot.seatPos.x + slot.jumpDir.x * JUMP_LATERAL
    const landZ = slot.seatPos.z + slot.jumpDir.z * JUMP_LATERAL
    slot.group.position.set(landX, slot.seatPos.y - 0.01, landZ)
    poseJeepLanded(slot.parts, t, p * 0.5)
  } else {
    const p = (progress - STAND_PHASE - JUMP_PHASE - LAND_PHASE) / READY_PHASE
    const landX = slot.seatPos.x + slot.jumpDir.x * JUMP_LATERAL
    const landZ = slot.seatPos.z + slot.jumpDir.z * JUMP_LATERAL
    slot.group.position.set(landX, slot.seatPos.y, landZ)
    poseJeepLanded(slot.parts, t, 0.5 + p * 0.5)
  }
}

// ── TRANSPORT JEEP ──

export function createTransportJeep(): TransportJeepInstance {
  const { group, wheelGroups } = buildJeepBody()
  const soldierSlots: SoldierSlot[] = []

  const seats = [
    { pos: [-0.06, 0.10, -0.02] as const, jumpDir: [-1, 0, -0.3] as const, delay: 0.0, isDriver: true },
    { pos: [0.06, 0.10, -0.02] as const,  jumpDir: [1, 0, -0.3] as const,  delay: 0.15, isDriver: false },
    { pos: [-0.06, 0.10, 0.10] as const,  jumpDir: [-1, 0, 0.3] as const,  delay: 0.30, isDriver: false },
    { pos: [0.06, 0.10, 0.10] as const,   jumpDir: [1, 0, 0.3] as const,   delay: 0.45, isDriver: false },
  ]

  const seatMat = getPlasticMat(TOY.khaki)
  const seatGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06)

  for (let i = 0; i < seats.length; i++) {
    const s = seats[i]
    const seatMesh = new THREE.Mesh(seatGeo, seatMat)
    seatMesh.position.set(s.pos[0], s.pos[1] - 0.02, s.pos[2])
    group.add(seatMesh)

    const { group: soldierGrp, parts } = createFlexSoldier(TOY.armyGreen)
    soldierGrp.scale.setScalar(SOLDIER_SCALE)
    soldierGrp.position.set(s.pos[0], s.pos[1], s.pos[2])
    soldierGrp.rotation.y = Math.PI
    group.add(soldierGrp)

    if (s.isDriver) poseJeepDriver(parts, 0)
    else poseJeepPassenger(parts, 0)

    soldierSlots.push({
      group: soldierGrp,
      parts,
      seatPos: new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]),
      jumpDir: new THREE.Vector3(s.jumpDir[0], s.jumpDir[1], s.jumpDir[2]).normalize(),
      delay: s.delay,
    })
  }

  group.userData.soldierSlots = soldierSlots
  group.userData.isDriver = [true, false, false, false]

  return { group, parts: { wheelGroups }, dispose: () => disposeGroup(group) }
}

export function animateTransportJeep(instance: TransportJeepInstance, state: string, elapsed: number, _dt: number, phase: number = 0): void {
  const slots = instance.group.userData.soldierSlots as SoldierSlot[] | undefined
  const isDriver = instance.group.userData.isDriver as boolean[] | undefined

  if (state === 'idle') {
    if (slots) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        slot.group.position.set(slot.seatPos.x, slot.seatPos.y, slot.seatPos.z)
        if (isDriver && isDriver[i]) poseJeepDriver(slot.parts, elapsed)
        else poseJeepPassenger(slot.parts, elapsed)
      }
    }
    instance.group.position.y = Math.sin(elapsed * 1.5 + phase) * 0.003
  }

  if (state === 'exit') {
    if (instance.group.userData._exitStart == null) instance.group.userData._exitStart = elapsed
    const exitTime = elapsed - (instance.group.userData._exitStart as number)
    if (slots) {
      for (let i = 0; i < slots.length; i++) animateSoldierExit(slots[i], exitTime, elapsed)
    }
    const totalDuration = EXIT_DURATION + 0.45 + 0.5
    if (exitTime > totalDuration) instance.group.userData._exitStart = elapsed
  } else {
    instance.group.userData._exitStart = null
  }

  if (state === 'hit') {
    if (instance.group.userData._hitStart == null) instance.group.userData._hitStart = elapsed
    const hitAge = elapsed - (instance.group.userData._hitStart as number)
    instance.group.rotation.z = dampenedShake(hitAge) * 0.05
    instance.group.rotation.x = dampenedShake(hitAge, 16, 7) * 0.04
  } else {
    instance.group.userData._hitStart = null
    if (state !== 'exit') {
      instance.group.rotation.z = 0
      instance.group.rotation.x = 0
    }
  }
}

// ── GUN JEEP ──

export function createGunJeep(): GunJeepInstance {
  const { group, wheelGroups } = buildJeepBody()
  const metalMat = getPlasticMat(TOY.metalDark)
  const darkMat = getPlasticMat(TOY.darkGreen)
  const seatMat = getPlasticMat(TOY.khaki)
  const seatGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06)

  // DRIVER SEAT
  const driverSeat = new THREE.Mesh(seatGeo, seatMat)
  driverSeat.position.set(-0.06, 0.08, -0.02); group.add(driverSeat)

  // GUN MOUNT
  const mountPost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.14, 6), metalMat)
  mountPost.position.set(0, 0.17, 0.15); mountPost.castShadow = true; group.add(mountPost)

  const gunPivot = new THREE.Group()
  gunPivot.position.set(0, 0.24, 0.15); group.add(gunPivot)

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), metalMat)
  receiver.position.set(0, 0.01, 0.02); receiver.castShadow = true; gunPivot.add(receiver)

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.2, 8), metalMat)
  barrel.position.set(0, 0.01, 0.18); barrel.rotation.x = Math.PI / 2; barrel.castShadow = true; gunPivot.add(barrel)

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.04, 0.02), darkMat)
  grip.position.set(0, -0.01, -0.05); gunPivot.add(grip)

  // Muzzle flash
  const flashMat = plasticMat(MUZZLE_FLASH_COLOR)
  flashMat.emissive = new THREE.Color(MUZZLE_FLASH_COLOR)
  flashMat.emissiveIntensity = 3.0
  const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), flashMat)
  muzzleFlash.position.set(0, 0.01, 0.29); muzzleFlash.visible = false; gunPivot.add(muzzleFlash)

  // SOLDIERS
  const soldierSlots: SoldierSlot[] = []

  const { group: driverGrp, parts: driverParts } = createFlexSoldier(TOY.armyGreen)
  driverGrp.scale.setScalar(SOLDIER_SCALE)
  driverGrp.position.set(-0.06, 0.10, -0.02)
  driverGrp.rotation.y = Math.PI
  poseJeepDriver(driverParts, 0)
  group.add(driverGrp)
  soldierSlots.push({
    group: driverGrp, parts: driverParts,
    seatPos: new THREE.Vector3(-0.06, 0.10, -0.02),
    jumpDir: new THREE.Vector3(-1, 0, -0.3).normalize(),
    delay: 0.0,
  })

  const { group: gunnerGrp, parts: gunnerParts } = createFlexSoldier(TOY.armyGreen)
  gunnerGrp.scale.setScalar(SOLDIER_SCALE)
  gunnerGrp.position.set(0, 0.10, 0.08)
  poseJeepGunner(gunnerParts, 0)
  group.add(gunnerGrp)
  soldierSlots.push({
    group: gunnerGrp, parts: gunnerParts,
    seatPos: new THREE.Vector3(0, 0.10, 0.08),
    jumpDir: new THREE.Vector3(1, 0, 0.3).normalize(),
    delay: 0.2,
  })

  group.userData.soldierSlots = soldierSlots
  group.userData.isDriver = [true, false]

  return { group, parts: { wheelGroups, gunPivot, muzzleFlash }, dispose: () => disposeGroup(group) }
}

export function animateGunJeep(instance: GunJeepInstance, state: string, elapsed: number, _dt: number, phase: number = 0): void {
  const { gunPivot, muzzleFlash } = instance.parts
  const slots = instance.group.userData.soldierSlots as SoldierSlot[] | undefined
  const isDriver = instance.group.userData.isDriver as boolean[] | undefined

  if (state === 'idle') {
    if (slots) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        slot.group.position.set(slot.seatPos.x, slot.seatPos.y, slot.seatPos.z)
        if (isDriver && isDriver[i]) poseJeepDriver(slot.parts, elapsed)
        else poseJeepGunner(slot.parts, elapsed)
      }
    }
    if (gunPivot) {
      gunPivot.rotation.y = Math.sin((elapsed + phase) * 0.4) * 0.5
      gunPivot.rotation.x = 0
    }
    instance.group.position.y = Math.sin(elapsed * 1.5 + phase) * 0.003
    if (muzzleFlash) muzzleFlash.visible = false
  }

  if (state === 'firing') {
    if (slots && slots.length > 1) {
      slots[1].group.position.set(slots[1].seatPos.x, slots[1].seatPos.y, slots[1].seatPos.z)
      poseJeepGunner(slots[1].parts, elapsed)
    }
    if (slots && slots.length > 0 && isDriver && isDriver[0]) {
      slots[0].group.position.set(slots[0].seatPos.x, slots[0].seatPos.y, slots[0].seatPos.z)
      poseJeepDriver(slots[0].parts, elapsed)
    }
    if (gunPivot) {
      const recoilCycle = ((elapsed + phase) * 6) % 1
      const kick = recoilCycle < 0.15 ? Math.sin((recoilCycle / 0.15) * Math.PI) : 0
      gunPivot.rotation.x = kick * 0.04
    }
    if (muzzleFlash) {
      const flashCycle = ((elapsed + phase) * 6) % 1
      muzzleFlash.visible = flashCycle < 0.12
    }
  } else {
    if (muzzleFlash && state !== 'idle') muzzleFlash.visible = false
    if (gunPivot && state !== 'idle') gunPivot.rotation.x = 0
  }

  if (state === 'exit') {
    if (instance.group.userData._exitStart == null) instance.group.userData._exitStart = elapsed
    const exitTime = elapsed - (instance.group.userData._exitStart as number)
    if (slots) {
      for (let i = 0; i < slots.length; i++) animateSoldierExit(slots[i], exitTime, elapsed)
    }
    if (gunPivot) { gunPivot.rotation.y = 0; gunPivot.rotation.x = 0 }
    if (muzzleFlash) muzzleFlash.visible = false
    const totalDuration = EXIT_DURATION + 0.2 + 0.5
    if (exitTime > totalDuration) instance.group.userData._exitStart = elapsed
  } else {
    instance.group.userData._exitStart = null
  }

  if (state === 'hit') {
    if (instance.group.userData._hitStart == null) instance.group.userData._hitStart = elapsed
    const hitAge = elapsed - (instance.group.userData._hitStart as number)
    instance.group.rotation.z = dampenedShake(hitAge) * 0.05
    instance.group.rotation.x = dampenedShake(hitAge, 16, 7) * 0.04
  } else {
    instance.group.userData._hitStart = null
    if (state !== 'exit' && state !== 'firing') {
      instance.group.rotation.z = 0
      instance.group.rotation.x = 0
    }
  }
}
