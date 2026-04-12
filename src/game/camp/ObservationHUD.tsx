/**
 * ObservationHUD — HTML overlay for the immersive training observation view.
 *
 * Sprint B. Shows generation counter, fitness sparkline, timer countdown,
 * soldier name, milestone popups, and EXIT button.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { useSceneStore } from '@stores/sceneStore'
import { COMPUTE_TIERS } from './trainingConstants'
import { WEAPON_DISPLAY } from '@config/roster'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET',
  grenade: 'GRENADE',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

/** Build sparkline SVG path from fitnessHistory */
function buildSparkline(history: number[], width: number, height: number): string {
  if (history.length < 2) return ''
  const maxVal = Math.max(0.01, ...history)
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * width
    const y = height - (v / maxVal) * (height - 4) - 2
    return `${x},${y}`
  })
  return `M${points.join(' L')}`
}

export function ObservationHUD() {
  const observingSlotIndex = useSceneStore((s) => s.observingSlotIndex)
  const setObservingSlotIndex = useSceneStore((s) => s.setObservingSlotIndex)

  const slot = useCampTrainingStore(s =>
    observingSlotIndex !== null ? s.slots[observingSlotIndex] : null,
  )

  // Track milestone popups
  const [milestoneText, setMilestoneText] = useState<string | null>(null)
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMilestoneCount = useRef(0)

  // Show graduation banner
  const [showGraduation, setShowGraduation] = useState(false)

  useEffect(() => {
    if (!slot) return
    // Check for new milestones
    if (slot.milestones.length > lastMilestoneCount.current) {
      const latest = slot.milestones[slot.milestones.length - 1]
      if (latest) {
        setMilestoneText(latest.label)
        if (milestoneTimer.current) clearTimeout(milestoneTimer.current)
        milestoneTimer.current = setTimeout(() => setMilestoneText(null), 2000)
      }
    }
    lastMilestoneCount.current = slot.milestones.length
  }, [slot?.milestones.length])

  // Handle graduation: show banner then auto-exit
  useEffect(() => {
    if (!slot) return
    if (slot.trainingPhase === 'graduated' || slot.trainingPhase === 'ceremony-end') {
      setShowGraduation(true)
    }
    if (slot.trainingPhase === 'empty' && showGraduation) {
      // Ceremony complete — auto-exit observation
      setTimeout(() => {
        setObservingSlotIndex(null)
        setShowGraduation(false)
      }, 500)
    }
  }, [slot?.trainingPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExit = useCallback(() => {
    sfx.buttonTap()
    setObservingSlotIndex(null)
  }, [setObservingSlotIndex])

  if (observingSlotIndex === null || !slot) return null

  const tierConfig = COMPUTE_TIERS[slot.computeTier - 1]
  const tierColor = tierConfig?.color ?? '#00e5ff'
  const tierLabel = tierConfig?.label ?? 'STANDARD'
  const fitnessPercent = Math.round(slot.bestFitness * 100)
  const remaining = Math.max(0, slot.timerTotal - slot.timerElapsed)
  const timeStr = remaining.toFixed(1) + 's'
  const weaponLabel = WEAPON_LABELS[slot.slotWeapon ?? ''] ?? 'RIFLE'
  const sparklinePath = buildSparkline(slot.fitnessHistory, 120, 32)

  return (
    <div className="observation-hud">
      {/* Top-left: Soldier info */}
      <div className="obs-top-left">
        <div className="obs-soldier-name">{slot.slotSoldierName ?? 'UNKNOWN'}</div>
        <div className="obs-weapon-label" style={{ color: tierColor }}>{weaponLabel}</div>
      </div>

      {/* Top-center: Gen + Fitness + Sparkline */}
      <div className="obs-top-center">
        <div className="obs-gen-row">
          <span className="obs-gen-label">GEN</span>
          <span className="obs-gen-value">{String(slot.generation).padStart(2, '0')}</span>
          <span className="obs-fitness-divider">|</span>
          <span className="obs-fitness-value" style={{ color: tierColor }}>{fitnessPercent}%</span>
        </div>
        {slot.fitnessHistory.length >= 2 && (
          <svg className="obs-sparkline" width={120} height={32} viewBox={`0 0 120 32`}>
            <path d={sparklinePath} fill="none" stroke={tierColor} strokeWidth={2} strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Top-right: Timer + Tier */}
      <div className="obs-top-right">
        <div className="obs-timer" style={{ color: tierColor }}>{timeStr}</div>
        <div className="obs-tier-badge" style={{ borderColor: tierColor, color: tierColor }}>
          {tierLabel}
        </div>
      </div>

      {/* Milestone popup */}
      {milestoneText && (
        <div className="obs-milestone">
          {milestoneText}
        </div>
      )}

      {/* Graduation banner */}
      {showGraduation && (
        <div className="obs-graduation">
          TRAINING COMPLETE
        </div>
      )}

      {/* Bottom-center: EXIT */}
      <div className="obs-bottom-center">
        <button className="obs-exit-btn" onClick={handleExit}>
          EXIT TRAINING
        </button>
      </div>
    </div>
  )
}
