import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import * as sfx from '@audio/sfx'
import { WEAPON_DISPLAY } from '@config/roster'
import { SoldierIcon, GoldCoinIcon } from './ToyIcons'
import '@styles/game-ui.css'

const SOLDIER_COST = 100

const DEFENSE_OPTIONS = [
  { type: 'wall' as const, label: 'WALL', cost: 50, icon: '\u2588\u2588' },
  { type: 'sandbag' as const, label: 'BAGS', cost: 75, icon: '\u25AC\u25AC' },
  { type: 'tower' as const, label: 'TOWER', cost: 200, icon: '\u2AFF' },
]

export function PlacementTray() {
  const gold = useGameStore((s) => s.gold)
  const phase = useGameStore((s) => s.phase)
  const level = useGameStore((s) => s.level)
  const startBattle = useGameStore((s) => s.startBattle)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const selectedPlacement = useGameStore((s) => s.selectedPlacement)
  const selectPlacement = useGameStore((s) => s.selectPlacement)
  const placedSoldierIds = useGameStore((s) => s.placedSoldierIds)
  const soldiers = useRosterStore((s) => s.soldiers)

  if (phase !== 'placement') return null

  const hasUnits = playerUnits.length > 0

  return (
    <div className="placement-bar">
      {/* Level name */}
      <div className="placement-round">{level?.name?.toUpperCase() ?? 'MISSION'}</div>

      {/* Soldier cards */}
      {soldiers.map((sol) => {
        const canAfford = gold >= SOLDIER_COST
        const isPlaced = placedSoldierIds.includes(sol.id)
        const isSelected = selectedPlacement === sol.id
        const wpnName = WEAPON_DISPLAY[sol.equippedWeapon].name
        const isRifle = sol.equippedWeapon === 'rifle'
        const hasBrain = sol.trainedBrains?.[sol.equippedWeapon]
        const isTrained = isRifle || (hasBrain && hasBrain.length > 0)

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
            <span className="placement-card-name">{sol.name.split(' ').pop()}</span>
            <span className="placement-card-weapon">{wpnName}</span>
            {isPlaced ? (
              <span className="placement-card-placed">PLACED</span>
            ) : !isTrained ? (
              <span className="placement-card-untrained">UNTRAINED</span>
            ) : (
              <span className="placement-card-cost"><span className="coin" />{SOLDIER_COST}</span>
            )}
          </div>
        )
      })}

      {/* Divider */}
      <div className="placement-divider" />

      {/* Defense cards */}
      {DEFENSE_OPTIONS.map((def) => {
        const canAfford = gold >= def.cost
        const isSelected = selectedPlacement === def.type
        return (
          <div
            key={def.type}
            className={`placement-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (!canAfford) return
              selectPlacement(isSelected ? null : def.type)
            }}
          >
            <span className="placement-card-icon defense-icon">{def.icon}</span>
            <span className="placement-card-name">{def.label}</span>
            <span className="placement-card-cost"><span className="coin" />{def.cost}</span>
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
            sfx.deployHorn()
            startBattle()
          }
        }}
      >
        {hasUnits ? 'FIGHT!' : 'PLACE TROOPS'}
      </button>
    </div>
  )
}
