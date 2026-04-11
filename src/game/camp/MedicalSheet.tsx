/**
 * MedicalSheet — bottom sheet showing injured soldiers and healing progress.
 *
 * Sprint 6, Phase 3. Opens when tapping the medical tent.
 * Shows countdown timers for each healing soldier, auto-refreshes every second.
 */
import { useState, useCallback, useEffect } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'Rifle',
  rocketLauncher: 'Rocket Launcher',
  grenade: 'Grenades',
  machineGun: 'Machine Gun',
  tank: 'Tank',
}

/** 10-minute healing duration in ms */
const HEAL_DURATION_MS = 10 * 60 * 1000

export function MedicalSheet() {
  const isOpen = useSceneStore((s) => s.medicalSheetOpen)
  const setMedicalSheetOpen = useSceneStore((s) => s.setMedicalSheetOpen)
  const soldiers = useCampStore((s) => s.soldiers)
  const tickHealing = useCampStore((s) => s.tickHealing)

  // Force re-render every second for timer updates
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      tickHealing()
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, tickHealing])

  const handleClose = useCallback(() => {
    setMedicalSheetOpen(false)
  }, [setMedicalSheetOpen])

  if (!isOpen) return null

  const now = Date.now()
  const injuredSoldiers = soldiers.filter(
    (s) => s.injuredUntil && s.injuredUntil > now,
  )

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet medical-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">FIELD HOSPITAL</span>
          <span className="medical-count">{injuredSoldiers.length} INJURED</span>
        </div>

        <div className="game-sheet-body">
          {injuredSoldiers.length === 0 ? (
            <div className="medical-empty">
              <div className="medical-empty-icon">✓</div>
              <div className="medical-empty-text">All soldiers healthy</div>
            </div>
          ) : (
            <div className="medical-list">
              {injuredSoldiers.map((sol) => {
                const remaining = (sol.injuredUntil ?? 0) - now
                const elapsed = HEAL_DURATION_MS - remaining
                const progress = Math.min(elapsed / HEAL_DURATION_MS, 1)
                const minutes = Math.floor(remaining / 60000)
                const seconds = Math.floor((remaining % 60000) / 1000)
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

                return (
                  <div key={sol.id} className="medical-soldier-row">
                    <div className="medical-soldier-info">
                      <span className="medical-soldier-name">{sol.name}</span>
                      <span className="medical-soldier-weapon">
                        {WEAPON_LABELS[sol.weapon] ?? sol.weapon}
                      </span>
                    </div>

                    <div className="medical-soldier-progress">
                      {/* SVG circular progress ring */}
                      <svg className="medical-ring" width="40" height="40" viewBox="0 0 40 40">
                        {/* Background track */}
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="3"
                        />
                        {/* Progress arc */}
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none"
                          stroke="#cc4444"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${progress * 100.53} 100.53`}
                          transform="rotate(-90 20 20)"
                          style={{ transition: 'stroke-dasharray 0.3s ease' }}
                        />
                        {/* Heart icon center */}
                        <text
                          x="20" y="22"
                          textAnchor="middle"
                          fontSize="12"
                          className="medical-heart"
                        >
                          ♥
                        </text>
                      </svg>
                    </div>

                    <div className="medical-soldier-timer">
                      <span className="medical-timer-value">{timeStr}</span>
                      <span className="medical-timer-label">remaining</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
