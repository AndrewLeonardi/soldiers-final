/**
 * ResultOverlay — full-screen victory/defeat overlay.
 *
 * Sprint 4, Phase 4b. Shows after battle ends:
 *   - VICTORY (green) or DEFEAT (red) title
 *   - Star display (1-3 gold stars)
 *   - Compute reward on victory
 *   - RETURN TO CAMP / RETRY buttons
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function ResultOverlay() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const result = useCampBattleStore((s) => s.result)
  const starsEarned = useCampBattleStore((s) => s.starsEarned)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const reset = useCampBattleStore((s) => s.reset)
  const initBattle = useCampBattleStore((s) => s.initBattle)

  const handleReturn = useCallback(() => {
    sfx.buttonTap()
    reset()
    setBattlePhase('idle')
  }, [reset, setBattlePhase])

  const handleRetry = useCallback(() => {
    if (!battleConfig) return
    sfx.buttonTap()
    const config = battleConfig
    reset()
    initBattle(config)
    setBattlePhase('placing')
  }, [battleConfig, reset, initBattle, setBattlePhase])

  if (battlePhase !== 'result' || !result) return null

  const isVictory = result === 'victory'
  const reward = isVictory && battleConfig ? battleConfig.reward : 0

  return (
    <div className="result-overlay">
      <div className="result-card">
        <h1 className={`result-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {isVictory && (
          <>
            <div className="result-stars">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`result-star ${i <= starsEarned ? 'earned' : 'empty'}`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {i <= starsEarned ? '\u2605' : '\u2606'}
                </span>
              ))}
            </div>

            <div className="result-reward">+{reward} COMPUTE</div>
          </>
        )}

        {!isVictory && (
          <div className="result-defeat-msg">Your soldiers have fallen. Train harder and try again!</div>
        )}

        <div className="result-buttons">
          <button className="result-btn return" onClick={handleReturn}>
            RETURN TO CAMP
          </button>
          {!isVictory && (
            <button className="result-btn retry" onClick={handleRetry}>
              RETRY
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
