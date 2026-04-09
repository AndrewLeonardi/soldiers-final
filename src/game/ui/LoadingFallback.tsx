/**
 * LoadingFallback — toy-styled overlay shown while the scene initializes.
 *
 * Replaces the bare `<Suspense fallback={null}>` that used to flash a
 * dark container before the Canvas mounted. Pulses gently then CSS-fades
 * itself out after ~600ms so it dismisses cleanly whether or not the
 * Physics WASM loaded by then.
 */
import './loading-fallback.css'

export function LoadingFallback() {
  return (
    <div className="base-loading" aria-hidden="true">
      <div className="base-loading__text">Deploying Command Base…</div>
    </div>
  )
}
