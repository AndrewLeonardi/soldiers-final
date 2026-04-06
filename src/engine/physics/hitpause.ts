/**
 * Hitpause — freeze-frame effect on big impacts.
 * Module-level state (same pattern as ScreenShake).
 *
 * Call triggerHitpause(frames) when a big impact happens.
 * In your useFrame, multiply delta by getHitpauseScale().
 * During hitpause, scale approaches 0, making everything freeze.
 */

let hitpauseRemaining = 0
let hitpauseDecay = 0

/**
 * Trigger a hitpause freeze.
 * @param frames Number of frames to freeze (3-5 for big hits)
 */
export function triggerHitpause(frames: number) {
  // Convert frames to approximate seconds at 60fps
  hitpauseRemaining = Math.max(hitpauseRemaining, frames / 60)
  hitpauseDecay = 0
}

/**
 * Get the current time scale (0 = frozen, 1 = normal).
 * Call this every frame and multiply your delta by it.
 * @param rawDelta The raw frame delta in seconds
 */
export function getHitpauseScale(rawDelta: number): number {
  if (hitpauseRemaining <= 0) return 1.0

  hitpauseRemaining -= rawDelta
  hitpauseDecay += rawDelta

  if (hitpauseRemaining <= 0) {
    hitpauseRemaining = 0
    hitpauseDecay = 0
    return 1.0
  }

  // Near-zero during freeze, with a tiny ramp at the end for smooth exit
  const totalDuration = hitpauseRemaining + hitpauseDecay
  const progress = hitpauseDecay / totalDuration
  if (progress > 0.7) {
    // Smooth ramp back to normal in the last 30%
    return (progress - 0.7) / 0.3
  }
  return 0.02 // near-zero but not exactly zero (prevents division errors)
}

/** Check if hitpause is currently active */
export function isHitpaused(): boolean {
  return hitpauseRemaining > 0
}
