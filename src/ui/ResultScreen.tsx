import { useGameStore } from '@stores/gameStore'
import { useTutorialStore } from '@stores/tutorialStore'
import { getNextLevelId } from '@config/levels'
import '@styles/game-ui.css'

export function ResultScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const starsEarned = useGameStore((s) => s.starsEarned)
  const level = useGameStore((s) => s.level)
  const resetLevel = useGameStore((s) => s.resetLevel)
  const nextLevel = useGameStore((s) => s.nextLevel)
  const goToLevelSelect = useGameStore((s) => s.goToLevelSelect)
  const campaignProgress = useGameStore((s) => s.campaignProgress)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const enemyUnits = useGameStore((s) => s.enemyUnits)

  const tutorialActive = useTutorialStore((s) => s.active)

  if (phase !== 'result' || result === null) return null

  // During tutorial, let TutorialOverlay handle the victory screen
  if (tutorialActive && result === 'victory') return null

  const isVictory = result === 'victory'
  const survivingPlayers = playerUnits.filter((u) => u.status !== 'dead').length
  const enemiesKilled = enemyUnits.filter((u) => u.status === 'dead').length
  const hasNextLevel = level ? !!getNextLevelId(level.id) : false

  // Star criteria descriptions from level config
  const starDescs = level ? [
    level.stars.one.desc || 'Survive',
    level.stars.two.desc || 'Complete objective',
    level.stars.three.desc || 'Perfect run',
  ] : ['Survive', 'Complete objective', 'Perfect run']

  return (
    <div className="result-overlay">
      <div className="result-panel">
        {/* Level name */}
        <div className="result-round">{level?.name?.toUpperCase() ?? 'MISSION'}</div>

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
        </div>

        {/* Star criteria breakdown */}
        {isVictory && (
          <div className="result-star-criteria">
            {starDescs.map((desc, i) => (
              <div key={i} className={`result-criterion ${i + 1 <= starsEarned ? 'earned' : ''}`}>
                <span className="criterion-star">
                  {i + 1 <= starsEarned ? '\u2605' : '\u2606'}
                </span>
                <span className="criterion-desc">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Compute tip on defeat */}
        {!isVictory && (
          <div className="result-tip">
            TRAIN YOUR SOLDIERS TO IMPROVE THEIR AIM
          </div>
        )}

        {/* Action buttons */}
        <div className="result-buttons">
          {isVictory ? (
            <>
              <button
                className="result-btn victory-btn"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (hasNextLevel) nextLevel()
                  else goToLevelSelect()
                }}
              >
                {hasNextLevel ? 'NEXT LEVEL' : 'CAMPAIGN COMPLETE'}
              </button>
              <button
                className="result-btn secondary-btn"
                onPointerDown={(e) => { e.stopPropagation(); goToLevelSelect() }}
              >
                LEVEL SELECT
              </button>
            </>
          ) : (
            <>
              <button
                className="result-btn"
                onPointerDown={(e) => { e.stopPropagation(); resetLevel() }}
              >
                TRY AGAIN
              </button>
              <button
                className="result-btn secondary-btn"
                onPointerDown={(e) => { e.stopPropagation(); goToLevelSelect() }}
              >
                LEVEL SELECT
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
