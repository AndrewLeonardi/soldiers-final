import { useGameStore } from '@stores/gameStore'
import '@styles/game-ui.css'

export function ResultScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const starsEarned = useGameStore((s) => s.starsEarned)
  const round = useGameStore((s) => s.round)
  const gold = useGameStore((s) => s.gold)
  const resetLevel = useGameStore((s) => s.resetLevel)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const enemyUnits = useGameStore((s) => s.enemyUnits)

  if (phase !== 'result' || result === null) return null

  const isVictory = result === 'victory'
  const goldReward = isVictory ? 200 + round * 50 : 0
  const survivingPlayers = playerUnits.filter((u) => u.status !== 'dead').length
  const enemiesKilled = enemyUnits.filter((u) => u.status === 'dead').length

  return (
    <div className="result-overlay">
      <div className="result-panel">
        <div className={`result-banner ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? 'VICTORY!' : 'DEFEAT!'}
        </div>

        {isVictory && (
          <div className="result-stars">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`result-star ${s <= starsEarned ? 'earned' : ''}`}>
                {s <= starsEarned ? '\u2605' : '\u2606'}
              </span>
            ))}
          </div>
        )}

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat-label">ENEMIES ELIMINATED</span>
            <span className="result-stat-value">{enemiesKilled}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">SOLDIERS SURVIVING</span>
            <span className="result-stat-value">{survivingPlayers}</span>
          </div>
          {isVictory && (
            <div className="result-stat gold-reward">
              <span className="result-stat-label">GOLD EARNED</span>
              <span className="result-stat-value">+{goldReward}</span>
            </div>
          )}
        </div>

        <button
          className="result-btn"
          onPointerDown={() => resetLevel()}
        >
          {isVictory ? 'NEXT BATTLE' : 'TRY AGAIN'}
        </button>
      </div>
    </div>
  )
}
