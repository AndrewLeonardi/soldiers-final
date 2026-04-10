/**
 * BattleHUD — top overlay during the 'fighting' phase.
 *
 * Sprint 4, Phase 4a. Shows wave counter, enemies alive, battle timer.
 * Beveled mobile-game style matching the camp UI.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import '@styles/camp-ui.css'

export function BattleHUD() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const battleTime = useCampBattleStore((s) => s.battleTime)
  const enemyUnits = useCampBattleStore((s) => s.enemyUnits)
  const playerUnits = useCampBattleStore((s) => s.playerUnits)
  const wavesSpawned = useCampBattleStore((s) => s.wavesSpawned)

  if (battlePhase !== 'fighting' || !battleConfig) return null

  const totalWaves = battleConfig.waves.length
  const currentWave = wavesSpawned.filter(Boolean).length
  const enemiesAlive = enemyUnits.filter(e => e.status !== 'dead').length
  const playersAlive = playerUnits.filter(p => p.status !== 'dead').length
  const seconds = Math.floor(battleTime)

  return (
    <div className="battle-hud">
      <div className="battle-hud-row">
        <div className="battle-hud-stat">
          <span className="battle-hud-label">WAVE</span>
          <span className="battle-hud-value">{currentWave}/{totalWaves}</span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">ENEMIES</span>
          <span className="battle-hud-value battle-hud-enemies">{enemiesAlive}</span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">ALIVE</span>
          <span className="battle-hud-value battle-hud-allies">{playersAlive}</span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">TIME</span>
          <span className="battle-hud-value">{seconds}s</span>
        </div>
      </div>
    </div>
  )
}
