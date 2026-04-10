/**
 * BattlePickerSheet — pick a battle to fight from the ATTACK button.
 *
 * Sprint 4, Phase 1a. Bottom sheet with 3 escalating battle cards.
 * Shows name, wave count, difficulty, compute reward.
 * Completed battles show earned stars.
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { CAMP_BATTLES } from '@config/campBattles'
import type { CampBattleConfig } from '@config/campBattles'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function BattlePickerSheet() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const initBattle = useCampBattleStore((s) => s.initBattle)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)

  const handleSelect = useCallback((config: CampBattleConfig) => {
    sfx.buttonTap()
    initBattle(config)
    setBattlePhase('placing')
  }, [initBattle, setBattlePhase])

  const handleClose = useCallback(() => {
    setBattlePhase('idle')
  }, [setBattlePhase])

  if (battlePhase !== 'picking') return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">SELECT BATTLE</span>
        </div>

        <div className="game-sheet-body">
          {CAMP_BATTLES.map((battle) => {
            const completed = battlesCompleted?.[battle.id]
            const isLocked = battle.requires ? !battlesCompleted?.[battle.requires] : false
            const totalEnemies = battle.waves.reduce(
              (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0), 0,
            )

            return (
              <button
                key={battle.id}
                className={`battle-card ${isLocked ? 'locked' : ''} ${completed ? 'completed' : ''}`}
                onClick={() => !isLocked && handleSelect(battle)}
                disabled={isLocked}
              >
                <div className="battle-card-header">
                  <span className="battle-card-name">{battle.name}</span>
                  {completed && (
                    <span className="battle-card-stars">
                      {'★'.repeat(completed.stars)}{'☆'.repeat(3 - completed.stars)}
                    </span>
                  )}
                </div>
                <div className="battle-card-desc">{battle.description}</div>
                <div className="battle-card-meta">
                  <span className="battle-card-waves">{battle.waves.length} WAVE{battle.waves.length > 1 ? 'S' : ''}</span>
                  <span className="battle-card-enemies">{totalEnemies} ENEMIES</span>
                  <span className="battle-card-reward">+{battle.reward} ⚡</span>
                </div>
                {isLocked && (
                  <div className="battle-card-lock">LOCKED</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
