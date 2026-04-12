// ============================================================
// Equipment Poses — Operator stances for defense-item soldiers
// Each function sets a static "using equipment" pose on a FlexSoldier.
// Called every frame by the defense model's own animator.
// ============================================================

import type { SoldierParts } from './flexSoldier'

/**
 * Turret operator — deep crouch, both arms reaching forward to gun handles.
 * Used by Pea Shooter and Machine Gun Turret.
 */
export function poseTurretOperator(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.38
  p.leftLeg.rotation.x = -0.5
  p.leftKnee.rotation.x = -0.7
  p.rightLeg.rotation.x = -0.4
  p.rightKnee.rotation.x = -0.6
  p.spine.rotation.x = 0.35 + Math.sin(t * 0.8) * 0.01
  p.spine.rotation.z = 0
  p.leftArm.rotation.x = -Math.PI / 2 + 0.2
  p.leftArm.rotation.z = 0.3
  p.leftElbow.rotation.x = -0.4
  p.rightArm.rotation.x = -Math.PI / 2 + 0.2
  p.rightArm.rotation.z = -0.3
  p.rightElbow.rotation.x = -0.4
  p.headGrp.rotation.x = -0.25
  p.headGrp.rotation.y = Math.sin(t * 0.3) * 0.08
}

/**
 * Trench defender — deep crouch inside trench, rifle over sandbags.
 */
export function poseTrenchDefender(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.34
  p.leftLeg.rotation.x = -0.6
  p.leftKnee.rotation.x = -0.9
  p.rightLeg.rotation.x = -0.5
  p.rightKnee.rotation.x = -0.8
  p.spine.rotation.x = 0.3 + Math.sin(t * 0.6) * 0.015
  p.spine.rotation.z = Math.sin(t * 0.4) * 0.01
  p.rightArm.rotation.x = -Math.PI / 2 - 0.1
  p.rightArm.rotation.z = -0.1
  p.rightElbow.rotation.x = -0.2
  p.leftArm.rotation.x = -Math.PI / 2 + 0.05
  p.leftArm.rotation.z = 0.25
  p.leftElbow.rotation.x = -0.3
  const spineX = p.spine.rotation.x
  const elbowX = p.rightElbow.rotation.x
  p.rifleGrp.rotation.x = -elbowX - spineX
  p.headGrp.rotation.x = -0.3
  p.headGrp.rotation.y = Math.sin(t * 0.25) * 0.12
}

/**
 * Catapult operator — idle standing pose beside catapult.
 */
export function poseCatapultOperator(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.50
  p.leftLeg.rotation.x = 0.1
  p.leftKnee.rotation.x = -0.1
  p.rightLeg.rotation.x = -0.1
  p.rightKnee.rotation.x = -0.1
  p.spine.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.015
  p.spine.rotation.z = 0
  p.rightArm.rotation.x = 0.05
  p.rightArm.rotation.z = -0.15
  p.rightElbow.rotation.x = -0.2
  p.leftArm.rotation.x = 0.05
  p.leftArm.rotation.z = 0.15
  p.leftElbow.rotation.x = -0.2
  p.headGrp.rotation.x = 0
  p.headGrp.rotation.y = Math.sin(t * 0.3) * 0.1
}

// ── JEEP POSES ──

/**
 * Jeep driver — seated, hands on steering wheel, slight road-sway.
 */
export function poseJeepDriver(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.36
  p.leftLeg.rotation.x = -0.9
  p.leftKnee.rotation.x = -0.8
  p.rightLeg.rotation.x = -0.8
  p.rightKnee.rotation.x = -0.7
  p.spine.rotation.x = 0.08 + Math.sin(t * 1.2) * 0.01
  p.spine.rotation.z = Math.sin(t * 0.7) * 0.015
  p.leftArm.rotation.x = -Math.PI / 2 + 0.4
  p.leftArm.rotation.z = 0.3
  p.leftElbow.rotation.x = -0.6
  p.rightArm.rotation.x = -Math.PI / 2 + 0.4
  p.rightArm.rotation.z = -0.3
  p.rightElbow.rotation.x = -0.6
  p.headGrp.rotation.x = -0.1
  p.headGrp.rotation.y = Math.sin(t * 0.4) * 0.06
}

/**
 * Jeep passenger — seated, rifle across lap, relaxed.
 */
export function poseJeepPassenger(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.36
  p.leftLeg.rotation.x = -0.85
  p.leftKnee.rotation.x = -0.75
  p.rightLeg.rotation.x = -0.8
  p.rightKnee.rotation.x = -0.7
  p.spine.rotation.x = -0.02 + Math.sin(t * 0.9) * 0.012
  p.spine.rotation.z = Math.sin(t * 0.5) * 0.01
  p.rightArm.rotation.x = -0.3
  p.rightArm.rotation.z = -0.15
  p.rightElbow.rotation.x = -0.5
  p.leftArm.rotation.x = -0.2
  p.leftArm.rotation.z = 0.15
  p.leftElbow.rotation.x = -0.4
  p.headGrp.rotation.x = -0.05
  p.headGrp.rotation.y = Math.sin(t * 0.3) * 0.12
}

/**
 * Jeep gunner — standing tall in rear, hands on mounted MG handles.
 */
export function poseJeepGunner(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.50
  p.leftLeg.rotation.x = -0.15
  p.leftLeg.rotation.z = 0.08
  p.leftKnee.rotation.x = -0.15
  p.rightLeg.rotation.x = -0.1
  p.rightLeg.rotation.z = -0.08
  p.rightKnee.rotation.x = -0.12
  p.spine.rotation.x = 0.2 + Math.sin(t * 0.8) * 0.01
  p.spine.rotation.z = 0
  p.leftArm.rotation.x = -Math.PI / 2 + 0.25
  p.leftArm.rotation.z = 0.25
  p.leftElbow.rotation.x = -0.35
  p.rightArm.rotation.x = -Math.PI / 2 + 0.25
  p.rightArm.rotation.z = -0.25
  p.rightElbow.rotation.x = -0.35
  p.headGrp.rotation.x = -0.2
  p.headGrp.rotation.y = Math.sin(t * 0.35) * 0.06
}

/**
 * Jeep jump — mid-air pose.
 */
export function poseJeepJumping(p: SoldierParts, _t: number, _age: number): void {
  p.hips.position.y = 0.48
  p.leftLeg.rotation.x = -0.6
  p.leftKnee.rotation.x = -1.0
  p.rightLeg.rotation.x = -0.5
  p.rightKnee.rotation.x = -0.9
  p.spine.rotation.x = 0.3
  p.spine.rotation.z = 0
  p.leftArm.rotation.x = -0.6
  p.leftArm.rotation.z = 0.8
  p.leftElbow.rotation.x = -0.2
  p.rightArm.rotation.x = -0.6
  p.rightArm.rotation.z = -0.8
  p.rightElbow.rotation.x = -0.2
  p.headGrp.rotation.x = 0.15
  p.headGrp.rotation.y = 0
}

/**
 * Jeep landing — crouch on impact, then rise to stand.
 */
export function poseJeepLanded(p: SoldierParts, _t: number, age: number): void {
  const rise = Math.min(age, 1)
  p.hips.position.y = 0.32 + rise * 0.20
  p.leftLeg.rotation.x = -0.7 + rise * 0.6
  p.leftKnee.rotation.x = -0.8 + rise * 0.7
  p.rightLeg.rotation.x = -0.6 + rise * 0.5
  p.rightKnee.rotation.x = -0.7 + rise * 0.6
  p.spine.rotation.x = 0.3 - rise * 0.22
  p.spine.rotation.z = 0
  p.leftArm.rotation.x = -0.3 - (1 - rise) * 0.3
  p.leftArm.rotation.z = 0.3 - rise * 0.15
  p.leftElbow.rotation.x = -0.5 + rise * 0.3
  p.rightArm.rotation.x = -0.3 - (1 - rise) * 0.3
  p.rightArm.rotation.z = -0.3 + rise * 0.15
  p.rightElbow.rotation.x = -0.5 + rise * 0.3
  p.headGrp.rotation.x = -0.1 + (1 - rise) * 0.15
  p.headGrp.rotation.y = 0
}

/**
 * Sniper platform — standing on elevated platform, aiming rifle.
 */
export function poseSniperPlatform(p: SoldierParts, t: number): void {
  p.hips.position.y = 0.52
  p.leftLeg.rotation.x = 0.15
  p.leftLeg.rotation.z = 0.1
  p.leftKnee.rotation.x = -0.2
  p.rightLeg.rotation.x = -0.2
  p.rightLeg.rotation.z = -0.1
  p.rightKnee.rotation.x = -0.15
  const spineX = 0.18 + Math.sin(t * 1.2) * 0.01
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
  p.rifleGrp.rotation.x = -elbowX - spineX
  p.headGrp.rotation.x = -0.12
  p.headGrp.rotation.y = 0.05 + Math.sin(t * 0.3) * 0.04
  p.headGrp.rotation.z = -0.05
}
