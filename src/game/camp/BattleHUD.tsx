/**
 * BattleHUD — top overlay during the 'fighting' phase.
 *
 * Sprint 5 (battle rework). Shows enemies alive, squad alive, timer,
 * and Intel distance (closest player soldier to Intel objective).
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

  if (battlePhase !== 'fighting' || !battleConfig) return null

  const enemiesAlive = enemyUnits.filter(e => e.status !== 'dead').length
  const playersAlive = playerUnits.filter(p => p.status !== 'dead').length
  const seconds = Math.floor(battleTime)

  // Intel distance — closest living player soldier to Intel
  const intelPos = battleConfig.intelPosition
  let intelDist = Infinity
  if (intelPos) {
    for (const p of playerUnits) {
      if (p.status === 'dead') continue
      const dx = p.position[0] - intelPos[0]
      const dz = p.position[2] - intelPos[2]
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < intelDist) intelDist = d
    }
  }
  const intelDistDisplay = intelDist === Infinity ? '--' : `${Math.round(intelDist)}m`
  const allEnemiesDead = enemiesAlive === 0 && enemyUnits.length > 0

  return (
    <div className="battle-hud">
      <div className="battle-hud-row">
        <div className="battle-hud-stat">
          <span className="battle-hud-label">ENEMIES</span>
          <span className="battle-hud-value battle-hud-enemies">{enemiesAlive}</span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">SQUAD</span>
          <span className="battle-hud-value battle-hud-allies">{playersAlive}</span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">INTEL</span>
          <span className={`battle-hud-value ${allEnemiesDead ? 'battle-hud-intel-open' : ''}`}>
            {intelDistDisplay}
          </span>
        </div>
        <div className="battle-hud-stat">
          <span className="battle-hud-label">TIME</span>
          <span className="battle-hud-value">{seconds}s</span>
        </div>
      </div>
    </div>
  )
}
