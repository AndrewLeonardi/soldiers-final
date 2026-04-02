import { useGameStore } from '@stores/gameStore'
import { PLACEMENT_COSTS } from '@config/units'
import { SoldierIcon, RocketLauncherIcon, SandbagIcon, WallIcon, GoldCoinIcon } from './ToyIcons'
import '@styles/game-ui.css'

interface UnitOption {
  id: string
  name: string
  cost: number
  Icon: React.FC<{ size?: number; color?: string }>
}

const UNIT_OPTIONS: UnitOption[] = [
  { id: 'rifle_soldier', name: 'RIFLE', cost: PLACEMENT_COSTS.rifle_soldier, Icon: SoldierIcon },
  { id: 'rocket_soldier', name: 'ROCKET', cost: PLACEMENT_COSTS.rocket_soldier, Icon: RocketLauncherIcon },
  { id: 'sandbag', name: 'SANDBAG', cost: PLACEMENT_COSTS.sandbag, Icon: SandbagIcon },
  { id: 'wall', name: 'WALL', cost: PLACEMENT_COSTS.wall, Icon: WallIcon },
]

interface PlacementTrayProps {
  onSelect: (unitId: string | null) => void
  selectedUnit: string | null
}

export function PlacementTray({ onSelect, selectedUnit }: PlacementTrayProps) {
  const gold = useGameStore((s) => s.gold)
  const phase = useGameStore((s) => s.phase)
  const startBattle = useGameStore((s) => s.startBattle)
  const playerUnits = useGameStore((s) => s.playerUnits)

  if (phase !== 'placement') return null

  const hasUnits = playerUnits.length > 0

  return (
    <>
      <div className="placement-tray-bg" />
      <div className={`placement-tray ${phase === 'placement' ? 'visible' : 'hidden'}`}>
        {UNIT_OPTIONS.map((unit) => {
          const canAfford = gold >= unit.cost
          const isSelected = selectedUnit === unit.id
          const iconColor = isSelected ? '#4ADE80' : '#ddeedd'

          return (
            <div
              key={unit.id}
              className={`unit-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
              onPointerDown={() => {
                if (!canAfford) return
                onSelect(isSelected ? null : unit.id)
              }}
            >
              <div className="unit-card-icon">
                <unit.Icon size={28} color={iconColor} />
              </div>
              <span className="unit-card-name">{unit.name}</span>
              <span className="unit-card-cost">
                <GoldCoinIcon size={12} />
                {unit.cost}
              </span>
            </div>
          )
        })}

        <button
          className="go-button"
          disabled={!hasUnits}
          onPointerDown={() => {
            if (hasUnits) {
              onSelect(null)
              startBattle()
            }
          }}
        >
          GO!
        </button>
      </div>
    </>
  )
}
