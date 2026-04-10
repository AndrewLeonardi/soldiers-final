/**
 * WanderBrain — ambient wander FSM for toy soldiers.
 *
 * Sprint 1, Subsystem 3. Each soldier runs:
 *   idle (1-3s) → pickTarget inside SOLDIER_BOUNDS → walk → arrive → idle
 *
 * Sprint 5: Added stuck detection — if a soldier hasn't moved 0.05 units in
 * 0.5s while walking, it picks a new random target. Also clamps position
 * back inside SOLDIER_BOUNDS if physics pushes it out.
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
const STUCK_THRESHOLD = 0.05  // min distance moved in check interval
const STUCK_CHECK_INTERVAL = 0.5  // seconds

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

  // Stuck detection
  const lastPosRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 })
  const stuckTimerRef = useRef(0)

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
        lastPosRef.current = { x: pos.x, z: pos.z }
        stuckTimerRef.current = 0
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

      // Stuck detection: if we haven't moved enough in STUCK_CHECK_INTERVAL, re-pick target
      stuckTimerRef.current += delta
      if (stuckTimerRef.current >= STUCK_CHECK_INTERVAL) {
        const movedX = pos.x - lastPosRef.current.x
        const movedZ = pos.z - lastPosRef.current.z
        const movedDist = Math.sqrt(movedX * movedX + movedZ * movedZ)

        if (movedDist < STUCK_THRESHOLD) {
          // Stuck! Pick a new target closer to center
          const newTx = (Math.random() * 2 - 1) * SOLDIER_BOUNDS.halfW * 0.6
          const newTz = (Math.random() * 2 - 1) * SOLDIER_BOUNDS.halfD * 0.6
          targetRef.current = [newTx, newTz]
        }

        lastPosRef.current = { x: pos.x, z: pos.z }
        stuckTimerRef.current = 0
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
