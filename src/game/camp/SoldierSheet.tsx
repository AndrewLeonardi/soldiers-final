/**
 * SoldierSheet — bottom sheet showing a soldier's stats.
 *
 * Sprint 5, Phase 3. Opens when tapping an ambient soldier.
 * Shows name, weapon, training status, fitness, trained brains.
 * "TRAIN NOW" button opens TrainingSheet with this soldier pre-selected.
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'Rifle',
  rocketLauncher: 'Rocket Launcher',
  grenade: 'Grenades',
  machineGun: 'Machine Gun',
  tank: 'Tank',
}

export function SoldierSheet() {
  const soldierSheetId = useSceneStore((s) => s.soldierSheetId)
  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)
  const setPreselectedTrainingSoldierId = useSceneStore((s) => s.setPreselectedTrainingSoldierId)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const soldiers = useCampStore((s) => s.soldiers)

  const soldier = soldierSheetId ? soldiers.find((s) => s.id === soldierSheetId) : null

  const handleClose = useCallback(() => {
    setSoldierSheetId(null)
  }, [setSoldierSheetId])

  const handleTrainNow = useCallback(() => {
    if (!soldierSheetId) return
    sfx.buttonTap()
    setPreselectedTrainingSoldierId(soldierSheetId)
    setSoldierSheetId(null)
    setTrainingSheetOpen(true)
  }, [soldierSheetId, setPreselectedTrainingSoldierId, setSoldierSheetId, setTrainingSheetOpen])

  if (!soldier) return null

  const trainedBrains = soldier.trainedBrains ? Object.keys(soldier.trainedBrains) : []
  const legacyBrains = soldier.legacyBrains ? Object.keys(soldier.legacyBrains) : []
  const hasLegacy = legacyBrains.length > 0 && trainedBrains.length === 0
  const fitnessPercent = soldier.fitnessScore != null ? Math.round(soldier.fitnessScore * 100) : null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="soldier-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="soldier-sheet-name">{soldier.name}</div>
        <div className="soldier-sheet-weapon">{WEAPON_LABELS[soldier.weapon] ?? soldier.weapon}</div>

        {/* Stats */}
        <div className="soldier-sheet-stats">
          <div className="soldier-stat">
            <span className="soldier-stat-label">STATUS</span>
            <span className={`soldier-stat-value ${soldier.trained ? 'trained' : 'untrained'}`}>
              {soldier.trained ? 'TRAINED' : 'UNTRAINED'}
            </span>
          </div>

          {fitnessPercent != null && (
            <div className="soldier-stat">
              <span className="soldier-stat-label">FITNESS</span>
              <span className="soldier-stat-value">{fitnessPercent}%</span>
            </div>
          )}

          {soldier.generationsTrained != null && soldier.generationsTrained > 0 && (
            <div className="soldier-stat">
              <span className="soldier-stat-label">GENERATIONS</span>
              <span className="soldier-stat-value">{soldier.generationsTrained}</span>
            </div>
          )}
        </div>

        {/* Trained brains */}
        {trainedBrains.length > 0 && (
          <div className="soldier-sheet-brains">
            <div className="soldier-stat-label">TRAINED WEAPONS</div>
            <div className="soldier-brains-list">
              {trainedBrains.map((w) => (
                <span key={w} className="soldier-brain-badge">
                  {WEAPON_LABELS[w] ?? w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Re-train badge for soldiers with legacy brains */}
        {hasLegacy && (
          <div className="soldier-retrain-badge">
            RE-TRAIN RECOMMENDED — brain upgraded
          </div>
        )}

        {/* Train Now button */}
        <button className="soldier-sheet-train-btn" onClick={handleTrainNow}>
          {hasLegacy ? 'RE-TRAIN NOW' : 'TRAIN NOW'}
        </button>
      </div>
    </div>
  )
}
