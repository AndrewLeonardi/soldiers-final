import { useTrainingStore } from '@stores/trainingStore'
import { useGameStore } from '@stores/gameStore'
import { WEAPON_DISPLAY, WEAPON_TRAINING } from '@config/roster'
import { MicrochipIcon } from './ToyIcons'
import '@styles/training.css'

const SPEEDS = [1, 2, 5, 10, 50]

export function TrainingHUD() {
  const phase = useGameStore(s => s.phase)
  const status = useTrainingStore(s => s.status)
  const weapon = useTrainingStore(s => s.weapon)
  const generation = useTrainingStore(s => s.generation)
  const currentIndividual = useTrainingStore(s => s.currentIndividual)
  const bestFitness = useTrainingStore(s => s.bestFitness)
  const fitnessHistory = useTrainingStore(s => s.fitnessHistory)
  const simSpeed = useTrainingStore(s => s.simSpeed)
  const setSpeed = useTrainingStore(s => s.setSpeed)
  const pause = useTrainingStore(s => s.pause)
  const resume = useTrainingStore(s => s.resume)
  const stopTraining = useTrainingStore(s => s.stopTraining)
  const setPhase = useGameStore(s => s.setPhase)

  if (phase !== 'training' || status === 'idle' || status === 'graduated') return null

  const weaponName = weapon ? WEAPON_DISPLAY[weapon]?.name ?? weapon : ''
  const threshold = weapon ? (WEAPON_TRAINING[weapon]?.fitnessThreshold ?? 0.6) : 0.6
  const progress = Math.min(100, (bestFitness / threshold) * 100)
  const popSize = 30

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
      {/* Top left: generation */}
      <div className="thud-top-left">
        <div className="thud-gen">GEN {generation}</div>
        <div className="thud-individual">
          Attempt {currentIndividual + 1} / {popSize}
        </div>
      </div>

      {/* Top center: fitness */}
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
