/**
 * CampHUD — the persistent heads-up display overlay.
 *
 * Sprint 3-4. Replaces the old top-right gear + counter.
 * Layout:
 *   - Top center: compute counter (cyan) + gold counter (gold, placeholder)
 *   - Bottom bar: 5 beveled buttons — TRAIN · ATTACK · STORE · ROSTER · SETTINGS
 *
 * Hidden during fighting/result battle phases.
 */
import { useCallback, useEffect } from 'react'
import { ComputeCounter } from './ComputeCounter'
import { GoldCounter } from './GoldCounter'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function CampHUD() {
  const tickHealing = useCampStore((s) => s.tickHealing)

  // Auto-heal soldiers whose timer has expired (check every 5s)
  useEffect(() => {
    const interval = setInterval(tickHealing, 5000)
    return () => clearInterval(interval)
  }, [tickHealing])

  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)
  const trainingSheetOpen = useSceneStore((s) => s.trainingSheetOpen)
  const storeSheetOpen = useSceneStore((s) => s.storeSheetOpen)
  const rosterSheetOpen = useSceneStore((s) => s.rosterSheetOpen)
  const settingsOpen = useSceneStore((s) => s.settingsOpen)

  const handleTrain = useCallback(() => {
    sfx.buttonTap()
    setTrainingSheetOpen(true)
  }, [setTrainingSheetOpen])

  const handleAttack = useCallback(() => {
    sfx.buttonTap()
    setBattlePhase('picking')
  }, [setBattlePhase])

  const handleStore = useCallback(() => {
    sfx.buttonTap()
    setStoreSheetOpen(true)
  }, [setStoreSheetOpen])

  const handleRoster = useCallback(() => {
    sfx.buttonTap()
    setRosterSheetOpen(true)
  }, [setRosterSheetOpen])

  const handleSettings = useCallback(() => {
    sfx.buttonTap()
    setSettingsOpen(true)
  }, [setSettingsOpen])

  // Hide HUD during active battle phases
  if (battlePhase === 'fighting' || battlePhase === 'result') return null

  return (
    <>
      {/* Top center — dual currency counters */}
      <div className="camp-top-bar">
        <GoldCounter />
        <ComputeCounter />
      </div>

      {/* Bottom bar — 5 beveled action buttons */}
      <div className="camp-bottom-bar">
        <button className={`camp-bottom-btn${trainingSheetOpen ? ' active' : ''}`} onClick={handleTrain}>
          <span className="camp-bottom-btn-icon">⚔</span>
          <span className="camp-bottom-btn-label">TRAIN</span>
        </button>

        <button className={`camp-bottom-btn attack${battlePhase === 'picking' ? ' active' : ''}`} onClick={handleAttack}>
          <span className="camp-bottom-btn-icon">💥</span>
          <span className="camp-bottom-btn-label">ATTACK</span>
        </button>

        <button className={`camp-bottom-btn${storeSheetOpen ? ' active' : ''}`} onClick={handleStore}>
          <span className="camp-bottom-btn-icon">🏪</span>
          <span className="camp-bottom-btn-label">STORE</span>
        </button>

        <button className={`camp-bottom-btn${rosterSheetOpen ? ' active' : ''}`} onClick={handleRoster}>
          <span className="camp-bottom-btn-icon">📋</span>
          <span className="camp-bottom-btn-label">ROSTER</span>
        </button>

        <button className={`camp-bottom-btn${settingsOpen ? ' active' : ''}`} onClick={handleSettings}>
          <span className="camp-bottom-btn-icon">⚙</span>
          <span className="camp-bottom-btn-label">SETTINGS</span>
        </button>
      </div>
    </>
  )
}
