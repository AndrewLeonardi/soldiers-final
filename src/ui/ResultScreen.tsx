import { useGameStore } from '@stores/gameStore'
import { useTutorialStore } from '@stores/tutorialStore'
import '@styles/game-ui.css'

export function ResultScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const starsEarned = useGameStore((s) => s.starsEarned)
  const round = useGameStore((s) => s.round)
  const resetLevel = useGameStore((s) => s.resetLevel)
  const nextRound = useGameStore((s) => s.nextRound)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const enemyUnits = useGameStore((s) => s.enemyUnits)

  const tutorialActive = useTutorialStore((s) => s.active)

  if (phase !== 'result' || result === null) return null

  // During tutorial, let TutorialOverlay handle the victory screen
  if (tutorialActive && result === 'victory') return null

  const isVictory = result === 'victory'
  const goldReward = isVictory ? 200 + round * 50 : 0
  const survivingPlayers = playerUnits.filter((u) => u.status !== 'dead').length
  const enemiesKilled = enemyUnits.filter((u) => u.status === 'dead').length

  return (
    <div className="result-overlay">
      <div className="result-panel">
        {/* Round label */}
        <div className="result-round">ROUND {round}</div>

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

        {/* Compute tip on defeat */}
        {!isVictory && (
          <div className="result-tip">
            TRAIN YOUR SOLDIERS TO IMPROVE THEIR AIM
          </div>
        )}

        {isVictory ? (
          <button
            className="result-btn victory-btn"
            onPointerDown={(e) => { e.stopPropagation(); nextRound() }}
          >
            NEXT ROUND
          </button>
        ) : (
          <button
            className="result-btn"
            onPointerDown={(e) => { e.stopPropagation(); resetLevel() }}
          >
            TRY AGAIN
          </button>
        )}
      </div>
    </div>
  )
}
