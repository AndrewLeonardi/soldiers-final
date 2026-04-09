/**
 * TrainingObservationHUD — the HTML overlay the player sees while
 * observing a training slot in /game-concept.
 *
 * Only rendered when `observing !== null` in the training store. Gives
 * the player everything they need to drive a training run from the
 * browser, no devtools required:
 *
 *   - Top-left: a generation counter that reads `slot.generation`
 *   - Top-center: best-fitness percentage + a 20-point sparkline
 *     drawn from `slot.fitnessHistory`
 *   - Top-right: a 1× / 10× / 50× speed toggle
 *   - Bottom-center: a big contextual action button. Its label and
 *     color depend on the slot's phase:
 *       * `observing` (idle) → GREEN "TRAIN" button → startTraining
 *       * `running`         → RED "STOP" button → stopTraining
 *       * `graduated`       → GOLD "SAVE & CONTINUE" → commitGraduation
 *   - Bottom-left: a small "EXIT OBSERVE" pill → stopObserving
 *
 * The whole thing is a sibling of `BaseHUD` inside GameConcept. Both
 * HUDs share the same `pointer-events: none` container pattern so the
 * 3D canvas underneath still gets orbit drag events; interactive
 * children opt back in via `pointer-events: auto` on their own class
 * rules (defined in training-hud.css).
 *
 * Zustand selectors are deliberately atomic — separate
 * useTrainingStore calls for each field — so re-renders are scoped to
 * the specific piece that changed. Per the feedback memory, stable
 * action refs don't trigger re-renders, and multiple atomic state
 * selectors are the idiomatic pattern here.
 */
import { useTrainingStore, type TrainingSpeed } from '@game/stores/trainingStore'
import './training-hud.css'

/** Phase 3a slot — hardcoded for the single-trainee build. */
const PHASE_3A_SLOT_ID = 'slot-rocket-ace'

/** Ordered list of selectable speed multipliers. */
const SPEED_OPTIONS: readonly TrainingSpeed[] = [1, 10, 50] as const

/**
 * Build the SVG path data for a fitness sparkline given the last N
 * recorded best-fitness values. Returns `null` when there's nothing to
 * draw yet (empty history).
 *
 * We normalize the y-axis to a fixed `[0, 1]` range — fitness is
 * already bounded that way by the scenario scoring functions, with
 * the rare tank exception (up to ~1.05 from positional bonus), so a
 * fixed scale keeps the sparkline stable across generations instead
 * of zooming wildly as new max values arrive.
 */
function buildSparkline(
  history: readonly number[],
  width: number,
  height: number,
): { line: string; fill: string } | null {
  if (history.length === 0) return null
  const n = history.length
  const padX = 2
  const padY = 2
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const xStep = n === 1 ? 0 : innerW / (n - 1)
  const points: [number, number][] = history.map((f, i) => {
    const x = padX + xStep * i
    const clamped = Math.max(0, Math.min(1, f))
    const y = padY + innerH * (1 - clamped)
    return [x, y]
  })

  // When we have a single value, draw a horizontal tick; otherwise
  // connect with line segments.
  const line =
    n === 1
      ? `M ${padX} ${points[0]![1]} L ${padX + innerW} ${points[0]![1]}`
      : 'M ' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')

  // Fill polygon closes the line back to the baseline.
  const baselineY = padY + innerH
  const fill =
    n === 1
      ? `M ${padX} ${baselineY} L ${padX} ${points[0]![1]} L ${padX + innerW} ${points[0]![1]} L ${padX + innerW} ${baselineY} Z`
      : 'M ' +
        points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') +
        ` L ${padX + innerW} ${baselineY} L ${padX} ${baselineY} Z`

  return { line, fill }
}

export function TrainingObservationHUD() {
  // Atomic selectors — each only triggers a re-render when its own
  // slice of state changes.
  const observing = useTrainingStore((s) => s.observing)
  const slot = useTrainingStore((s) =>
    s.observing ? s.slots[s.observing] : null,
  )
  const simSpeed = useTrainingStore((s) => s.simSpeed)

  // Nothing to render when the player isn't observing anything.
  if (!observing || !slot) return null

  const phase = slot.phase
  const generation = slot.generation
  const bestFitness = slot.bestFitness
  const history = slot.fitnessHistory

  const sparkline = buildSparkline(history, 200, 36)

  const handleTrain = () => {
    useTrainingStore.getState().startTraining(PHASE_3A_SLOT_ID)
  }
  const handleStop = () => {
    useTrainingStore.getState().stopTraining(PHASE_3A_SLOT_ID)
  }
  const handleSave = () => {
    useTrainingStore.getState().commitGraduation(PHASE_3A_SLOT_ID)
  }
  const handleExit = () => {
    useTrainingStore.getState().stopObserving()
  }
  const handleSpeed = (speed: TrainingSpeed) => {
    useTrainingStore.getState().setSpeed(speed)
  }

  // Format: GEN 03 — zero-padded to two digits, plus a rolling marker
  // for runs past 99 (unlikely in Phase 3a but cheap insurance).
  const genLabel =
    generation < 100 ? String(generation).padStart(2, '0') : String(generation)

  // Fitness display: 0.000 → 00%, 0.345 → 35%, 1.02 → 102%. Never shows
  // a fractional percent — players don't care about the decimal.
  const fitnessPercent = Math.round(bestFitness * 100)
  const fitnessClass =
    phase === 'graduated'
      ? 'thud-fitness__value thud-fitness__value--graduated'
      : 'thud-fitness__value'

  return (
    <div className="thud" aria-label="Training observation interface">
      {/* Generation counter (top-left) */}
      <div className="thud-gen" aria-label={`Generation ${generation}`}>
        <span className="thud-gen__label">Generation</span>
        <span className="thud-gen__value">{genLabel}</span>
      </div>

      {/* Fitness + sparkline (top-center) */}
      <div className="thud-fitness" aria-label={`Best fitness ${fitnessPercent}%`}>
        <span className="thud-fitness__label">Best Fitness</span>
        <span className={fitnessClass}>{fitnessPercent}%</span>
        <svg
          className="thud-fitness__spark"
          viewBox="0 0 200 36"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {sparkline && (
            <>
              <path className="thud-fitness__spark-fill" d={sparkline.fill} />
              <path className="thud-fitness__spark-line" d={sparkline.line} />
            </>
          )}
        </svg>
      </div>

      {/* Speed toggle (top-right) */}
      <div className="thud-speed" role="toolbar" aria-label="Training speed">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => handleSpeed(speed)}
            className={`thud-speed-btn${simSpeed === speed ? ' thud-speed-btn--selected' : ''}`}
            aria-pressed={simSpeed === speed}
          >
            {speed}×
          </button>
        ))}
      </div>

      {/* Exit observe (bottom-left) */}
      <button
        type="button"
        onClick={handleExit}
        className="thud-exit"
        aria-label="Exit training observation"
      >
        Exit Observe
      </button>

      {/*
       * Big contextual action (bottom-center). The `graduated` case
       * deliberately renders NO button here — the GraduationCutscene
       * modal owns the commit action during graduation, and showing
       * a redundant button in the HUD would compete with the modal's
       * SAVE & CONTINUE for the player's attention.
       */}
      {phase === 'running' ? (
        <button
          type="button"
          onClick={handleStop}
          className="thud-action thud-action--stop"
          aria-label="Stop training run"
        >
          Stop
        </button>
      ) : phase === 'observing' || phase === 'idle' ? (
        <button
          type="button"
          onClick={handleTrain}
          className="thud-action thud-action--train"
          aria-label="Start training run"
        >
          Train
        </button>
      ) : null}
    </div>
  )
}
