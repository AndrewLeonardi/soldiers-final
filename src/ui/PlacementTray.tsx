import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { WEAPON_DISPLAY } from '@config/roster'
import { SoldierIcon, GoldCoinIcon } from './ToyIcons'
import '@styles/game-ui.css'

const SOLDIER_COST = 100

interface PlacementTrayProps {
  onSelect: (soldierId: string | null) => void
  selectedUnit: string | null
  briefingDismissed: boolean
}

export function PlacementTray({ onSelect, selectedUnit, briefingDismissed }: PlacementTrayProps) {
  const gold = useGameStore((s) => s.gold)
  const phase = useGameStore((s) => s.phase)
  const startBattle = useGameStore((s) => s.startBattle)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const soldiers = useRosterStore((s) => s.soldiers)

  if (phase !== 'placement' || !briefingDismissed) return null

  const hasUnits = playerUnits.length > 0

  return (
    <>
      <div className="placement-tray-bg" />
      <div className="placement-tray visible">
       <div className="placement-tray-inner">
        {soldiers.map((sol) => {
          const canAfford = gold >= SOLDIER_COST
          const isSelected = selectedUnit === sol.id
          const iconColor = isSelected ? '#4ADE80' : '#ddeedd'
          const wpnName = WEAPON_DISPLAY[sol.equippedWeapon].name

          return (
            <div
              key={sol.id}
              className={`unit-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
              onPointerDown={() => {
                if (!canAfford) return
                onSelect(isSelected ? null : sol.id)
              }}
            >
              <div className="unit-card-icon">
                <SoldierIcon size={28} color={iconColor} />
              </div>
              <span className="unit-card-name">{sol.name.split(' ').pop()}</span>
              <span className="unit-card-weapon">{wpnName}</span>
              <span className="unit-card-cost">
                <GoldCoinIcon size={12} />
                {SOLDIER_COST}
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
      </div>
    </>
  )
}
