import { useRef } from 'react'
import { useTrainingStore } from '@stores/trainingStore'
import { useGameStore } from '@stores/gameStore'
import { WEAPON_DISPLAY, WEAPON_TRAINING } from '@config/roster'
import { MicrochipIcon } from './ToyIcons'
import '@styles/training.css'

const SPEEDS = [1, 10, 50]

// Milestone messages at fitness thresholds
const MILESTONES = [
  { threshold: 0.25, message: 'SHOWING PROMISE!', color: '#88aa66' },
  { threshold: 0.50, message: 'HALFWAY THERE!', color: '#aaaa44' },
  { threshold: 0.75, message: 'ALMOST READY!', color: '#ddaa22' },
]

export function TrainingHUD() {
  const phase = useGameStore(s => s.phase)
  const status = useTrainingStore(s => s.status)
  const weapon = useTrainingStore(s => s.weapon)
  const generation = useTrainingStore(s => s.generation)
  const currentIndividual = useTrainingStore(s => s.currentIndividual)
  const bestFitness = useTrainingStore(s => s.bestFitness)
  const fitnessHistory = useTrainingStore(s => s.fitnessHistory)
  const simSpeed = useTrainingStore(s => s.simSpeed)
  const simState = useTrainingStore(s => s.simState)
  const setSpeed = useTrainingStore(s => s.setSpeed)
  const pause = useTrainingStore(s => s.pause)
  const resume = useTrainingStore(s => s.resume)
  const stopTraining = useTrainingStore(s => s.stopTraining)
  const setPhase = useGameStore(s => s.setPhase)
  const lastMilestone = useRef(-1)

  if (phase !== 'training' || status === 'idle' || status === 'graduated') return null

  const weaponName = weapon ? WEAPON_DISPLAY[weapon]?.name ?? weapon : ''
  const threshold = weapon ? (WEAPON_TRAINING[weapon]?.fitnessThreshold ?? 0.6) : 0.6
  const progress = Math.min(100, (bestFitness / threshold) * 100)
  const popSize = 30

  // Live hit counter from sim state
  const totalTargets = simState?.targets?.length ?? 0
  const aliveTargets = simState?.targets?.filter((t: any) => t.alive).length ?? 0
  const hitsThisAttempt = totalTargets - aliveTargets

  // Check for milestone celebrations
  const progressFrac = progress / 100
  let milestoneMessage = ''
  let milestoneColor = ''
  for (const m of MILESTONES) {
    if (progressFrac >= m.threshold && lastMilestone.current < m.threshold) {
      milestoneMessage = m.message
      milestoneColor = m.color
      lastMilestone.current = m.threshold
    }
  }
  // Reset milestone tracking when training restarts
  if (progressFrac < 0.1) lastMilestone.current = -1

  function handleStop() {
    stopTraining()
    setPhase('loadout')
  }

  function handlePauseResume() {
    if (status === 'running') pause()
    else resume()
  }

  return (
    <div className="training-hud">
      {/* Top left: generation + live hit counter */}
      <div className="thud-top-left">
        <div className="thud-gen">GEN {generation}</div>
        <div className="thud-individual">
          Attempt {currentIndividual + 1} / {popSize}
        </div>
        {/* Live hit counter */}
        {totalTargets > 0 && (
          <div style={{
            marginTop: 6,
            fontSize: 14,
            fontFamily: "'Black Ops One', monospace",
            color: hitsThisAttempt > 0 ? '#ff6644' : '#888',
            letterSpacing: 1,
          }}>
            TARGETS: {hitsThisAttempt}/{totalTargets}
          </div>
        )}
      </div>

      {/* Top center: fitness + milestone */}
      <div className="thud-top-center">
        <div className="thud-fitness-label">Best Fitness</div>
        <div className="thud-fitness-value">{(bestFitness * 100).toFixed(1)}%</div>
        {fitnessHistory.length > 0 && (
          <div className="thud-sparkline">
            {fitnessHistory.slice(-20).map((f, i) => (
              <div
                key={i}
                className="thud-spark-bar"
                style={{ height: Math.max(2, f * 40) }}
              />
            ))}
          </div>
        )}
        {/* Milestone celebration flash */}
        {milestoneMessage && (
          <div style={{
            marginTop: 8,
            fontSize: 13,
            fontFamily: "'Black Ops One', monospace",
            color: milestoneColor,
            letterSpacing: 2,
            textShadow: `0 0 10px ${milestoneColor}`,
            animation: 'cmNodePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {milestoneMessage}
          </div>
        )}
      </div>

      {/* Top right: speed controls */}
      <div className="thud-top-right">
        <div className="thud-compute">
          <MicrochipIcon size={16} color="#E8C65A" />
          {weaponName}
        </div>
        <div className="thud-speed-controls">
          {SPEEDS.map(s => (
            <button
              key={s}
              className={`thud-speed-btn ${simSpeed === s ? 'active' : ''}`}
              onPointerDown={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: progress + controls */}
      <div className="thud-bottom">
        <div className="thud-progress-bar">
          <div className="thud-progress-fill" style={{ width: `${progress}%` }} />
          <div className="thud-progress-label">
            {progress.toFixed(0)}% to graduation
          </div>
        </div>
        <div className="thud-controls">
          <button className="thud-btn pause" onPointerDown={handlePauseResume}>
            {status === 'running' ? 'Pause' : 'Resume'}
          </button>
          <button className="thud-btn back" onPointerDown={handleStop}>
            Stop
          </button>
        </div>
      </div>
    </div>
  )
}
