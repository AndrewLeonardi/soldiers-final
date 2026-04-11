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
      {/* Top center — compute counter */}
      <div className="camp-top-bar">
        <ComputeCounter />
      </div>

      {/* Bottom bar — 5 beveled action buttons */}
      <div className="camp-bottom-bar">
        <button className="camp-bottom-btn" onClick={handleTrain}>
          <span className="camp-bottom-btn-icon">⚔</span>
          <span className="camp-bottom-btn-label">TRAIN</span>
        </button>

        <button className="camp-bottom-btn attack" onClick={handleAttack}>
          <span className="camp-bottom-btn-icon">💥</span>
          <span className="camp-bottom-btn-label">ATTACK</span>
        </button>

        <button className="camp-bottom-btn" onClick={handleStore}>
          <span className="camp-bottom-btn-icon">🏪</span>
          <span className="camp-bottom-btn-label">STORE</span>
        </button>

        <button className="camp-bottom-btn" onClick={handleRoster}>
          <span className="camp-bottom-btn-icon">📋</span>
          <span className="camp-bottom-btn-label">ROSTER</span>
        </button>

        <button className="camp-bottom-btn" onClick={handleSettings}>
          <span className="camp-bottom-btn-icon">⚙</span>
          <span className="camp-bottom-btn-label">SETTINGS</span>
        </button>
      </div>
    </>
  )
}
