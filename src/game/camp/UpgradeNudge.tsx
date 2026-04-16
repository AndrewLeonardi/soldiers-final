/**
 * UpgradeNudge — single non-blocking bottom-sheet offering account upgrade.
 *
 * Production Sprint 3. Shows exactly once in a user's lifetime, after
 * whichever comes first of:
 *   • first trained soldier
 *   • first battle win
 *   • first purchase
 *
 * Dismissal is permanent (via localStorage). Non-blocking: "Maybe later"
 * dismisses and the user proceeds. This is the ONLY nudge we surface
 * outside Settings. Per Andrew: no account wall, ever.
 */

import { useEffect, useState, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { onIdentityChange, isSupabaseEnabled, type UserIdentity } from '@api/user'
import { useSceneStore } from '@stores/sceneStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const NUDGE_DISMISSED_KEY = 'toy-soldiers-upgrade-nudge-dismissed'

function isDismissed(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(NUDGE_DISMISSED_KEY) === '1'
}
function markDismissed(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(NUDGE_DISMISSED_KEY, '1')
}

export function UpgradeNudge() {
  const soldiers = useCampStore((s) => s.soldiers)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)

  const [identity, setIdentity] = useState<UserIdentity | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => onIdentityChange(setIdentity), [])

  // Trigger check: any trained soldier or any battle cleared.
  const trainedCount = soldiers.filter(s => s.trained).length
  const battlesWon = Object.keys(battlesCompleted).length
  const milestone = trainedCount > 0 || battlesWon > 0

  useEffect(() => {
    if (!isSupabaseEnabled()) return
    if (!identity?.isAnonymous) return
    if (!milestone) return
    if (isDismissed()) return

    // Short delay so the nudge doesn't clobber the moment (e.g. the
    // graduation ceremony). 2.5 seconds is enough for the spectacle
    // to land first.
    const timer = setTimeout(() => setOpen(true), 2500)
    return () => clearTimeout(timer)
  }, [identity, milestone])

  const handleDismiss = useCallback(() => {
    markDismissed()
    setOpen(false)
  }, [])

  const handleOpenSettings = useCallback(() => {
    markDismissed()
    setOpen(false)
    sfx.buttonTap()
    setSettingsOpen(true)
  }, [setSettingsOpen])

  if (!open) return null

  return (
    <div className="upgrade-nudge-backdrop" onClick={handleDismiss}>
      <div className="upgrade-nudge-card" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-nudge-title">NICE WORK</div>
        <div className="upgrade-nudge-body">
          Save your camp to the cloud so it follows you between devices.
          Takes 10 seconds.
        </div>
        <div className="upgrade-nudge-buttons">
          <button
            className="game-btn upgrade-nudge-primary"
            onClick={handleOpenSettings}
          >
            SAVE PROGRESS
          </button>
          <button
            className="upgrade-nudge-secondary"
            onClick={handleDismiss}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
