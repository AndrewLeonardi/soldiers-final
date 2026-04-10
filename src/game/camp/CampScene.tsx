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
  const trainingPhase = useCampTrainingStore((s) => s.trainingPhase)
  const startCeremonyDone = useCampTrainingStore((s) => s.startCeremonyDone)
  const graduate = useCampTrainingStore((s) => s.graduate)
  const endCeremonyDone = useCampTrainingStore((s) => s.endCeremonyDone)
  const ceremonyTimer = useRef(0)

  useFrame((_, delta) => {
    if (trainingPhase === 'running') {
      tick(delta)
    }

    // Auto-advance ceremonies after brief delay
    if (trainingPhase === 'ceremony-start') {
      ceremonyTimer.current += delta
      if (ceremonyTimer.current >= 1.5) {
        ceremonyTimer.current = 0
        startCeremonyDone()
      }
    }

    if (trainingPhase === 'graduated') {
      ceremonyTimer.current += delta
      if (ceremonyTimer.current >= 0.5) {
        ceremonyTimer.current = 0
        graduate()
      }
    }

    if (trainingPhase === 'ceremony-end') {
      ceremonyTimer.current += delta
      if (ceremonyTimer.current >= 2.0) {
        ceremonyTimer.current = 0
        endCeremonyDone()
      }
    }

    // Reset timer when not in a ceremony
    if (trainingPhase === 'empty' || trainingPhase === 'selecting' || trainingPhase === 'running') {
      ceremonyTimer.current = 0
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
