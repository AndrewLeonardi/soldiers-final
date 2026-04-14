import { useGameStore } from '@stores/gameStore'
import { MicrochipIcon } from './ToyIcons'
import '@styles/game-ui.css'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function HUD() {
  const tokens = useGameStore((s) => s.tokens)
  const phase = useGameStore((s) => s.phase)
  const battleHUD = useGameStore((s) => s.battleHUD)

  if (phase === 'loadout' || phase === 'training' || phase === 'worldSelect') return null

  const phaseLabel = phase === 'placement'
    ? 'DEPLOY'
    : phase === 'battle'
      ? 'BATTLE'
      : phase === 'result'
        ? 'RESULTS'
        : ''

  return (
    <div className="hud safe-top safe-left safe-right">
      <div className="hud-resource-group">
        <div className="hud-resource hud-resource-compute">
          <MicrochipIcon size={18} color="#4ADE80" />
          <span className="hud-resource-value">{tokens}</span>
        </div>
      </div>

      {phaseLabel && <div className="hud-phase">{phaseLabel}</div>}

      {/* Battle info bar — enemy count, wave progress, timer */}
      {phase === 'battle' && (
        <div style={{
          position: 'fixed',
          top: 48,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          padding: '6px 16px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          border: '1px solid rgba(212,170,64,0.2)',
          fontFamily: "'Black Ops One', monospace",
          fontSize: 12,
          color: '#ccc',
          letterSpacing: 1,
          zIndex: 20,
        }}>
          <span style={{ color: '#ff6b6b' }}>
            {'\u2620'} {battleHUD.enemiesAlive}
          </span>
          <span style={{ color: '#888' }}>|</span>
          <span style={{ color: '#8aaa6a' }}>
            WAVE {battleHUD.currentWave}/{battleHUD.totalWaves}
          </span>
          <span style={{ color: '#888' }}>|</span>
          <span style={{ color: '#d4aa40' }}>
            {formatTime(battleHUD.elapsedTime)}
          </span>
        </div>
      )}
    </div>
  )
}
