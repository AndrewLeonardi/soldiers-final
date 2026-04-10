/**
 * TrainingSheet — bottom sheet for committing a soldier to training.
 *
 * Sprint 2, Phase B3. Same pattern as SettingsSheet.
 * Content: soldier roster picker → weapon selector (rifle only) →
 * tier selector (4 buttons) → cost display → START button.
 */
import { useState, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { COMPUTE_TIERS, TRAINING_BASE_COST, TRAINING_BASE_DURATION } from './trainingConstants'
import '@styles/camp-ui.css'

export function TrainingSheet() {
  const trainingSheetOpen = useSceneStore((s) => s.trainingSheetOpen)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const trainingPhase = useCampTrainingStore((s) => s.trainingPhase)
  const commitToTrain = useCampTrainingStore((s) => s.commitToTrain)
  const soldiers = useCampStore((s) => s.soldiers)
  const compute = useCampStore((s) => s.compute)

  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState(1)

  const tierConfig = COMPUTE_TIERS[selectedTier - 1]
  const cost = tierConfig ? TRAINING_BASE_COST * tierConfig.costMultiplier : TRAINING_BASE_COST
  const duration = tierConfig ? TRAINING_BASE_DURATION / tierConfig.multiplier : TRAINING_BASE_DURATION
  const canAfford = compute >= cost
  const selectedSoldier = soldiers.find(s => s.id === selectedSoldierId)
  const canStart = selectedSoldierId !== null && canAfford && (trainingPhase === 'empty' || trainingPhase === 'selecting')

  const handleStart = useCallback(() => {
    if (!selectedSoldierId || !selectedSoldier) return
    const success = commitToTrain(selectedSoldierId, selectedSoldier.name, 'rifle', selectedTier)
    if (success) {
      setTrainingSheetOpen(false)
    }
  }, [selectedSoldierId, selectedSoldier, selectedTier, commitToTrain, setTrainingSheetOpen])

  const handleClose = useCallback(() => {
    setTrainingSheetOpen(false)
  }, [setTrainingSheetOpen])

  if (!trainingSheetOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">TRAIN SOLDIER</span>
        </div>

        <div className="game-sheet-body">
          {/* Soldier roster picker */}
          <div className="training-section-label">SELECT SOLDIER</div>
          <div className="training-roster">
            {soldiers.length === 0 && (
              <div className="training-empty">No soldiers in roster</div>
            )}
            {soldiers.map((s) => (
              <button
                key={s.id}
                className={`training-roster-item ${selectedSoldierId === s.id ? 'selected' : ''} ${s.trained ? 'trained' : ''}`}
                onClick={() => setSelectedSoldierId(s.id)}
              >
                <span className="training-roster-name">{s.name}</span>
                {s.trained && <span className="training-roster-badge">TRAINED</span>}
              </button>
            ))}
          </div>

          {/* Weapon selector — rifle only for now */}
          <div className="training-section-label">WEAPON</div>
          <div className="training-weapon-row">
            <button className="game-btn game-btn-sm training-weapon-btn selected">
              RIFLE
            </button>
            <button className="game-btn game-btn-sm training-weapon-btn locked" disabled>
              ROCKET
            </button>
            <button className="game-btn game-btn-sm training-weapon-btn locked" disabled>
              MG
            </button>
          </div>

          {/* Tier selector */}
          <div className="training-section-label">COMPUTE TIER</div>
          <div className="training-tier-row">
            {COMPUTE_TIERS.map((tier) => (
              <button
                key={tier.tier}
                className={`training-tier-btn ${selectedTier === tier.tier ? 'selected' : ''}`}
                style={{
                  borderColor: selectedTier === tier.tier ? tier.color : 'transparent',
                  color: selectedTier === tier.tier ? tier.color : '#7a8a7a',
                }}
                onClick={() => setSelectedTier(tier.tier)}
              >
                <span className="training-tier-multiplier">{tier.multiplier}x</span>
                <span className="training-tier-label">{tier.label}</span>
              </button>
            ))}
          </div>

          {/* Cost + duration display */}
          <div className="training-cost-row">
            <div className="training-cost-item">
              <span className="training-cost-label">COST</span>
              <span className={`training-cost-value ${!canAfford ? 'insufficient' : ''}`}>
                {cost} COMPUTE
              </span>
            </div>
            <div className="training-cost-item">
              <span className="training-cost-label">TIME</span>
              <span className="training-cost-value">
                {duration >= 1 ? `${duration.toFixed(1)}s` : `${(duration * 1000).toFixed(0)}ms`}
              </span>
            </div>
          </div>

          {/* Start button */}
          <button
            className={`game-btn training-start-btn ${!canStart ? 'disabled' : ''}`}
            onClick={handleStart}
            disabled={!canStart}
          >
            {!selectedSoldierId ? 'SELECT A SOLDIER' :
             !canAfford ? 'NOT ENOUGH COMPUTE' :
             'START TRAINING'}
          </button>
        </div>
      </div>
    </div>
  )
}
