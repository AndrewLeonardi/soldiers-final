/**
 * SpringController — damped spring for smoothing values over time.
 *
 * Sprint 2, Phase C2. Used to smooth ghost/champion position, rotation,
 * and aim so they don't teleport between sim ticks.
 */

export class DampedSpring {
  private value: number
  private velocity: number
  private stiffness: number
  private damping: number

  constructor(initialValue = 0, stiffness = 12, damping = 0.8) {
    this.value = initialValue
    this.velocity = 0
    this.stiffness = stiffness
    this.damping = damping
  }

  /** Update toward target value. Returns smoothed value. */
  update(target: number, dt: number): number {
    const clampedDt = Math.min(dt, 0.05) // Cap for stability
    const force = (target - this.value) * this.stiffness
    this.velocity += force * clampedDt
    this.velocity *= Math.pow(1 - this.damping, clampedDt * 60)
    this.value += this.velocity * clampedDt
    return this.value
  }

  /** Get current smoothed value without updating */
  get(): number {
    return this.value
  }

  /** Hard-set value (no spring, instant jump) */
  snap(value: number): void {
    this.value = value
    this.velocity = 0
  }
}

/**
 * Smooth an angle, handling wrap-around (e.g. -π to π).
 */
export class DampedAngleSpring {
  private spring: DampedSpring

  constructor(initialAngle = 0, stiffness = 12, damping = 0.8) {
    this.spring = new DampedSpring(initialAngle, stiffness, damping)
  }

  update(targetAngle: number, dt: number): number {
    // Unwrap the angle difference
    const current = this.spring.get()
    let diff = targetAngle - current
    // Normalize to -π..π
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return this.spring.update(current + diff, dt)
  }

  get(): number {
    return this.spring.get()
  }

  snap(angle: number): void {
    this.spring.snap(angle)
  }
}
