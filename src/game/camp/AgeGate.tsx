/**
 * AgeGate — one-time "are you 13 or older?" confirm at first Stripe entry.
 *
 * Production Sprint 3.7. COPPA-safe: we never collect data from anyone
 * who clicks "No", and the Store button is disabled for that session.
 * Remembered permanently in localStorage once confirmed.
 *
 * Triggered by `ensureAgeConfirmed()` which the StoreSheet calls before
 * opening any pack flow. Resolves once the user confirms (or never, if
 * they bail).
 */

import { useCallback, useEffect, useState } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const AGE_CONFIRMED_KEY = 'toy-soldiers-age-confirmed'

export function hasAgeConfirmed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(AGE_CONFIRMED_KEY) === '1'
}
export function setAgeConfirmed(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AGE_CONFIRMED_KEY, '1')
}

// Promise-based gate. StoreSheet awaits this before opening checkout.
let _pendingResolver: ((confirmed: boolean) => void) | null = null
let _openSignal = { open: false, tick: 0 }
const _listeners = new Set<() => void>()

function notify(): void {
  for (const l of _listeners) l()
}

export function ensureAgeConfirmed(): Promise<boolean> {
  if (hasAgeConfirmed()) return Promise.resolve(true)
  return new Promise((resolve) => {
    _pendingResolver = resolve
    _openSignal = { open: true, tick: _openSignal.tick + 1 }
    notify()
  })
}

export function AgeGateModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const update = () => setOpen(_openSignal.open)
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])

  const confirmYes = useCallback(() => {
    sfx.buttonTap()
    setAgeConfirmed()
    _openSignal = { open: false, tick: _openSignal.tick + 1 }
    notify()
    _pendingResolver?.(true)
    _pendingResolver = null
  }, [])

  const confirmNo = useCallback(() => {
    sfx.buttonTap()
    _openSignal = { open: false, tick: _openSignal.tick + 1 }
    notify()
    _pendingResolver?.(false)
    _pendingResolver = null
    // Close the store too — no purchases for under-13s.
    useSceneStore.getState().setStoreSheetOpen(false)
  }, [])

  if (!open) return null

  return (
    <div className="age-gate-backdrop">
      <div className="age-gate-card">
        <div className="age-gate-title">BEFORE YOU BUY</div>
        <div className="age-gate-body">
          Are you 13 years of age or older?
        </div>
        <div className="age-gate-buttons">
          <button className="game-btn age-gate-yes" onClick={confirmYes}>YES</button>
          <button className="game-btn game-btn-sm age-gate-no" onClick={confirmNo}>NO</button>
        </div>
        <div className="age-gate-footnote">
          We ask this to comply with children's online privacy laws (COPPA, GDPR-K).
        </div>
      </div>
    </div>
  )
}
