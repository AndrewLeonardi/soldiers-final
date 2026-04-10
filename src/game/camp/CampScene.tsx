/**
 * CampScene — the base camp diorama scene composition.
 *
 * Sprint 1, Subsystem 1-2. Mounts inside a <Physics> provider.
 * Brings together the lighting rig, ground, base layout, orbit camera,
 * and the dev-only test grenade tool.
 *
 * Foundation: lifted from /physics-test's composition.
 * NOT from BaseScene.tsx.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CampLighting } from '@three/lighting/CampLighting'
import { CampGround } from './CampGround'
import { CampLayout } from './CampLayout'
import { TestGrenade } from './TestGrenade'
import { AmbientSoldiers } from './AmbientSoldiers'
import { TrainingSpectacle } from './TrainingSpectacle'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import type { WallBlock } from '@three/models/Defenses'

function TrainingTickDriver() {
  const tick = useCampTrainingStore((s) => s.tick)
  const slots = useCampTrainingStore((s) => s.slots)
  const startCeremonyDone = useCampTrainingStore((s) => s.startCeremonyDone)
  const graduate = useCampTrainingStore((s) => s.graduate)
  const endCeremonyDone = useCampTrainingStore((s) => s.endCeremonyDone)
  const ceremonyTimers = useRef<number[]>([0, 0, 0])

  useFrame((_, delta) => {
    // Always tick the training engine (it iterates all active slots)
    const hasRunning = slots.some(s => s.trainingPhase === 'running')
    if (hasRunning) {
      tick(delta)
    }

    // Auto-advance ceremonies per slot
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (!slot) continue
      const timer = ceremonyTimers.current[i] ?? 0

      if (slot.trainingPhase === 'ceremony-start') {
        ceremonyTimers.current[i] = timer + delta
        if (ceremonyTimers.current[i]! >= 1.5) {
          ceremonyTimers.current[i] = 0
          startCeremonyDone(i)
        }
      } else if (slot.trainingPhase === 'graduated') {
        ceremonyTimers.current[i] = timer + delta
        if (ceremonyTimers.current[i]! >= 0.5) {
          ceremonyTimers.current[i] = 0
          graduate(i)
        }
      } else if (slot.trainingPhase === 'ceremony-end') {
        ceremonyTimers.current[i] = timer + delta
        if (ceremonyTimers.current[i]! >= 2.0) {
          ceremonyTimers.current[i] = 0
          endCeremonyDone(i)
        }
      } else {
        ceremonyTimers.current[i] = 0
      }
    }
  })

  return null
}

export function CampScene() {
  const wallBlocksRef = useRef<Map<string, WallBlock[]>>(new Map())

  return (
    <>
      {/* Global lighting — every later sprint imports CampLighting */}
      <CampLighting />

      {/* Ground plane + table edge trim */}
      <CampGround />

      {/* Hardcoded base layout: walls, towers, wire, camp footprint */}
      <CampLayout wallBlocksRef={wallBlocksRef} />

      {/* Orbit camera — constrained angle range, no underground */}
      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 8}
      />

      {/* 6-10 wandering toy soldiers with selection */}
      <AmbientSoldiers />

      {/* Training spectacle — ghost soldiers + targets */}
      <TrainingSpectacle />

      {/* Training tick driver — runs GA each frame */}
      <TrainingTickDriver />

      {/* Dev-only: press G to test destructibility */}
      <TestGrenade wallBlocksRef={wallBlocksRef} />
    </>
  )
}
