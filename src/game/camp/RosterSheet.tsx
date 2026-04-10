/**
 * RosterSheet — soldier roster bottom sheet.
 *
 * Sprint 3, Phase 5a. Shows all soldiers with their stats,
 * weapon badges, and neural net thumbnails. Tap row to expand
 * accordion with full details. "TRAIN" shortcut pre-selects
 * soldier and opens training sheet.
 */
import { useState, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { NeuralNetThumbnail } from './NeuralNetThumbnail'
import { WeaponIcon } from './WeaponIcon'
import { getWeaponShape } from '@game/training/weaponShapes'
import { WEAPON_DISPLAY } from '@config/roster'
import type { WeaponType } from '@config/types'
import type { SoldierRecord } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

/** Convert fitness 0-1 to star rating 1-5 */
function fitnessToStars(fitness: number): number {
  if (fitness >= 0.9) return 5
  if (fitness >= 0.75) return 4
  if (fitness >= 0.55) return 3
  if (fitness >= 0.3) return 2
  return 1
}

function SoldierRow({ soldier, expanded, onToggle, onTrain }: {
  soldier: SoldierRecord
  expanded: boolean
  onToggle: () => void
  onTrain: () => void
}) {
  const trainedWeapons = soldier.trainedBrains ? Object.keys(soldier.trainedBrains) as WeaponType[] : []
  const stars = soldier.fitnessScore != null ? fitnessToStars(soldier.fitnessScore) : 0

  return (
    <div className={`roster-row ${expanded ? 'expanded' : ''}`}>
      {/* Summary row — always visible */}
      <button className="roster-row-summary" onClick={onToggle}>
        <span className="roster-row-name">{soldier.name}</span>
        <span className="roster-row-meta">
          {stars > 0 && (
            <span className="roster-row-stars">
              {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
            </span>
          )}
          {trainedWeapons.length > 0 && (
            <span className="roster-row-weapons">
              {trainedWeapons.map(w => (
                <span key={w} className="roster-weapon-badge">
                  <WeaponIcon weapon={w} size={12} color="#c0d0b0" />
                </span>
              ))}
            </span>
          )}
          {!soldier.trained && (
            <span className="roster-untrained-badge">UNTRAINED</span>
          )}
        </span>
        <span className="roster-row-chevron">{expanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded detail — accordion */}
      {expanded && (
        <div className="roster-row-detail">
          <div className="roster-detail-stats">
            <div className="roster-stat">
              <span className="roster-stat-label">WEAPON</span>
              <span className="roster-stat-value">{soldier.weapon.toUpperCase()}</span>
            </div>
            {soldier.fitnessScore != null && (
              <div className="roster-stat">
                <span className="roster-stat-label">FITNESS</span>
                <span className="roster-stat-value">{(soldier.fitnessScore * 100).toFixed(0)}%</span>
              </div>
            )}
            {soldier.generationsTrained != null && (
              <div className="roster-stat">
                <span className="roster-stat-label">GENS</span>
                <span className="roster-stat-value">{soldier.generationsTrained}</span>
              </div>
            )}
          </div>

          {/* Trained weapon brains */}
          {trainedWeapons.length > 0 && (
            <div className="roster-brains">
              <div className="roster-brains-label">TRAINED BRAINS</div>
              {trainedWeapons.map(w => {
                const weights = soldier.trainedBrains![w]!
                const shape = getWeaponShape(w)
                const display = WEAPON_DISPLAY[w]
                return (
                  <div key={w} className="roster-brain-row">
                    <div className="roster-brain-info">
                      <WeaponIcon weapon={w} size={14} />
                      <span className="roster-brain-name">{display?.name ?? w}</span>
                      <span className="roster-brain-shape">[{shape.input},{shape.hidden},{shape.output}]</span>
                    </div>
                    <NeuralNetThumbnail
                      weights={weights}
                      shape={shape}
                      width={100}
                      height={60}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Train shortcut */}
          <button className="game-btn game-btn-sm roster-train-btn" onClick={onTrain}>
            TRAIN
          </button>
        </div>
      )}
    </div>
  )
}

export function RosterSheet() {
  const isOpen = useSceneStore((s) => s.rosterSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const soldiers = useCampStore((s) => s.soldiers)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setRosterSheetOpen(false)
  }, [setRosterSheetOpen])

  const handleToggle = useCallback((id: string) => {
    sfx.buttonTap()
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const handleTrain = useCallback((soldierId: string) => {
    sfx.buttonTap()
    setRosterSheetOpen(false)
    // Brief delay so the close animation plays before the training sheet opens
    setTimeout(() => setTrainingSheetOpen(true), 200)
  }, [setRosterSheetOpen, setTrainingSheetOpen])

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet roster-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">ROSTER</span>
          <span className="roster-count">{soldiers.length} SOLDIERS</span>
        </div>

        <div className="game-sheet-body">
          {soldiers.length === 0 ? (
            <div className="store-empty">No soldiers recruited yet</div>
          ) : (
            <div className="roster-list">
              {soldiers.map(s => (
                <SoldierRow
                  key={s.id}
                  soldier={s}
                  expanded={expandedId === s.id}
                  onToggle={() => handleToggle(s.id)}
                  onTrain={() => handleTrain(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
