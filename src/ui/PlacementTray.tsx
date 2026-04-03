import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { WEAPON_DISPLAY } from '@config/roster'
import { SoldierIcon, GoldCoinIcon } from './ToyIcons'
import '@styles/game-ui.css'

const SOLDIER_COST = 100

export function PlacementTray() {
  const gold = useGameStore((s) => s.gold)
  const phase = useGameStore((s) => s.phase)
  const startBattle = useGameStore((s) => s.startBattle)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const selectedPlacement = useGameStore((s) => s.selectedPlacement)
  const selectPlacement = useGameStore((s) => s.selectPlacement)
  const placedSoldierIds = useGameStore((s) => s.placedSoldierIds)
  const soldiers = useRosterStore((s) => s.soldiers)

  if (phase !== 'placement') return null

  const hasUnits = playerUnits.length > 0
  const allPlaced = soldiers.every((s) => placedSoldierIds.includes(s.id))

  return (
    <div className="placement-bar">
      {/* Soldier cards */}
      {soldiers.map((sol) => {
        const canAfford = gold >= SOLDIER_COST
        const isPlaced = placedSoldierIds.includes(sol.id)
        const isSelected = selectedPlacement === sol.id
        const wpnName = WEAPON_DISPLAY[sol.equippedWeapon].name

        return (
          <div
            key={sol.id}
            className={`placement-card soldier-card ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''} ${!canAfford && !isPlaced ? 'disabled' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (isPlaced || !canAfford) return
              selectPlacement(isSelected ? null : sol.id)
            }}
          >
            <span className="placement-card-icon">
              <SoldierIcon size={28} color={isSelected ? '#c0e0a0' : isPlaced ? '#666' : '#d0dcc0'} />
            </span>
            <span className="placement-card-name">
              {sol.name.split(' ').pop()}
            </span>
            <span className="placement-card-weapon">{wpnName}</span>
            {isPlaced ? (
              <span className="placement-card-placed">PLACED</span>
            ) : (
              <span className="placement-card-cost">
                <span className="coin" />
                {SOLDIER_COST}
              </span>
            )}
          </div>
        )
      })}

      {/* Fight button */}
      <button
        className="battle-btn"
        disabled={!hasUnits}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (hasUnits) {
            selectPlacement(null)
            startBattle()
          }
        }}
      >
        {allPlaced ? 'FIGHT!' : hasUnits ? 'FIGHT!' : 'PLACE TROOPS'}
      </button>
    </div>
  )
}
