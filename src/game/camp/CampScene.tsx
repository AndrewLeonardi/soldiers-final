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
import { BattleArena } from './BattleArena'
import { TestGrenade } from './TestGrenade'
import { AmbientSoldiers } from './AmbientSoldiers'
import { TrainingSpectacle } from './TrainingSpectacle'
import { MedicalTentBuilding } from './MedicalTentBuilding'
import { PlacementGroundHandler } from './PlacementOverlay'
import { PlacementMarkers } from './PlacementMarkers'
import { CampBattleLoop } from './CampBattleLoop'
import { BattleEntities } from './BattleEntities'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
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
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const inBattle = battlePhase === 'placing' || battlePhase === 'loading' || battlePhase === 'fighting' || battlePhase === 'result'
  // Show the themed battle arena during placing/loading/fighting/result
  const showArena = battlePhase === 'placing' || battlePhase === 'loading' || battlePhase === 'fighting' || battlePhase === 'result'

  return (
    <>
      {/* Global lighting — every later sprint imports CampLighting */}
      <CampLighting />

      {/* Ground: camp table during idle, themed arena during battle */}
      {showArena && battleConfig ? (
        <BattleArena
          themeId={battleConfig.themeId ?? 'garden'}
          level={battleConfig.level ?? 1}
        />
      ) : (
        <>
          {/* Ground plane + table edge trim */}
          <CampGround />

          {/* Hardcoded base layout: walls, towers, wire, camp footprint */}
          <CampLayout wallBlocksRef={wallBlocksRef} />

          {/* Medical tent building (Sprint 6) */}
          <MedicalTentBuilding />
        </>
      )}

      {/* Orbit camera — constrained angle range, no underground */}
      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        minDistance={8}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 8}
      />

      {/* Hide ambient soldiers during battle — replaced by placed battle units */}
      {!inBattle && <AmbientSoldiers />}

      {/* Hide training during battle */}
      {!inBattle && <TrainingSpectacle />}

      {/* Training tick driver — runs GA each frame */}
      <TrainingTickDriver />

      {/* Placement phase: ground click handler + placed soldier markers */}
      <PlacementGroundHandler />
      <PlacementMarkers />

      {/* Battle loop + entities (fighting phase) */}
      <CampBattleLoop wallBlocksRef={wallBlocksRef} />
      <BattleEntities />

      {/* Dev-only: press G to test destructibility */}
      <TestGrenade wallBlocksRef={wallBlocksRef} />
    </>
  )
}
