/**
 * LoadingScreen — cinematic mission briefing between placement and fighting.
 *
 * Sprint B (UI redesign). Military dossier theme with TOP SECRET stamp,
 * tactical intel, countdown, and dramatic transition.
 */
import { useEffect, useState } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import '@styles/camp-ui.css'

export function LoadingScreen() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const [fading, setFading] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (battlePhase !== 'loading') return
    setCountdown(3)
    setFading(false)

    const t1 = setTimeout(() => setCountdown(2), 800)
    const t2 = setTimeout(() => setCountdown(1), 1600)
    const t3 = setTimeout(() => setCountdown(0), 2200)
    const fadeTimer = setTimeout(() => setFading(true), 2400)
    const transitionTimer = setTimeout(() => setBattlePhase('fighting'), 2700)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(fadeTimer); clearTimeout(transitionTimer) }
  }, [battlePhase, setBattlePhase])

  if (battlePhase !== 'loading' || !battleConfig) return null

  const totalEnemies = battleConfig.enemySoldiers
    ? battleConfig.enemySoldiers.length
    : (battleConfig.waves ?? []).reduce(
        (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0), 0,
      )

  return (
    <div className={`loading-screen loading-screen-dossier ${fading ? 'fading' : ''}`}>
      <div className="loading-screen-content">
        {/* TOP SECRET stamp */}
        <div className="loading-stamp">TOP SECRET</div>

        {/* Mission name */}
        <h1 className="loading-screen-title loading-title-military">
          {battleConfig.name}
        </h1>

        {/* Tactical intel card */}
        <div className="loading-intel-card">
          <div className="loading-intel-header">MISSION BRIEFING</div>
          <div className="loading-screen-intel-row">
            <span className="loading-screen-intel-label">HOSTILES</span>
            <span className="loading-screen-intel-value loading-value-red">{totalEnemies}</span>
          </div>
          {battleConfig.intelPosition && (
            <div className="loading-screen-intel-row">
              <span className="loading-screen-intel-label">OBJECTIVE</span>
              <span className="loading-screen-intel-value loading-value-gold">CAPTURE INTEL</span>
            </div>
          )}
          <div className="loading-screen-intel-row">
            <span className="loading-screen-intel-label">MAX SQUAD</span>
            <span className="loading-screen-intel-value">{battleConfig.maxSoldiers}</span>
          </div>
          {battleConfig.weaponReward && (
            <div className="loading-screen-intel-row">
              <span className="loading-screen-intel-label">REWARD</span>
              <span className="loading-screen-intel-value loading-value-purple">WEAPON UNLOCK</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="loading-screen-bar-container">
          <div className="loading-screen-bar loading-bar-military" />
        </div>

        {/* Countdown */}
        <div className="loading-countdown">
          {countdown > 0 ? countdown : 'ENGAGE'}
        </div>
      </div>
    </div>
  )
}
