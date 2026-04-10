/**
 * WanderBrain — ambient wander FSM for toy soldiers.
 *
 * Sprint 1, Subsystem 3. Each soldier runs:
 *   idle (1-3s) → pickTarget inside SOLDIER_BOUNDS → walk → arrive → idle
 *
 * No combat hooks, no training hooks. Pure ambient.
 * Drives a SoldierBody via setLinvel() each frame — same pattern as
 * PhysicsTest's WalkingController.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { SOLDIER_BOUNDS } from './campConstants'

type WanderState = 'idle' | 'walk'

const WALK_SPEED = 1.2
const ARRIVE_DIST = 0.4
const IDLE_MIN = 1.0
const IDLE_MAX = 3.0

interface WanderBrainProps {
  bodyRef: React.RefObject<RapierRigidBody | null>
  /** Mutable soldier data — we write facingAngle and status */
  soldier: {
    facingAngle: number
    status: string
  }
}

export function WanderBrain({ bodyRef, soldier }: WanderBrainProps) {
  const stateRef = useRef<WanderState>('idle')
  const timerRef = useRef(Math.random() * 2) // stagger initial idle
  const targetRef = useRef<[number, number]>([0, 0])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const body = bodyRef.current
    if (!body) return

    const pos = body.translation()

    if (stateRef.current === 'idle') {
      timerRef.current -= delta
      soldier.status = 'idle'

      // Keep velocity zeroed while idle
      const vel = body.linvel()
      body.setLinvel({ x: 0, y: vel.y, z: 0 }, true)

      if (timerRef.current <= 0) {
        // Pick a random target inside soldier bounds
        const tx = (Math.random() * 2 - 1) * SOLDIER_BOUNDS.halfW
        const tz = (Math.random() * 2 - 1) * SOLDIER_BOUNDS.halfD
        targetRef.current = [tx, tz]
        stateRef.current = 'walk'
      }
    } else {
      // Walk toward target
      const [tx, tz] = targetRef.current
      const dx = tx - pos.x
      const dz = tz - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < ARRIVE_DIST) {
        // Arrived — go idle
        const vel = body.linvel()
        body.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
        stateRef.current = 'idle'
        timerRef.current = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN)
        soldier.status = 'idle'
        return
      }

      // Move toward target
      const vx = (dx / dist) * WALK_SPEED
      const vz = (dz / dist) * WALK_SPEED
      const vel = body.linvel()
      body.setLinvel({ x: vx, y: vel.y, z: vz }, true)

      // Face walking direction
      soldier.facingAngle = Math.atan2(dx, dz)
      soldier.status = 'walking'
    }
  })

  return null
}
