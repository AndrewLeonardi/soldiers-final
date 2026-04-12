/**
 * CampPage — the main entry point for the base camp diorama.
 *
 * Sprint 1-3. This is the route component that wires together:
 *   - Boot screen (Subsystem 4)
 *   - Canvas + Physics + CampScene (Subsystem 1-3)
 *   - CampHUD: bottom bar + compute counter (Sprint 3)
 *   - Settings sheet (Subsystem 4)
 *   - Training sheet (Sprint 2)
 *   - Store sheet (Sprint 3)
 *   - Roster sheet (Sprint 3)
 *   - Compute modal (Sprint 3)
 *   - Milestone callout (Sprint 2)
 *   - Ambient audio bed (Subsystem 5)
 */
import { Suspense, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { CampScene } from './CampScene'
import { BootScreen } from './BootScreen'
import { CampHUD } from './CampHUD'
import { SettingsSheet } from './SettingsSheet'
import { TrainingSheet } from './TrainingSheet'
import { MilestoneCallout } from './MilestoneCallout'
import { StoreSheet } from './StoreSheet'
import { RosterSheet } from './RosterSheet'
import { ComputeModal } from './ComputeModal'
import { BattlePickerSheet } from './BattlePickerSheet'
import { PlacementOverlay } from './PlacementOverlay'
import { BattleHUD } from './BattleHUD'
import { ResultOverlay } from './ResultOverlay'
import { LoadingScreen } from './LoadingScreen'
import { SoldierSheet } from './SoldierSheet'
import { MedicalSheet } from './MedicalSheet'
import { RecruitSheet } from './RecruitSheet'
import { ObservationHUD } from './ObservationHUD'
import { CampNeuralNetViz } from './CampNeuralNetViz'
import { AudioBed } from '@audio/AudioBed'
import { useSceneStore } from '@stores/sceneStore'
import '@styles/camp-ui.css'

export default function CampPage() {
  const [booted, setBooted] = useState(false)
  const isObserving = useSceneStore((s) => s.observingSlotIndex) !== null

  const handleBootDone = useCallback(() => setBooted(true), [])
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setMedicalSheetOpen = useSceneStore((s) => s.setMedicalSheetOpen)

  // Dev shortcuts: T=train, S=store, R=roster, M=medical
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') setTrainingSheetOpen(true)
      if (e.key === 's' || e.key === 'S') setStoreSheetOpen(true)
      if (e.key === 'r' || e.key === 'R') setRosterSheetOpen(true)
      if (e.key === 'm' || e.key === 'M') setMedicalSheetOpen(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTrainingSheetOpen, setStoreSheetOpen, setRosterSheetOpen, setMedicalSheetOpen])

  return (
    <div style={{ width: '100%', height: '100svh', position: 'relative', background: '#111' }}>
      {/* Boot screen — 1s hold + crossfade */}
      {!booted && <BootScreen onDone={handleBootDone} />}

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [18, 14, 18], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <CampScene />
          </Physics>
        </Suspense>
      </Canvas>

      {/* Observation mode overlays */}
      {isObserving && <ObservationHUD />}
      {isObserving && <CampNeuralNetViz />}

      {/* HUD + sheets — hidden during observation */}
      {!isObserving && <CampHUD />}
      {!isObserving && <SettingsSheet />}
      {!isObserving && <TrainingSheet />}
      {!isObserving && <StoreSheet />}
      {!isObserving && <RosterSheet />}
      {!isObserving && <MilestoneCallout />}
      {!isObserving && <BattlePickerSheet />}
      {!isObserving && <PlacementOverlay />}
      {!isObserving && <LoadingScreen />}
      {!isObserving && <BattleHUD />}
      {!isObserving && <ResultOverlay />}
      {!isObserving && <SoldierSheet />}
      {!isObserving && <MedicalSheet />}
      {!isObserving && <RecruitSheet />}
      {!isObserving && <ComputeModal />}

      {/* Ambient audio bed — always active */}
      <AudioBed />

      {/* Dev indicator */}
      {import.meta.env.DEV && !isObserving && (
        <div className="dev-indicator">
          DEV | G=grenade T=train S=store R=roster M=medical
        </div>
      )}
    </div>
  )
}
