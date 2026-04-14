import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import * as sfx from '@audio/sfx'
import { WEAPON_DISPLAY } from '@config/roster'
import { DEFENSE_OPTIONS } from '@config/defenses'
import { SoldierIcon } from './ToyIcons'
import '@styles/game-ui.css'

export function PlacementTray() {
  const tokens = useGameStore((s) => s.tokens)
  const phase = useGameStore((s) => s.phase)
  const level = useGameStore((s) => s.level)
  const startBattle = useGameStore((s) => s.startBattle)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const selectedPlacement = useGameStore((s) => s.selectedPlacement)
  const selectPlacement = useGameStore((s) => s.selectPlacement)
  const rotatePlacement = useGameStore((s) => s.rotatePlacement)
  const placedSoldierIds = useGameStore((s) => s.placedSoldierIds)
  const soldiers = useRosterStore((s) => s.soldiers)

  const isDefenseSelected = selectedPlacement === 'wall' || selectedPlacement === 'sandbag' || selectedPlacement === 'tower'

  if (phase !== 'placement') return null

  const hasUnits = playerUnits.length > 0

  return (
    <div className="placement-bar">
      {/* Level name */}
      <div className="placement-round">{level?.name?.toUpperCase() ?? 'MISSION'}</div>

      {/* Soldier cards */}
      {soldiers.map((sol) => {
        const isPlaced = placedSoldierIds.includes(sol.id)
        const isSelected = selectedPlacement === sol.id
        const wpnName = WEAPON_DISPLAY[sol.equippedWeapon].name
        const isRifle = sol.equippedWeapon === 'rifle'
        const hasBrain = sol.trainedBrains?.[sol.equippedWeapon]
        const isTrained = isRifle || (hasBrain && hasBrain.length > 0)

        return (
          <div
            key={sol.id}
            className={`placement-card soldier-card ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (isPlaced) return
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
            ) : null}
          </div>
        )
      })}

      {/* Divider */}
      <div className="placement-divider" />

      {/* Defense cards */}
      {DEFENSE_OPTIONS.map((def) => {
        const canAfford = tokens >= def.cost
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

      {/* Rotate button (visible when defense is selected) */}
      {isDefenseSelected && (
        <button
          className="rotate-btn"
          onPointerDown={(e) => {
            e.stopPropagation()
            rotatePlacement()
            sfx.buttonTap()
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
      )}

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
