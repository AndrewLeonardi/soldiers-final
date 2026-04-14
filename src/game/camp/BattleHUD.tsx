/**
 * BattleHUD — military-style top overlay during the 'fighting' phase.
 *
 * Sprint B (UI redesign). Shows enemies, squad status, Intel distance
 * as progress bar, and battle timer in military clock format.
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
  const totalEnemies = enemyUnits.length
  const playersAlive = playerUnits.filter(p => p.status !== 'dead').length
  const totalPlayers = playerUnits.length
  const seconds = Math.floor(battleTime)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  // Intel distance
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

  const allEnemiesDead = enemiesAlive === 0 && totalEnemies > 0
  // Intel progress: starts at ~20m, reaches 0 at capture
  const maxDist = 20
  const intelProgress = intelDist === Infinity ? 0 : Math.max(0, Math.min(100, ((maxDist - intelDist) / maxDist) * 100))

  return (
    <div className="battle-hud battle-hud-military">
      <div className="battle-hud-row">
        {/* Enemy count */}
        <div className="battle-hud-stat">
          <span className="battle-hud-label">HOSTILES</span>
          <span className="battle-hud-value battle-hud-enemies">
            {enemiesAlive}<span className="battle-hud-total">/{totalEnemies}</span>
          </span>
        </div>

        {/* Squad status */}
        <div className="battle-hud-stat">
          <span className="battle-hud-label">SQUAD</span>
          <div className="battle-hud-dots">
            {playerUnits.map((p, i) => (
              <span
                key={i}
                className={`battle-hud-dot ${p.status === 'dead' ? 'dead' : 'alive'}`}
              />
            ))}
          </div>
        </div>

        {/* Intel progress */}
        {intelPos && (
          <div className="battle-hud-stat battle-hud-intel-stat">
            <span className="battle-hud-label">INTEL</span>
            <div className="battle-hud-intel-bar-container">
              <div
                className={`battle-hud-intel-bar ${allEnemiesDead ? 'capturable' : ''}`}
                style={{ width: `${intelProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Timer */}
        <div className="battle-hud-stat">
          <span className="battle-hud-label">TIME</span>
          <span className="battle-hud-value battle-hud-timer">{timeDisplay}</span>
        </div>
      </div>
    </div>
  )
}
