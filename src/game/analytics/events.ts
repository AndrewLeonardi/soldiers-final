/**
 * Typed event emitter for game-concept analytics.
 *
 * Wired in from day one per plan.md: every meaningful player action
 * fires a typed event through `track()`. In Phase 1b this is a no-op
 * with an in-memory dev ring buffer (capped at 500 entries, exposed on
 * `window.__events` for inspection during development). Production
 * telemetry pipe lands when Phase 8 retention measurement starts —
 * swapping the sink without touching every call site.
 *
 * The point of shipping this now is that Phase 3/4/5 event wiring
 * becomes free: `track('brush_selected', { kind: 'wall' })` exists
 * today, so by the time we need actual numbers, they're already in
 * the call sites and we only have to swap the transport.
 *
 * Discipline: no `console.log`, no network calls, no PII, no
 * unbounded storage. Just a typed no-op with a dev inspection hook.
 */
import type { BuildingKind } from '@game/buildings/types'
import type { WeaponType } from '@config/types'

// ── Event catalog (append-only) ──────────────────────────
//
// Adding an event: add a new entry to EventMap with the exact payload
// shape. TypeScript enforces at every call site. Removing an event is
// a breaking change — don't do it casually.

export interface EventMap {
  // ── Base editor mode ──
  base_mode_toggled: { to: 'view' | 'build' }

  // ── Brush lifecycle ──
  base_brush_selected: { kind: BuildingKind | 'wall' }
  base_brush_cleared: Record<string, never>
  base_brush_rotated: { rotation: number }

  // ── Placement outcomes ──
  base_building_placed: { kind: BuildingKind; x: number; z: number }
  base_building_place_rejected: { kind: BuildingKind; x: number; z: number }
  base_wall_placed: { x: number; z: number }
  base_wall_place_rejected: { x: number; z: number }

  // ── Dev-only actions ──
  base_reset_to_starter: Record<string, never>

  // ── Training lifecycle (Phase 3a) ──
  //
  // Fired by `@game/stores/trainingStore` on every mutation. These
  // events are the observability surface for the entire Phase 3+
  // training funnel: who started observing, who started a training
  // run, what speed they watched it at, how many generations it took
  // to graduate, whether they actually saved the result to the roster.
  // When Phase 8 retention measurement lands, these are the events
  // that answer "did players actually feel the training moment land?"
  training_slot_seeded: { slotId: string; soldierId: string; weapon: WeaponType }
  training_slot_configured: { slotId: string; soldierId: string; weapon: WeaponType }
  training_deployed: { slotId: string; soldierId: string; weapon: WeaponType; computeCost: number }
  training_observe_started: { slotId: string; soldierId: string; weapon: WeaponType }
  training_observe_stopped: { slotId: string }
  training_run_started: { slotId: string; weapon: WeaponType; seeded: boolean }
  training_speed_changed: { slotId: string; speed: 1 | 10 | 50 }
  training_generation_evolved: { slotId: string; generation: number; bestFitness: number }
  training_graduated: { slotId: string; weapon: WeaponType; generation: number; bestFitness: number }
  training_committed_to_roster: { slotId: string; soldierId: string; weapon: WeaponType; bestFitness: number }
}

export type GameEvent = keyof EventMap

// ── Dev ring buffer ──────────────────────────────────────

interface LoggedEvent {
  t: number
  event: GameEvent
  data: EventMap[GameEvent]
}

const DEV_LOG_CAP = 500
const devLog: LoggedEvent[] = []

declare global {
  interface Window {
    /**
     * Dev-only inspection hook. Populated with the last N game events
     * when `import.meta.env.DEV` is true. Do NOT rely on this in
     * runtime code — it's a debugging affordance, not an API.
     */
    __events?: ReadonlyArray<LoggedEvent>
  }
}

// ── Public API ───────────────────────────────────────────

/**
 * Emit a typed game event. No-op in production for now. Call sites
 * provide compile-time-checked payloads via the `EventMap` type.
 */
export function track<K extends GameEvent>(event: K, data: EventMap[K]): void {
  if (import.meta.env.DEV) {
    devLog.push({ t: Date.now(), event, data })
    if (devLog.length > DEV_LOG_CAP) {
      devLog.shift()
    }
    if (typeof window !== 'undefined') {
      window.__events = devLog
    }
  }
  // Production analytics sink lands here in Phase 8 — a single swap
  // point so we don't have to touch every call site.
}

/**
 * Dev-only: read the in-memory event log. Returns an empty array in
 * production. Used by future debug overlays or test harnesses.
 */
export function readDevEventLog(): ReadonlyArray<LoggedEvent> {
  if (!import.meta.env.DEV) return []
  return devLog
}
