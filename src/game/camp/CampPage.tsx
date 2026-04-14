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
import { FiringRangeHUD } from './FiringRangeHUD'
import { TutorialGuide } from './TutorialGuide'
import { DailyRewardPopup } from './DailyRewardPopup'
import { ArmorySheet } from './ArmorySheet'
import { AudioBed } from '@audio/AudioBed'
import { resumeOnInteraction, ensureContext } from '@audio/context'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import '@styles/camp-ui.css'

export default function CampPage() {
  const [booted, setBooted] = useState(false)
  const [dailyPopupDismissed, setDailyPopupDismissed] = useState(false)
  const isObserving = useSceneStore((s) => s.observingSlotIndex) !== null
  const isFiringRange = useSceneStore((s) => s.firingRangeSoldierId) !== null
  const tutorialCompleted = useCampStore((s) => s.tutorialCompleted)
  const tutorialActive = useSceneStore((s) => s.tutorialActive)
  const lastDailyClaimDate = useCampStore((s) => s.lastDailyClaimDate)
  const dailyRewardOpen = useSceneStore((s) => s.dailyRewardOpen)
  const setDailyRewardOpen = useSceneStore((s) => s.setDailyRewardOpen)

  const today = new Date().toISOString().split('T')[0]!
  const autoShowDaily = booted && lastDailyClaimDate !== today && !dailyPopupDismissed && !isObserving && !isFiringRange && tutorialCompleted && !tutorialActive
  const showDailyPopup = autoShowDaily || dailyRewardOpen

  const handleBootDone = useCallback(() => setBooted(true), [])
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setMedicalSheetOpen = useSceneStore((s) => s.setMedicalSheetOpen)

  // Initialize audio context + resume on first interaction
  useEffect(() => {
    ensureContext()
    resumeOnInteraction()
  }, [])

  // Auto-start tutorial for new players after boot
  useEffect(() => {
    if (booted && !tutorialCompleted) {
      useSceneStore.getState().startTutorial()
    }
  }, [booted, tutorialCompleted])

  // Dev shortcuts: S=store, R=soldiers, M=medical
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') setStoreSheetOpen(true)
      if (e.key === 'r' || e.key === 'R') setRosterSheetOpen(true)
      if (e.key === 'm' || e.key === 'M') setMedicalSheetOpen(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setStoreSheetOpen, setRosterSheetOpen, setMedicalSheetOpen])

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

      {/* Daily reward popup — auto-shows after boot or manually from compute counter */}
      {showDailyPopup && <DailyRewardPopup onClose={() => { setDailyPopupDismissed(true); setDailyRewardOpen(false) }} />}

      {/* Observation mode overlays */}
      {isObserving && <ObservationHUD />}
      {isObserving && <CampNeuralNetViz />}

      {/* Firing range overlay */}
      {isFiringRange && <FiringRangeHUD />}

      {/* HUD + sheets — hidden during observation and firing range */}
      {!isObserving && !isFiringRange && <CampHUD />}
      {!isObserving && !isFiringRange && <SettingsSheet />}
      {!isObserving && !isFiringRange && <StoreSheet />}
      {!isObserving && !isFiringRange && <RosterSheet />}
      {!isObserving && !isFiringRange && <MilestoneCallout />}
      {!isObserving && !isFiringRange && <BattlePickerSheet />}
      {!isObserving && !isFiringRange && <PlacementOverlay />}
      {!isObserving && !isFiringRange && <LoadingScreen />}
      {!isObserving && !isFiringRange && <BattleHUD />}
      {!isObserving && !isFiringRange && <ResultOverlay />}
      {!isObserving && !isFiringRange && <SoldierSheet />}
      {!isObserving && !isFiringRange && <MedicalSheet />}
      {!isObserving && !isFiringRange && <RecruitSheet />}
      {!isObserving && !isFiringRange && <ComputeModal />}
      {!isObserving && !isFiringRange && <ArmorySheet />}

      {/* Tutorial overlay */}
      {tutorialActive && <TutorialGuide />}

      {/* Ambient audio bed — always active */}
      <AudioBed />

    </div>
  )
}
