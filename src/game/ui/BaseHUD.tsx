/**
 * BaseHUD — the HTML overlay for the /game-concept scene.
 *
 * Phase 2a chrome:
 *   - Back button (top-left) — exits to homepage
 *   - Mode toggle (top-right) — VIEW ↔ BUILD
 *   - Title strip (top-center) — "COMMAND BASE" (hidden on narrow screens
 *     where the mode toggle would collide)
 *   - Dev-only reset button (under back button) — wipes layout to starter
 *   - In BUILD mode: BuildTray at the bottom
 *   - In BUILD mode with a brush active: ROTATE and CANCEL buttons in the
 *     bottom corners
 *
 * The container is `pointer-events: none` so the 3D canvas underneath
 * still receives orbit-drag events; interactive children opt back in
 * with `pointer-events: auto` via their own class rules.
 */
import { Link } from 'react-router-dom'
import { BackArrowIcon } from '@ui/ToyIcons'
import { useBaseStore } from '@game/stores/baseStore'
import { useTrainingStore } from '@game/stores/trainingStore'
import { BuildTray } from './BuildTray'
import './base-hud.css'
import './build-tray.css'

export function BaseHUD() {
  const mode = useBaseStore((s) => s.mode)
  const brush = useBaseStore((s) => s.brush)
  const toggleMode = useBaseStore((s) => s.toggleMode)
  const rotateBrush = useBaseStore((s) => s.rotateBrush)
  const clearBrush = useBaseStore((s) => s.clearBrush)
  const resetToStarterLayout = useBaseStore((s) => s.resetToStarterLayout)

  // Check ALL slots — any running/observing slot turns the button "active";
  // any graduated slot hides it (cutscene takes over).
  const anyRunningSlotId = useTrainingStore((s) => {
    const entry = Object.entries(s.slots).find(([, sl]) => sl.phase === 'running')
    return entry?.[0] ?? null
  })
  const anyGraduated = useTrainingStore((s) =>
    Object.values(s.slots).some((sl) => sl.phase === 'graduated'),
  )
  const allIdle = useTrainingStore((s) =>
    Object.values(s.slots).every((sl) => sl.phase === 'idle'),
  )

  const isBuild = mode === 'build'
  const brushActive = brush !== null

  const isTraining = anyRunningSlotId !== null
  const isGraduated = anyGraduated

  const handleTrainTap = () => {
    const store = useTrainingStore.getState()
    if (allIdle) {
      store.openTrainingSheet()
    } else if (anyRunningSlotId) {
      // Zoom into the first running slot
      store.startObserving(anyRunningSlotId)
    }
    // graduated: cutscene auto-shows; observing: already in zoom view
  }

  return (
    <div className="base-hud" aria-label="Command base interface">
      <Link to="/" className="base-hud__back" aria-label="Back to home">
        <span className="base-hud__back-icon">
          <BackArrowIcon size={16} color="#F5F0E0" />
        </span>
        Back
      </Link>

      <div className="base-hud__title">Command Base</div>

      <button
        type="button"
        onClick={toggleMode}
        className={`base-mode-toggle${isBuild ? ' base-mode-toggle--build' : ''}`}
        aria-pressed={isBuild}
      >
        {isBuild ? 'Build' : 'View'}
      </button>

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={resetToStarterLayout}
          className="base-dev-reset"
          title="Reset base layout (dev only)"
        >
          Reset Base
        </button>
      )}

      {/* TRAIN button — bottom-center, VIEW mode only */}
      {!isBuild && !isGraduated && (
        <button
          type="button"
          onClick={handleTrainTap}
          className={`base-train-btn${isTraining ? ' base-train-btn--active' : ''}`}
          aria-label={isTraining ? 'Watch training in progress' : 'Open training selection'}
        >
          {isTraining && <span className="base-train-btn__dot" aria-hidden="true" />}
          {isTraining ? 'Training…' : 'Train'}
        </button>
      )}

      {isBuild && <BuildTray />}

      {isBuild && brushActive && (
        <>
          <button
            type="button"
            onClick={clearBrush}
            className="base-brush-action base-brush-action--cancel"
            aria-label="Cancel current brush"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={rotateBrush}
            className="base-brush-action base-brush-action--rotate"
            aria-label="Rotate current brush 90 degrees"
          >
            Rotate
          </button>
        </>
      )}
    </div>
  )
}
