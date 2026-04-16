/**
 * SettingsSheet — settings + "Save your progress" upgrade CTA.
 *
 * Production Sprint 3. Adds the anonymous-to-authenticated upgrade flow:
 *   - Guest shows a gold "SAVE YOUR PROGRESS" primary action + email input.
 *   - Authenticated shows email + "SIGN OUT" secondary.
 *   - Google SSO is the primary path; email magic-link is secondary.
 *
 * No account is ever required to play. Per user_privacy rules we never
 * handle passwords — OAuth + magic-link only.
 */
import { useState, useEffect, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import {
  onIdentityChange,
  upgradeWithGoogle,
  upgradeWithEmail,
  signOut,
  isSupabaseEnabled,
  type UserIdentity,
} from '@api/user'
import { flushSync } from '@api/sync'
import * as sfx from '@audio/sfx'
import '@styles/game-ui.css'
import '@styles/camp-ui.css'

const VERSION = '0.3.0'

export function SettingsSheet() {
  const settingsOpen = useSceneStore((s) => s.settingsOpen)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)
  const muted = useCampStore((s) => s.muted)
  const setMuted = useCampStore((s) => s.setMuted)

  const [identity, setIdentity] = useState<UserIdentity | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [upgradeMsg, setUpgradeMsg] = useState<{ kind: 'ok' | 'err' | 'sent'; text: string } | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => onIdentityChange(setIdentity), [])

  const handleGoogle = useCallback(async () => {
    setUpgrading(true)
    setUpgradeMsg(null)
    sfx.buttonTap()
    const result = await upgradeWithGoogle()
    setUpgrading(false)
    if (!result.success) {
      if (result.collision) {
        setUpgradeMsg({ kind: 'err', text: 'That Google account is already linked to another camp. Sign out and sign in instead to switch.' })
      } else {
        setUpgradeMsg({ kind: 'err', text: result.error ?? 'Sign-in failed. Try again.' })
      }
    }
    // On success the OAuth redirect handles the rest.
  }, [])

  const handleEmail = useCallback(async () => {
    if (!emailInput.trim()) return
    setUpgrading(true)
    setUpgradeMsg(null)
    sfx.buttonTap()
    const result = await upgradeWithEmail(emailInput.trim())
    setUpgrading(false)
    if (result.success) {
      setUpgradeMsg({ kind: 'sent', text: `Check ${emailInput.trim()} for a confirmation link.` })
      setShowEmailForm(false)
      setEmailInput('')
    } else if (result.collision) {
      setUpgradeMsg({ kind: 'err', text: 'That email is already registered. Sign out and sign in instead.' })
    } else {
      setUpgradeMsg({ kind: 'err', text: result.error ?? 'Could not send confirmation.' })
    }
  }, [emailInput])

  const handleSignOut = useCallback(async () => {
    sfx.buttonTap()
    // Flush any pending writes before we lose the session.
    await flushSync()
    await signOut()
    setSettingsOpen(false)
  }, [setSettingsOpen])

  if (!settingsOpen) return null

  const canUpgrade = isSupabaseEnabled()
  const isGuest = canUpgrade && identity?.isAnonymous
  const isUpgraded = canUpgrade && identity !== null && !identity.isAnonymous

  return (
    <div
      className="game-sheet-backdrop"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="game-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-sheet-header">
          <span className="game-sheet-title">SETTINGS</span>
        </div>

        <div className="game-sheet-body">

          {/* Account block — top priority CTA for guests */}
          {canUpgrade && (
            <div className="settings-account-block">
              {isGuest && (
                <>
                  <div className="settings-account-label">ACCOUNT</div>
                  <div className="settings-account-pill settings-account-pill--guest">
                    GUEST — progress saved to this device only
                  </div>
                  <button
                    className="game-btn settings-upgrade-btn"
                    onClick={handleGoogle}
                    disabled={upgrading}
                  >
                    {upgrading ? 'CONNECTING...' : 'SAVE YOUR PROGRESS — GOOGLE'}
                  </button>
                  {!showEmailForm && (
                    <button
                      className="settings-upgrade-alt"
                      onClick={() => setShowEmailForm(true)}
                    >
                      or use email
                    </button>
                  )}
                  {showEmailForm && (
                    <div className="settings-email-form">
                      <input
                        type="email"
                        className="settings-email-input"
                        placeholder="you@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        autoComplete="email"
                      />
                      <button
                        className="game-btn game-btn-sm"
                        onClick={handleEmail}
                        disabled={upgrading || !emailInput.trim()}
                      >
                        {upgrading ? 'SENDING...' : 'SEND LINK'}
                      </button>
                    </div>
                  )}
                  {upgradeMsg && (
                    <div className={`settings-upgrade-msg settings-upgrade-msg--${upgradeMsg.kind}`}>
                      {upgradeMsg.text}
                    </div>
                  )}
                </>
              )}

              {isUpgraded && (
                <>
                  <div className="settings-account-label">ACCOUNT</div>
                  <div className="settings-account-pill settings-account-pill--auth">
                    {identity?.email ?? 'Signed in'}
                  </div>
                  <button
                    className="game-btn game-btn-sm settings-signout-btn"
                    onClick={handleSignOut}
                  >
                    SIGN OUT
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mute toggle */}
          <label className="game-toggle-row">
            <span>Sound</span>
            <button
              className="game-btn game-btn-sm"
              onClick={() => setMuted(!muted)}
            >
              {muted ? 'OFF' : 'ON'}
            </button>
          </label>

          {/* Legal links */}
          <div className="settings-legal-row">
            <a href="/privacy" className="settings-legal-link">Privacy</a>
            <span className="settings-legal-sep">·</span>
            <a href="/terms" className="settings-legal-link">Terms</a>
            <span className="settings-legal-sep">·</span>
            <a href="/refund" className="settings-legal-link">Refunds</a>
          </div>

          {/* Version */}
          <div className="game-version">
            v{VERSION}
          </div>
        </div>
      </div>
    </div>
  )
}
