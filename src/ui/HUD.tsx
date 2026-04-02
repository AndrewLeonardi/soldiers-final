import { useGameStore } from '@stores/gameStore'
import '@styles/game-ui.css'

export function HUD() {
  const gold = useGameStore((s) => s.gold)
  const compute = useGameStore((s) => s.compute)
  const phase = useGameStore((s) => s.phase)

  const phaseLabel = phase === 'placement' ? 'DEPLOY' : phase === 'battle' ? 'BATTLE' : 'RESULTS'

  return (
    <div className="hud safe-top safe-left safe-right">
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="hud-resource">
          <div className="hud-resource-icon gold" />
          <span className="hud-resource-value">{gold}</span>
        </div>
        <div className="hud-resource">
          <div className="hud-resource-icon compute" />
          <span className="hud-resource-value">{compute}</span>
        </div>
      </div>

      <div className="hud-phase">{phaseLabel}</div>
    </div>
  )
}
