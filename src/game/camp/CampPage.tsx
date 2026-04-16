/**
 * CampPage — the main entry point for the base camp diorama.
 *
 * Sprint 1-3. This is the route component that wires together:
 *   - Boot screen (Subsystem 4)
 *   - Canvas + Physics + CampScene (Subsystem 1-3)
 *   - CampHUD: bottom bar + token counter (Sprint 3)
 *   - Settings sheet (Subsystem 4)
 *   - Training sheet (Sprint 2)
 *   - Store sheet (Sprint 3)
 *   - Roster sheet (Sprint 3)
 *   - Token modal (Sprint 3)
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
import { TokenModal } from './TokenModal'
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
import { UpgradeNudge } from './UpgradeNudge'
import { AgeGateModal } from './AgeGate'
import { CookieBanner } from './CookieBanner'
import { AudioBed } from '@audio/AudioBed'
import { resumeOnInteraction, ensureContext } from '@audio/context'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { initUser } from '@api/user'
import { hydrateFromServer } from '@api/sync'
import { pollPurchaseStatus } from '@api/purchase'
import { track } from '@analytics/events'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export default function CampPage() {
  const [booted, setBooted] = useState(false)
  // userReady gates the Canvas. Sprint 1: initUser resolves ~instantly from
  // localStorage. Sprint 3: awaits Supabase anonymous auth. The BootScreen
  // masks any latency so the player never sees a loading state.
  const [userReady, setUserReady] = useState(false)
  const [dailyPopupDismissed, setDailyPopupDismissed] = useState(false)
  const isObserving = useSceneStore((s) => s.observingSlotIndex) !== null
  const isFiringRange = useSceneStore((s) => s.firingRangeSoldierId) !== null
  const tutorialCompleted = useCampStore((s) => s.tutorialCompleted)
  const tutorialActive = useSceneStore((s) => s.tutorialActive)
  const canClaimDaily = useCampStore((s) => s.canClaimDaily)
  const dailyRewardOpen = useSceneStore((s) => s.dailyRewardOpen)
  const setDailyRewardOpen = useSceneStore((s) => s.setDailyRewardOpen)

  const autoShowDaily = booted && canClaimDaily() && !dailyPopupDismissed && !isObserving && !isFiringRange && tutorialCompleted && !tutorialActive
  const showDailyPopup = autoShowDaily || dailyRewardOpen

  const handleBootDone = useCallback(() => setBooted(true), [])
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setMedicalSheetOpen = useSceneStore((s) => s.setMedicalSheetOpen)

  // Initialize user identity + hydrate from server (Sprint 3).
  // Runs in parallel with the BootScreen animation so any latency is invisible.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      await initUser()
      // Hydrate server state if authenticated. Collision handling is
      // Subsystem 3.4 — flagged via the return value; we can surface a
      // modal in Sprint 3.6 if it fires in real use.
      try { await hydrateFromServer() } catch { /* never block boot */ }
      if (!cancelled) setUserReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Return-from-Stripe: when URL has ?purchase=success&session_id=..., poll
  // the webhook-finalized row and play the token-arrival ceremony when the
  // credit lands. Also re-hydrates to pull the authoritative new balance.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('purchase')
    const sessionId = params.get('session_id')
    if (!outcome) return

    // Clear the query params immediately so refresh doesn't re-trigger.
    const cleanUrl = window.location.pathname + window.location.hash
    window.history.replaceState({}, '', cleanUrl)

    if (outcome !== 'success' || !sessionId) return

    void (async () => {
      const result = await pollPurchaseStatus(sessionId)
      if (result.status === 'completed') {
        try { await hydrateFromServer() } catch { /* surface via store reload */ }
        sfx.recruitChime()
        track('pack_clicked', {
          packId: result.packId ?? 'unknown',
          price: '',  // server doesn't echo — filled in by the original click
          tokens: result.tokensGranted ?? 0,
        })
      }
    })()
  }, [])

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
      {/* Boot screen — 1s hold + crossfade. Holds until BOTH the timer
          and the user-init have resolved; initUser is instant in Sprint 1
          and briefly awaits Supabase in Sprint 3. */}
      {!(booted && userReady) && <BootScreen onDone={handleBootDone} />}

      {/* 3D Canvas — only mounts once user identity is ready. */}
      {userReady && (
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
      )}

      {/* Daily reward popup — auto-shows after boot or manually from token counter */}
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
      {!isObserving && !isFiringRange && <TokenModal />}
      {!isObserving && !isFiringRange && <ArmorySheet />}
      {!isObserving && !isFiringRange && <UpgradeNudge />}

      {/* Age gate — fires only when a Stripe purchase is about to start */}
      <AgeGateModal />

      {/* Cookie banner — bottom, dismissible, hidden when Supabase unset */}
      <CookieBanner />

      {/* Tutorial overlay */}
      {tutorialActive && <TutorialGuide />}

      {/* Ambient audio bed — always active */}
      <AudioBed />

    </div>
  )
}
