/**
 * BuildTray — bottom-screen brush selection for base edit mode.
 *
 * Four chunky beveled buttons: VAULT, TRAINING, COLLECTOR, WALL. The
 * currently-selected brush is highlighted with a gold border. Tapping
 * the already-selected brush clears it (handled by the store's toggle
 * behavior). Sits in the thumb zone per the UX non-negotiables.
 */
import { useBaseStore } from '@game/stores/baseStore'
import type { BuildingKind } from '@game/buildings/types'

interface BrushDef {
  key: 'vault' | 'trainingGrounds' | 'collector' | 'wall'
  label: string
  // Hex color used for the small swatch on the button.
  swatch: string
}

const BRUSHES: BrushDef[] = [
  { key: 'vault', label: 'Vault', swatch: '#3a4550' },
  { key: 'trainingGrounds', label: 'Training', swatch: '#6b4226' },
  { key: 'collector', label: 'Collector', swatch: '#3a5a6a' },
  { key: 'wall', label: 'Wall', swatch: '#4a6b3a' },
]

export function BuildTray() {
  const brush = useBaseStore((s) => s.brush)
  const selectBuildingBrush = useBaseStore((s) => s.selectBuildingBrush)
  const selectWallBrush = useBaseStore((s) => s.selectWallBrush)

  const handleClick = (key: BrushDef['key']) => {
    if (key === 'wall') {
      selectWallBrush()
    } else {
      selectBuildingBrush(key as BuildingKind)
    }
  }

  const isSelected = (key: BrushDef['key']): boolean => {
    if (brush === null) return false
    if (key === 'wall') return brush.kind === 'wall'
    return brush.kind === 'building' && brush.buildingKind === key
  }

  return (
    <div className="base-build-tray" role="toolbar" aria-label="Build tray">
      {BRUSHES.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={() => handleClick(b.key)}
          className={`base-brush-btn${isSelected(b.key) ? ' base-brush-btn--selected' : ''}`}
          aria-pressed={isSelected(b.key)}
        >
          <span className="base-brush-btn__swatch" style={{ background: b.swatch }} />
          <span className="base-brush-btn__label">{b.label}</span>
        </button>
      ))}
    </div>
  )
}
