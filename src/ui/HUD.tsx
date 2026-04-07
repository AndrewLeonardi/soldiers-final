import { useGameStore } from '@stores/gameStore'
import { GoldCoinIcon, MicrochipIcon } from './ToyIcons'
import '@styles/game-ui.css'

export function HUD() {
  const gold = useGameStore((s) => s.gold)
  const compute = useGameStore((s) => s.compute)
  const phase = useGameStore((s) => s.phase)

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
        <div className="hud-resource">
          <GoldCoinIcon size={20} />
          <span className="hud-resource-value">{gold}</span>
        </div>
        <div className="hud-resource hud-resource-compute">
          <MicrochipIcon size={18} color="#4ADE80" />
          <span className="hud-resource-value">{compute}</span>
        </div>
      </div>

      {phaseLabel && <div className="hud-phase">{phaseLabel}</div>}
    </div>
  )
}
