/**
 * TrainingSheet — bottom sheet for committing a soldier to training.
 *
 * Sprint 2→3. Content: slot selector → soldier roster picker →
 * weapon carousel → tier selector → cost display → START button.
 *
 * Sprint 3: multi-slot support, weapon carousel, per-weapon training.
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { WeaponCarousel } from './WeaponCarousel'
import { COMPUTE_TIERS, TRAINING_BASE_COST, TRAINING_BASE_DURATION } from './trainingConstants'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// Slot unlock costs (matches campStore)
const SLOT_COSTS = [0, 200, 500]

export function TrainingSheet() {
  const trainingSheetOpen = useSceneStore((s) => s.trainingSheetOpen)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const slots = useCampTrainingStore((s) => s.slots)
  const commitToTrain = useCampTrainingStore((s) => s.commitToTrain)
  const isSoldierInTraining = useCampTrainingStore((s) => s.isSoldierInTraining)
  const soldiers = useCampStore((s) => s.soldiers)
  const compute = useCampStore((s) => s.compute)
  const unlockedSlots = useCampStore((s) => s.unlockedSlots)
  const unlockSlot = useCampStore((s) => s.unlockSlot)

  const preselectedId = useSceneStore((s) => s.preselectedTrainingSoldierId)
  const clearPreselection = useSceneStore((s) => s.setPreselectedTrainingSoldierId)

  const [activeSlotIndex, setActiveSlotIndex] = useState(0)
  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null)

  // Auto-select soldier when coming from SoldierSheet "TRAIN NOW"
  useEffect(() => {
    if (preselectedId && trainingSheetOpen) {
      setSelectedSoldierId(preselectedId)
      clearPreselection(null)
    }
  }, [preselectedId, trainingSheetOpen, clearPreselection])
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('rifle')
  const [selectedTier, setSelectedTier] = useState(1)

  const activeSlot = slots[activeSlotIndex]
  const slotIsEmpty = !activeSlot || activeSlot.trainingPhase === 'empty' || activeSlot.trainingPhase === 'selecting'

  const tierConfig = COMPUTE_TIERS[selectedTier - 1]
  const cost = tierConfig ? TRAINING_BASE_COST * tierConfig.costMultiplier : TRAINING_BASE_COST
  const duration = tierConfig ? TRAINING_BASE_DURATION / tierConfig.multiplier : TRAINING_BASE_DURATION
  const canAfford = compute >= cost
  const selectedSoldier = soldiers.find(s => s.id === selectedSoldierId)
  const soldierBusy = selectedSoldierId ? isSoldierInTraining(selectedSoldierId) : false
  const canStart = selectedSoldierId !== null && canAfford && slotIsEmpty && !soldierBusy

  // Check if selected soldier has a trained brain for selected weapon
  const hasBrainForWeapon = selectedSoldier?.trainedBrains?.[selectedWeapon] != null

  // Slot labels for display
  const slotLabels = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => {
      const slot = slots[i]
      const isLocked = i >= unlockedSlots
      if (isLocked) return { label: `SLOT ${i + 1}`, sub: `🔒 ${SLOT_COSTS[i]} ⚡`, locked: true, active: false }
      if (!slot || slot.trainingPhase === 'empty') return { label: `SLOT ${i + 1}`, sub: 'EMPTY', locked: false, active: false }
      return { label: `SLOT ${i + 1}`, sub: slot.slotSoldierName ?? 'ACTIVE', locked: false, active: true }
    }),
  [slots, unlockedSlots])

  const handleSlotTap = useCallback((index: number) => {
    if (index >= unlockedSlots) {
      // Try to unlock
      sfx.buttonTap()
      const success = unlockSlot()
      if (success) {
        sfx.deployHorn()
        setActiveSlotIndex(index)
      }
      return
    }
    sfx.buttonTap()
    setActiveSlotIndex(index)
  }, [unlockedSlots, unlockSlot])

  const handleStart = useCallback(() => {
    if (!selectedSoldierId || !selectedSoldier) return
    const success = commitToTrain(activeSlotIndex, selectedSoldierId, selectedSoldier.name, selectedWeapon, selectedTier)
    if (success) {
      sfx.buttonTap()
      setTrainingSheetOpen(false)
    }
  }, [activeSlotIndex, selectedSoldierId, selectedSoldier, selectedWeapon, selectedTier, commitToTrain, setTrainingSheetOpen])

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
          {/* Slot selector */}
          <div className="training-section-label">SELECT SLOT</div>
          <div className="training-slot-row">
            {slotLabels.map((info, i) => (
              <button
                key={i}
                className={`training-slot-btn ${activeSlotIndex === i ? 'selected' : ''} ${info.locked ? 'locked' : ''} ${info.active ? 'active' : ''}`}
                onClick={() => handleSlotTap(i)}
              >
                <span className="training-slot-label">{info.label}</span>
                <span className="training-slot-sub">{info.sub}</span>
              </button>
            ))}
          </div>

          {/* Show active slot info if not empty */}
          {activeSlot && !slotIsEmpty && (
            <div className="training-active-slot-info">
              <span>🔄 {activeSlot.slotSoldierName} — {activeSlot.slotWeapon?.toUpperCase()}</span>
              <span>GEN {activeSlot.generation} | {(activeSlot.bestFitness * 100).toFixed(0)}%</span>
            </div>
          )}

          {/* Only show selection UI if slot is available */}
          {slotIsEmpty && (
            <>
              {/* Soldier roster picker */}
              <div className="training-section-label">SELECT SOLDIER</div>
              <div className="training-roster">
                {soldiers.length === 0 && (
                  <div className="training-empty">No soldiers in roster</div>
                )}
                {soldiers.map((s) => {
                  const inTraining = isSoldierInTraining(s.id)
                  const weaponBrains = s.trainedBrains ? Object.keys(s.trainedBrains) : []
                  return (
                    <button
                      key={s.id}
                      className={`training-roster-item ${selectedSoldierId === s.id ? 'selected' : ''} ${inTraining ? 'busy' : ''}`}
                      onClick={() => !inTraining && setSelectedSoldierId(s.id)}
                      disabled={inTraining}
                    >
                      <span className="training-roster-name">{s.name}</span>
                      <span className="training-roster-badges">
                        {inTraining && <span className="training-roster-badge busy">IN TRAINING</span>}
                        {weaponBrains.length > 0 && !inTraining && (
                          <span className="training-roster-badge">
                            {weaponBrains.length} BRAIN{weaponBrains.length > 1 ? 'S' : ''}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Weapon carousel */}
              <div className="training-section-label">WEAPON</div>
              <WeaponCarousel selected={selectedWeapon} onSelect={setSelectedWeapon} />

              {hasBrainForWeapon && (
                <div className="training-retrain-notice">
                  ⚡ This soldier already has a {selectedWeapon} brain — re-training will improve it
                </div>
              )}

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
                {soldierBusy ? 'SOLDIER IN TRAINING' :
                 !selectedSoldierId ? 'SELECT A SOLDIER' :
                 !canAfford ? 'NOT ENOUGH COMPUTE' :
                 'START TRAINING'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
