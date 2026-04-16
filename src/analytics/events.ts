/**
 * analytics/events — typed event definitions + track() helper.
 *
 * Production Sprint 2 — minimum-viable telemetry floor. Ten events chosen
 * to answer "is the economy working" after Sprint 3 launches:
 *   boot, tutorial_complete, training_start, training_complete,
 *   weapon_manual_purchase, battle_start, battle_complete,
 *   daily_claimed, store_opened, pack_viewed, pack_clicked.
 *
 * The transport layer (PostHog + Sentry) lives in `./telemetry.ts`. This
 * file is pure event definitions + a thin dispatcher. Tests can mock
 * `track()` without touching network code.
 *
 * See production-plan.md, Subsystem 2.6.
 */

import { postHogCapture } from './telemetry'

// ── Typed event map ────────────────────────────────────────────────────
// Every event is declared here with its prop shape. The compiler enforces
// that callers pass the right props. Adding new events: add to EventMap.

export interface EventMap {
  boot: { userId: string }
  tutorial_complete: Record<string, never>
  training_start: {
    weapon: string
    packageId: string
    durationSec: number
    trainingCost: number
    manualFee: number
    totalCost: number
    soldierId: string
  }
  training_complete: {
    weapon: string
    durationSec: number
    fitness: number
    generations: number
    soldierId: string
  }
  weapon_manual_purchase: {
    weapon: string
    cost: number
    soldierId: string
  }
  battle_start: { battleId: string }
  battle_complete: {
    battleId: string
    stars: number
    reward: number
  }
  daily_claimed: { tokens: number }
  store_opened: Record<string, never>
  pack_viewed: { packId: string }
  pack_clicked: { packId: string; price: string; tokens: number }
}

export type EventName = keyof EventMap

/**
 * Fire a telemetry event. No-op when PostHog is not configured (no env key).
 * Typed: props must match the declared shape for the given event name.
 */
export function track<E extends EventName>(event: E, props: EventMap[E]): void {
  postHogCapture(event, props as Record<string, unknown>)
}
