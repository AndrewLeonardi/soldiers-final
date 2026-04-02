// ============================================================
// PoseBlender — Smooth transitions between soldier poses
// ============================================================

import { easeInOutQuad } from './easing'

const JOINT_NAMES = [
  'hips', 'spine', 'headGrp',
  'leftLeg', 'leftKnee', 'rightLeg', 'rightKnee',
  'leftArm', 'leftElbow', 'rightArm', 'rightElbow',
  'rifleGrp',
] as const

type JointName = typeof JOINT_NAMES[number]

interface JointRotation {
  rx: number
  ry: number
  rz: number
}

export type PoseSnapshot = Partial<Record<JointName, JointRotation>>

/** A parts object must have groups/objects with a rotation property for each joint */
export interface PoseableParts {
  [key: string]: { rotation: { x: number; y: number; z: number } } | undefined
}

/** Read current rotations from all joints into a flat snapshot */
export function capturePose(parts: PoseableParts): PoseSnapshot {
  const snap: PoseSnapshot = {}
  for (const name of JOINT_NAMES) {
    const joint = parts[name]
    if (!joint) continue
    snap[name] = {
      rx: joint.rotation.x,
      ry: joint.rotation.y,
      rz: joint.rotation.z,
    }
  }
  return snap
}

/** Write a snapshot back to the actual Three.js joints */
export function applyPose(parts: PoseableParts, pose: PoseSnapshot): void {
  for (const name of JOINT_NAMES) {
    const jp = pose[name]
    if (!jp) continue
    const joint = parts[name]
    if (!joint) continue
    joint.rotation.x = jp.rx
    joint.rotation.y = jp.ry
    joint.rotation.z = jp.rz
  }
}

/** Lerp between two snapshots */
export function blendPoses(from: PoseSnapshot, to: PoseSnapshot, t: number): PoseSnapshot {
  const result: PoseSnapshot = {}
  for (const name of JOINT_NAMES) {
    const a = from[name]
    const b = to[name]
    if (!a || !b) {
      result[name] = b ?? a ?? { rx: 0, ry: 0, rz: 0 }
      continue
    }
    result[name] = {
      rx: a.rx + (b.rx - a.rx) * t,
      ry: a.ry + (b.ry - a.ry) * t,
      rz: a.rz + (b.rz - a.rz) * t,
    }
  }
  return result
}

export class PoseBlender {
  fromPose: PoseSnapshot | null
  blendProgress: number
  blendDuration: number
  currentState: string

  constructor() {
    this.fromPose = null
    this.blendProgress = 1
    this.blendDuration = 0.25
    this.currentState = ''
  }

  notifyStateChange(parts: PoseableParts, newState: string, duration?: number): void {
    if (newState === this.currentState) return
    this.fromPose = capturePose(parts)
    this.blendProgress = 0
    this.blendDuration = duration ?? this._getDefaultDuration(this.currentState, newState)
    this.currentState = newState
  }

  update(parts: PoseableParts, dt: number): void {
    if (this.blendProgress >= 1 || !this.fromPose) return

    this.blendProgress += dt / this.blendDuration
    if (this.blendProgress >= 1) {
      this.blendProgress = 1
      this.fromPose = null
      return
    }

    const targetPose = capturePose(parts)
    const t = easeInOutQuad(this.blendProgress)
    const blended = blendPoses(this.fromPose, targetPose, t)
    applyPose(parts, blended)
  }

  _getDefaultDuration(from: string, to: string): number {
    if (to === 'hit') return 0.08
    if (to === 'death') return 0.15
    if (to === 'fire' || to === 'firing') return 0.12
    if (from === 'idle' && to === 'walk') return 0.25
    if (from === 'walk' && to === 'idle') return 0.3
    if (to === 'aim') return 0.2
    return 0.25
  }

  snapToTarget(): void {
    this.blendProgress = 1
    this.fromPose = null
  }

  get isBlending(): boolean {
    return this.blendProgress < 1
  }
}
