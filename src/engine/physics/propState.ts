/**
 * PropState — mutable state for interactive world props.
 *
 * Props register themselves here on mount. BattleScene's applyExplosion
 * deals damage to nearby props. Props read their state each frame and
 * respond based on their tags (destructible → shatter, explosive → chain).
 *
 * This is a global mutable store (like bodyMapRef) — NOT React state.
 * Zero re-renders. Props check their own state in useFrame.
 */
import type { PropTag } from '@config/worlds/types'

export interface PropInstance {
  id: string
  position: [number, number, number]
  tags: PropTag[]
  health: number
  maxHealth: number
  destroyed: boolean
  /** Called by the prop component when it needs to trigger an explosion (explosive tag) */
  onExplode?: (position: [number, number, number], radius: number, force: number) => void
}

// Global registry — props register/unregister on mount/unmount
const propRegistry = new Map<string, PropInstance>()

export function registerProp(prop: PropInstance) {
  propRegistry.set(prop.id, prop)
}

export function unregisterProp(id: string) {
  propRegistry.delete(id)
}

export function getProp(id: string): PropInstance | undefined {
  return propRegistry.get(id)
}

export function getAllProps(): Map<string, PropInstance> {
  return propRegistry
}

/**
 * Deal damage to all props in blast radius.
 * Returns list of props that were destroyed (for chain reaction processing).
 */
export function damagePropsInRadius(
  center: [number, number, number],
  radius: number,
  damage: number,
): PropInstance[] {
  const destroyed: PropInstance[] = []

  for (const [, prop] of propRegistry) {
    if (prop.destroyed) continue
    const dx = prop.position[0] - center[0]
    const dy = prop.position[1] - center[1]
    const dz = prop.position[2] - center[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < radius) {
      const force = (radius - dist) / radius
      const dmg = Math.round(damage * force)
      prop.health -= dmg

      if (prop.health <= 0) {
        prop.health = 0
        prop.destroyed = true
        destroyed.push(prop)
      }
    }
  }

  return destroyed
}
