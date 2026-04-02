import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { PLACEMENT_COSTS } from '@config/units'
import '@styles/game-ui.css'

interface UnitOption {
  id: string
  name: string
  cost: number
  icon: string
}

const UNIT_OPTIONS: UnitOption[] = [
  { id: 'rifle_soldier', name: 'RIFLE', cost: PLACEMENT_COSTS.rifle_soldier, icon: 'R' },
  { id: 'rocket_soldier', name: 'ROCKET', cost: PLACEMENT_COSTS.rocket_soldier, icon: 'K' },
  { id: 'sandbag', name: 'SANDBAG', cost: PLACEMENT_COSTS.sandbag, icon: 'S' },
  { id: 'wall', name: 'WALL', cost: PLACEMENT_COSTS.wall, icon: 'W' },
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
                <svg viewBox="0 0 24 24" style={{ color: isSelected ? '#4ADE80' : '#ddeedd' }}>
                  {unit.id.includes('soldier') ? (
                    // Soldier silhouette
                    <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM9 10a3 3 0 00-3 3v1h2l1 8h6l1-8h2v-1a3 3 0 00-3-3H9z" />
                  ) : unit.id === 'sandbag' ? (
                    // Sandbag
                    <path d="M4 16h16v3H4v-3zm2-5h12v4H6v-4zm3-5h6v4H9V6z" />
                  ) : (
                    // Wall
                    <path d="M3 8h7v4H3V8zm11 0h7v4h-7V8zM3 14h5v4H3v-4zm7 0h4v4h-4v-4zm6 0h5v4h-5v-4z" />
                  )}
                </svg>
              </div>
              <span className="unit-card-name">{unit.name}</span>
              <span className="unit-card-cost">
                <span className="unit-card-cost-dot" />
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
