/**
 * TrainingSheet — bottom sheet for committing a soldier to training.
 *
 * Sprint 4 polish: soldier-first flow, auto-assigned slots, no emojis.
 * Flow: soldier chips → weapon carousel → time package → sim speed → START.
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { WeaponCarousel } from './WeaponCarousel'
import { TIME_PACKAGES, SIM_SPEED_OPTIONS } from './trainingConstants'
import type { WeaponType } from '@config/types'
import { TokenIcon } from './TokenIcon'
import { LockIcon } from './icons/LockIcon'
import { RefreshIcon } from './icons/RefreshIcon'
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
  const tokens = useCampStore((s) => s.tokens)
  const unlockedSlots = useCampStore((s) => s.unlockedSlots)
  const unlockSlot = useCampStore((s) => s.unlockSlot)

  const preselectedId = useSceneStore((s) => s.preselectedTrainingSoldierId)
  const clearPreselection = useSceneStore((s) => s.setPreselectedTrainingSoldierId)

  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null)

  // Auto-select soldier when coming from SoldierSheet "TRAIN NOW"
  useEffect(() => {
    if (preselectedId && trainingSheetOpen) {
      setSelectedSoldierId(preselectedId)
      clearPreselection(null)
    }
  }, [preselectedId, trainingSheetOpen, clearPreselection])

  // Auto-select first available soldier on open
  useEffect(() => {
    if (trainingSheetOpen && !preselectedId && !selectedSoldierId) {
      const available = soldiers.find(s =>
        (!s.injuredUntil || s.injuredUntil <= Date.now()) &&
        !isSoldierInTraining(s.id)
      )
      if (available) setSelectedSoldierId(available.id)
    }
  }, [trainingSheetOpen, preselectedId, selectedSoldierId, soldiers, isSoldierInTraining])

  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('rifle')
  const [selectedPackageId, setSelectedPackageId] = useState('quick')
  const [selectedSpeed, setSelectedSpeed] = useState(1)

  // Auto-compute slot index: first available empty slot
  const autoSlotIndex = useMemo(() => {
    for (let i = 0; i < unlockedSlots; i++) {
      const slot = slots[i]
      if (!slot || slot.trainingPhase === 'empty' || slot.trainingPhase === 'selecting') return i
    }
    return -1 // All busy
  }, [slots, unlockedSlots])

  const activeSlot = autoSlotIndex >= 0 ? slots[autoSlotIndex] : null
  const slotIsEmpty = autoSlotIndex >= 0

  const selectedPackage = TIME_PACKAGES.find(p => p.id === selectedPackageId) ?? TIME_PACKAGES[0]!
  const cost = selectedPackage.tokens
  const duration = selectedPackage.seconds
  const canAfford = tokens >= cost
  const selectedSoldier = soldiers.find(s => s.id === selectedSoldierId)
  const soldierBusy = selectedSoldierId ? isSoldierInTraining(selectedSoldierId) : false
  const canStart = selectedSoldierId !== null && canAfford && slotIsEmpty && !soldierBusy

  // Check if selected soldier has a trained brain for selected weapon
  const hasBrainForWeapon = selectedSoldier?.trainedBrains?.[selectedWeapon] != null

  // Available soldiers (not injured)
  const availableSoldiers = useMemo(() =>
    soldiers.filter(s => !s.injuredUntil || s.injuredUntil <= Date.now()),
  [soldiers])

  // Active training slots info
  const activeTrainingSlots = useMemo(() =>
    slots.filter((s, i) => i < unlockedSlots && s && s.trainingPhase !== 'empty' && s.trainingPhase !== 'selecting'),
  [slots, unlockedSlots])

  // Next locked slot cost
  const nextLockedSlotCost = unlockedSlots < 3 ? SLOT_COSTS[unlockedSlots] : null

  const handleUnlockSlot = useCallback(() => {
    sfx.buttonTap()
    const success = unlockSlot()
    if (success) sfx.deployHorn()
  }, [unlockSlot])

  const setObservingSlotIndex = useSceneStore((s) => s.setObservingSlotIndex)

  const handleStart = useCallback(() => {
    if (!selectedSoldierId || !selectedSoldier || autoSlotIndex < 0) return
    const success = commitToTrain(autoSlotIndex, selectedSoldierId, selectedSoldier.name, selectedWeapon, selectedPackageId, selectedSpeed)
    if (success) {
      sfx.buttonTap()
      setTrainingSheetOpen(false)
      setObservingSlotIndex(autoSlotIndex)
    }
  }, [autoSlotIndex, selectedSoldierId, selectedSoldier, selectedWeapon, selectedPackageId, selectedSpeed, commitToTrain, setTrainingSheetOpen, setObservingSlotIndex])

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
          {/* Active training slots (informational) */}
          {activeTrainingSlots.length > 0 && (
            <div className="training-active-slots">
              {activeTrainingSlots.map((slot, i) => (
                <div key={i} className="training-active-slot-info">
                  <RefreshIcon size={12} />
                  <span>{slot.slotSoldierName} — {slot.slotWeapon?.toUpperCase()}</span>
                  <span className="training-active-slot-stats">GEN {slot.generation} | {(slot.bestFitness * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Soldier chips (horizontal scroll) */}
          <div className="training-section-label">SELECT SOLDIER</div>
          {availableSoldiers.length === 0 ? (
            <div className="training-empty">No soldiers in roster</div>
          ) : (
            <div className="training-soldier-chips">
              {availableSoldiers.map((s) => {
                const inTraining = isSoldierInTraining(s.id)
                return (
                  <button
                    key={s.id}
                    className={`training-soldier-chip ${selectedSoldierId === s.id ? 'selected' : ''} ${inTraining ? 'busy' : ''}`}
                    onClick={() => { if (!inTraining) { sfx.buttonTap(); setSelectedSoldierId(s.id) } }}
                    disabled={inTraining}
                  >
                    <span className="training-chip-dot" />
                    <span className="training-chip-name">{s.name.split(' ').slice(1).join(' ') || s.name}</span>
                    {inTraining && <span className="training-chip-busy">BUSY</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* Weapon carousel */}
          <div className="training-section-label">WEAPON</div>
          <WeaponCarousel selected={selectedWeapon} onSelect={setSelectedWeapon} />

          {hasBrainForWeapon && (
            <div className="training-retrain-notice">
              <TokenIcon size={14} /> Re-training will improve existing {selectedWeapon} brain
            </div>
          )}

          {/* Time package picker */}
          <div className="training-section-label">TRAINING TIME</div>
          <div className="training-tier-row">
            {TIME_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                className={`training-tier-btn ${selectedPackageId === pkg.id ? 'selected' : ''}`}
                style={{
                  borderColor: selectedPackageId === pkg.id ? '#00e5ff' : 'transparent',
                  color: selectedPackageId === pkg.id ? '#00e5ff' : '#7a8a7a',
                }}
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                <span className="training-tier-multiplier">{pkg.label}</span>
                <span className="training-tier-label">{pkg.tokens} <TokenIcon size={10} /></span>
              </button>
            ))}
          </div>

          {/* Sim speed toggle */}
          <div className="training-section-label">SIM SPEED</div>
          <div className="training-speed-row">
            {SIM_SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.multiplier}
                className={`training-speed-btn ${selectedSpeed === opt.multiplier ? 'selected' : ''}`}
                style={{
                  borderColor: selectedSpeed === opt.multiplier ? opt.color : 'transparent',
                  color: selectedSpeed === opt.multiplier ? opt.color : '#7a8a7a',
                }}
                onClick={() => setSelectedSpeed(opt.multiplier)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Cost + duration display */}
          <div className="training-cost-row">
            <div className="training-cost-item">
              <span className="training-cost-label">COST</span>
              <span className={`training-cost-value ${!canAfford ? 'insufficient' : ''}`}>
                {cost} <TokenIcon size={12} />
              </span>
            </div>
            <div className="training-cost-item">
              <span className="training-cost-label">TIME</span>
              <span className="training-cost-value">
                {duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
              </span>
            </div>
          </div>

          {/* Slot indicator */}
          <div className="training-slot-indicator">
            {slotIsEmpty ? (
              <span className="training-slot-indicator-text">SLOT {autoSlotIndex + 1} AVAILABLE</span>
            ) : nextLockedSlotCost != null ? (
              <button className="training-unlock-slot-btn game-btn" onClick={handleUnlockSlot}>
                <LockIcon size={12} /> UNLOCK SLOT ({nextLockedSlotCost} <TokenIcon size={10} />)
              </button>
            ) : (
              <span className="training-slot-indicator-text">ALL SLOTS BUSY</span>
            )}
          </div>

          {/* Start button */}
          <button
            className={`game-btn training-start-btn ${!canStart ? 'disabled' : ''}`}
            onClick={handleStart}
            disabled={!canStart}
          >
            {soldierBusy ? 'SOLDIER IN TRAINING' :
             !selectedSoldierId ? 'SELECT A SOLDIER' :
             !slotIsEmpty ? 'ALL SLOTS BUSY' :
             !canAfford ? 'NOT ENOUGH TOKENS' :
             'START TRAINING'}
          </button>
        </div>
      </div>
    </div>
  )
}
