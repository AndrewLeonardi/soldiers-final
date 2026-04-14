/**
 * TrainingSelectionSheet — the gamified bottom-sheet for assigning soldiers
 * to the Training Grounds and choosing a training scenario.
 *
 * This is the primary token-spend surface in the game. The business model
 * lives here: players choose a soldier, pick a weapon training type, and
 * confirm. Each deploy charges tokens from the player's balance.
 *
 * Opens when the player taps the Training Grounds building in VIEW mode
 * while no training is running (openTrainingSheet in the training store).
 *
 * Flow:
 *   1. Player selects a soldier from their roster
 *   2. Player selects a training type (Rocket / Grenade / Machine Gun / Tank)
 *   3. Token cost is shown; balance turns red if insufficient
 *   4. DEPLOY button activates → charges tokens, starts the GA run,
 *      closes the sheet, and training becomes visible on the base
 *
 * Design rules (per plan.md UX non-negotiables):
 *   - All buttons beveled with gradients, never flat
 *   - Mobile game look — not a web app form
 *   - Weapon color stripes, rank badges, trained indicators
 *   - Bottom-sheet slides up from below (native mobile pattern)
 *
 * Phase 3a: single-slot selection (one soldier, one weapon at a time).
 * Phase 3c will extend this to multi-slot with capacity indicators.
 */
import { useState } from 'react'
import { useTrainingStore } from '@game/stores/trainingStore'
import { useRosterStore } from '@stores/rosterStore'
import { useGameStore } from '@stores/gameStore'
import { WEAPON_TRAINING, WEAPON_DISPLAY } from '@config/roster'
import type { WeaponType } from '@config/types'
import './training-selection-sheet.css'

// ── Weapon display config ──────────────────────────────────────────────

/**
 * Color stripe and display metadata for each trainable weapon.
 * The stripe color runs across the top of each weapon card as a visual
 * differentiator — no icons, just color + typography.
 */
const WEAPON_CARD_CONFIG: Record<string, { stripe: string; desc: string }> = {
  rocketLauncher: { stripe: '#C04010', desc: 'High damage, slow reload' },
  grenade:        { stripe: '#6a8020', desc: 'Area splash, kills groups' },
  machineGun:     { stripe: '#2060A0', desc: 'Bullet hose, high rate' },
  tank:           { stripe: '#6a6040', desc: 'Armored cannon + treads' },
}

/** Trainable weapons in display order. */
const TRAINABLE_WEAPONS = Object.keys(WEAPON_TRAINING) as WeaponType[]

// ── Rank badge class helper ────────────────────────────────────────────

function rankBadgeClass(rank: string): string {
  const r = rank.toLowerCase()
  if (r === 'sgt') return 'tsheet__soldier-rank-badge tsheet__soldier-rank-badge--sgt'
  if (r === 'pvt') return 'tsheet__soldier-rank-badge tsheet__soldier-rank-badge--pvt'
  if (r === 'cpl') return 'tsheet__soldier-rank-badge tsheet__soldier-rank-badge--cpl'
  return 'tsheet__soldier-rank-badge'
}

// ── Component ─────────────────────────────────────────────────────────

export function TrainingSelectionSheet() {
  const closeSheet = useTrainingStore((s) => s.closeTrainingSheet)
  const deployTraining = useTrainingStore.getState().deployTraining

  const soldiers = useRosterStore((s) => s.soldiers)
  const compute = useGameStore((s) => s.tokens)

  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null)
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType | null>(null)

  const cost = selectedWeapon ? (WEAPON_TRAINING[selectedWeapon]?.tokenCost ?? 0) : 0
  const hasEnoughTokens = compute >= cost
  const canDeploy = selectedSoldierId !== null && selectedWeapon !== null && hasEnoughTokens

  const handleDeploy = () => {
    if (!selectedSoldierId || !selectedWeapon) return
    const success = deployTraining(selectedSoldierId, selectedWeapon)
    if (success) closeSheet()
  }

  const handleBackdropClick = () => closeSheet()

  // Deploy button label encodes priority: soldier first, then weapon, then compute
  let deployLabel = 'SELECT SOLDIER & TRAINING'
  if (selectedSoldierId && !selectedWeapon) deployLabel = 'SELECT TRAINING TYPE'
  else if (selectedSoldierId && selectedWeapon && !hasEnoughTokens) deployLabel = 'NOT ENOUGH TOKENS'
  else if (canDeploy) deployLabel = 'DEPLOY TO TRAINING'

  return (
    <div
      className="tsheet-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Training selection"
    >
      {/* Sheet — stop propagation so taps inside don't close via backdrop */}
      <div className="tsheet" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="tsheet__header">
          <span className="tsheet__title">Training Camp</span>
          <button
            type="button"
            className="tsheet__close"
            onClick={closeSheet}
            aria-label="Close training selection"
          >
            ✕
          </button>
        </div>

        {/* ── Soldier picker ── */}
        <div className="tsheet__section">
          <span className="tsheet__section-label">Assign Soldier</span>
          <div className="tsheet__soldier-scroll">
            {soldiers.map((soldier) => {
              const isSelected = selectedSoldierId === soldier.id
              const isTrained = selectedWeapon
                ? !!(soldier.trainedBrains?.[selectedWeapon]?.length)
                : false

              return (
                <button
                  key={soldier.id}
                  type="button"
                  className={`tsheet__soldier-card${isSelected ? ' tsheet__soldier-card--selected' : ''}`}
                  onClick={() => setSelectedSoldierId(isSelected ? null : soldier.id)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${soldier.name}`}
                >
                  <div className={rankBadgeClass(soldier.rank)}>
                    {soldier.rank}
                  </div>
                  <span className="tsheet__soldier-name">{soldier.name}</span>
                  {isTrained && (
                    <span className="tsheet__soldier-trained-badge">Trained</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Weapon / training type picker ── */}
        <div className="tsheet__section" style={{ marginTop: 16 }}>
          <span className="tsheet__section-label">Training Type</span>
          <div className="tsheet__weapon-grid">
            {TRAINABLE_WEAPONS.map((weapon) => {
              const config = WEAPON_TRAINING[weapon]
              const display = WEAPON_DISPLAY[weapon]
              const cardConfig = WEAPON_CARD_CONFIG[weapon]
              if (!config || !display || !cardConfig) return null
              const isSelected = selectedWeapon === weapon

              return (
                <button
                  key={weapon}
                  type="button"
                  className={`tsheet__weapon-card${isSelected ? ' tsheet__weapon-card--selected' : ''}`}
                  onClick={() => setSelectedWeapon(isSelected ? null : weapon)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${display.name} training`}
                >
                  {/* Color stripe — visual differentiator between weapons */}
                  <div
                    className="tsheet__weapon-stripe"
                    style={{ background: cardConfig.stripe }}
                  />
                  <div className="tsheet__weapon-body">
                    <span className="tsheet__weapon-name">{display.name}</span>
                    <span className="tsheet__weapon-desc">{cardConfig.desc}</span>
                    <span className="tsheet__weapon-cost">{config.tokenCost} CP</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Compute balance ── */}
        <div className="tsheet__compute">
          <span className="tsheet__compute-label">Tokens</span>
          <div style={{ textAlign: 'right' }}>
            {selectedWeapon && cost > 0 && (
              <div className="tsheet__compute-cost-preview">
                Cost: {cost} CP
              </div>
            )}
            <span className={`tsheet__compute-balance${!hasEnoughTokens && cost > 0 ? ' tsheet__compute-balance--low' : ''}`}>
              {compute} CP
            </span>
          </div>
        </div>

        {/* ── Deploy CTA ── */}
        <div className="tsheet__deploy-wrap">
          <button
            type="button"
            className={`tsheet__deploy${canDeploy ? ' tsheet__deploy--ready' : ' tsheet__deploy--disabled'}`}
            disabled={!canDeploy}
            onClick={handleDeploy}
            aria-label={deployLabel}
          >
            {deployLabel}
          </button>
        </div>

      </div>
    </div>
  )
}
