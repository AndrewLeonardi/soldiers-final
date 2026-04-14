/**
 * LoadingScreen — Call of Duty-style deployment screen between placement
 * and fighting.
 *
 * Sprint 8. Full-screen HTML overlay with themed gradient background,
 * mission intel, and loading bar. Auto-transitions to 'fighting' after
 * 2.5 seconds.
 */
import { useEffect, useState } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { getTheme } from '@config/battleThemes'
import '@styles/camp-ui.css'

function hexToCSS(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0')
}

const THEME_ICONS: Record<string, string> = {
  garden: 'G',
  desert: 'D',
  arctic: 'A',
  volcanic: 'V',
  jungle: 'J',
}

export function LoadingScreen() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (battlePhase !== 'loading') return

    const fadeTimer = setTimeout(() => setFading(true), 2200)
    const transitionTimer = setTimeout(() => {
      setBattlePhase('fighting')
    }, 2500)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(transitionTimer)
    }
  }, [battlePhase, setBattlePhase])

  if (battlePhase !== 'loading' || !battleConfig) return null

  const themeId = battleConfig.themeId ?? 'garden'
  const theme = getTheme(themeId)
  const icon = THEME_ICONS[themeId] ?? 'X'

  const totalEnemies = battleConfig.enemySoldiers
    ? battleConfig.enemySoldiers.length
    : (battleConfig.waves ?? []).reduce(
        (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0), 0,
      )

  const bgStyle = {
    background: `linear-gradient(180deg, ${hexToCSS(theme.bgGradient[0])} 0%, ${hexToCSS(theme.bgGradient[1])} 100%)`,
  }

  return (
    <div
      className={`loading-screen ${fading ? 'fading' : ''}`}
      style={bgStyle}
    >
      <div className="loading-screen-content">
        {/* Mission name */}
        <div className="loading-screen-icon">{icon}</div>
        <h1
          className="loading-screen-title"
          style={{ color: hexToCSS(theme.accentColor) }}
        >
          {battleConfig.name}
        </h1>

        {/* Tactical intel */}
        <div className="loading-screen-intel">
          <div className="loading-screen-intel-row">
            <span className="loading-screen-intel-label">HOSTILES</span>
            <span className="loading-screen-intel-value">{totalEnemies}</span>
          </div>
          {(battleConfig.waves?.length ?? 0) > 0 && (
            <div className="loading-screen-intel-row">
              <span className="loading-screen-intel-label">WAVES</span>
              <span className="loading-screen-intel-value">{battleConfig.waves!.length}</span>
            </div>
          )}
          {battleConfig.intelPosition && (
            <div className="loading-screen-intel-row">
              <span className="loading-screen-intel-label">OBJECTIVE</span>
              <span className="loading-screen-intel-value">CAPTURE INTEL</span>
            </div>
          )}
          <div className="loading-screen-intel-row">
            <span className="loading-screen-intel-label">MAX SOLDIERS</span>
            <span className="loading-screen-intel-value">{battleConfig.maxSoldiers}</span>
          </div>
        </div>

        {/* Loading bar */}
        <div className="loading-screen-bar-container">
          <div
            className="loading-screen-bar"
            style={{ '--bar-color': hexToCSS(theme.accentColor) } as React.CSSProperties}
          />
        </div>
        <div className="loading-screen-deploying">DEPLOYING...</div>
      </div>
    </div>
  )
}
