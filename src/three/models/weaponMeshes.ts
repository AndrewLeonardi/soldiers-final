import * as THREE from 'three'
import type { WeaponType } from '@config/types'
import { TOY, getPlasticMat } from './materials'
import type { SoldierParts } from './flexSoldier'

/**
 * Create a placeholder weapon mesh for non-rifle weapons.
 * Attach to the soldier's right elbow joint.
 */
export function createWeaponMesh(weapon: WeaponType): THREE.Group {
  const grp = new THREE.Group()
  const mat = getPlasticMat(TOY.metalDark)

  if (weapon === 'rocketLauncher') {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.5, 8),
      mat,
    )
    tube.rotation.x = Math.PI / 2
    tube.position.z = 0.15
    grp.add(tube)
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.03, 0.08, 8),
      mat,
    )
    bell.rotation.x = Math.PI / 2
    bell.position.z = -0.1
    grp.add(bell)
  } else if (weapon === 'grenade') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      getPlasticMat(TOY.darkGreen),
    )
    body.position.z = 0.05
    grp.add(body)
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.03, 4),
      mat,
    )
    pin.position.set(0, 0.04, 0.05)
    grp.add(pin)
  } else if (weapon === 'machineGun') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.06, 0.55),
      mat,
    )
    body.position.z = 0.12
    grp.add(body)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6),
      mat,
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = 0.42
    grp.add(barrel)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.1, 0.04),
      mat,
    )
    mag.position.set(0, -0.06, 0.08)
    grp.add(mag)
  }

  return grp
}

/**
 * Create a larger standalone weapon for display purposes (weapon rack).
 * ~3x the size of the in-hand version, centered at origin.
 */
export function createDisplayWeapon(weapon: WeaponType): THREE.Group {
  const grp = new THREE.Group()
  const mat = getPlasticMat(TOY.metalDark)
  const s = 2.0 // display scale

  if (weapon === 'rifle') {
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 * s, 0.1 * s, 0.07 * s),
      getPlasticMat(TOY.armyGreen),
    )
    stock.position.set(0, 0, -0.12 * s)
    grp.add(stock)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 * s, 0.05 * s, 0.42 * s),
      getPlasticMat(TOY.armyGreen),
    )
    body.position.set(0, 0, 0.08 * s)
    grp.add(body)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013 * s, 0.013 * s, 0.28 * s, 6),
      mat,
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0, 0.38 * s)
    grp.add(barrel)
  } else if (weapon === 'rocketLauncher') {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * s, 0.035 * s, 0.5 * s, 8),
      mat,
    )
    tube.rotation.x = Math.PI / 2
    grp.add(tube)
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045 * s, 0.03 * s, 0.08 * s, 8),
      mat,
    )
    bell.rotation.x = Math.PI / 2
    bell.position.z = -0.25 * s
    grp.add(bell)
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.025 * s, 0.08 * s, 0.03 * s),
      getPlasticMat(TOY.armyGreen),
    )
    grip.position.set(0, -0.05 * s, 0.05 * s)
    grp.add(grip)
  } else if (weapon === 'grenade') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * s, 10, 10),
      getPlasticMat(TOY.darkGreen),
    )
    grp.add(body)
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005 * s, 0.005 * s, 0.04 * s, 4),
      mat,
    )
    pin.position.set(0, 0.045 * s, 0)
    grp.add(pin)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.015 * s, 0.004 * s, 6, 8),
      mat,
    )
    ring.position.set(0, 0.07 * s, 0)
    grp.add(ring)
  } else if (weapon === 'machineGun') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 * s, 0.06 * s, 0.55 * s),
      mat,
    )
    grp.add(body)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.3 * s, 6),
      mat,
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = 0.3 * s
    grp.add(barrel)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 * s, 0.1 * s, 0.04 * s),
      getPlasticMat(TOY.armyGreen),
    )
    mag.position.set(0, -0.06 * s, -0.04 * s)
    grp.add(mag)
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.035 * s, 0.04 * s, 0.12 * s),
      getPlasticMat(TOY.armyGreen),
    )
    stock.position.set(0, 0, -0.32 * s)
    grp.add(stock)
  }

  return grp
}

/**
 * Swap the weapon on a soldier's model.
 * Returns the custom weapon group (or null for rifle).
 * Caller should track the returned group to remove it later.
 */
export function applyWeaponToSoldier(
  parts: SoldierParts,
  weapon: WeaponType,
  previousWeaponGrp: THREE.Group | null,
): THREE.Group | null {
  // Remove previous custom weapon from rifleGrp
  if (previousWeaponGrp) {
    parts.rifleGrp.remove(previousWeaponGrp)
  }

  if (weapon === 'rifle') {
    // Show all built-in rifle meshes
    parts.rifleGrp.visible = true
    for (const child of [...parts.rifleGrp.children]) {
      child.visible = true
    }
    return null
  }

  // Hide built-in rifle meshes, add custom weapon INSIDE rifleGrp
  // so it inherits the same rotation corrections from pose functions.
  for (const child of [...parts.rifleGrp.children]) {
    child.visible = false
  }
  const wpnMesh = createWeaponMesh(weapon)
  parts.rifleGrp.add(wpnMesh)
  parts.rifleGrp.visible = true
  return wpnMesh
}
