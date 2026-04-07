/**
 * Sticky Zones — areas that slow movement (spilled syrup, glue, etc.)
 *
 * When a sticky prop is destroyed, a zone is created at its position.
 * BattleScene checks soldier positions against zones each frame and
 * reduces their speed if inside one.
 *
 * Global mutable store — no React state, zero re-renders.
 */

export interface StickyZone {
  id: string
  position: [number, number, number]
  radius: number
  speedMultiplier: number  // 0.3 = 30% speed (70% reduction)
}

const zones: StickyZone[] = []

export function addStickyZone(zone: StickyZone) {
  zones.push(zone)
}

export function clearStickyZones() {
  zones.length = 0
}

export function getStickyZones(): readonly StickyZone[] {
  return zones
}

/**
 * Check if a position is inside any sticky zone.
 * Returns the speed multiplier (1.0 = no effect, 0.3 = very slow).
 */
export function getStickySpeedMultiplier(x: number, z: number): number {
  let mult = 1.0
  for (const zone of zones) {
    const dx = x - zone.position[0]
    const dz = z - zone.position[2]
    const distSq = dx * dx + dz * dz
    if (distSq < zone.radius * zone.radius) {
      mult = Math.min(mult, zone.speedMultiplier)
    }
  }
  return mult
}
