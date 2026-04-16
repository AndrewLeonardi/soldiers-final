/**
 * WelcomeRewardPopup — first-boot welcome using the DailyReward design.
 *
 * Shown once per profile on a truly fresh install (v15 migration
 * grandfathers existing players as already-welcomed). Reuses the
 * `daily-reward-*` CSS classes so the visual language is identical.
 *
 * On dismiss, `setWelcomeShown()` is called so this never reappears.
 * The tutorial auto-start in CampPage waits for this flag so we don't
 * stack modals on first boot.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { DAILY_GRANT } from '@config/store'
import { TokenChip } from './TokenChip'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

interface Props {
  onClose: () => void
}

export function WelcomeRewardPopup({ onClose }: Props) {
  const setWelcomeShown = useCampStore((s) => s.setWelcomeShown)
  const starterTokens = useCampStore((s) => s.tokens)

  const handleClaim = useCallback(() => {
    sfx.recruitChime()
    setWelcomeShown()
    onClose()
  }, [setWelcomeShown, onClose])

  const handleDismiss = useCallback(() => {
    setWelcomeShown()
    onClose()
  }, [setWelcomeShown, onClose])

  return (
    <div className="daily-reward-backdrop" onClick={handleDismiss}>
      <div className="daily-reward-card" onClick={(e) => e.stopPropagation()}>
        <button className="daily-reward-close" onClick={handleDismiss} aria-label="Close">×</button>
        <h2 className="daily-reward-title">WELCOME</h2>
        <p className="daily-reward-streak">HERE ARE YOUR STARTER TOKENS</p>

        {/* Hero tile — starter amount */}
        <div className="daily-reward-hero">
          <div className="daily-reward-day current">
            <span className="daily-reward-day-amount daily-reward-day-amount--hero">
              <TokenChip size={48} glow /> {starterTokens}
            </span>
          </div>
        </div>

        <p className="welcome-reward-subnote">
          You'll earn <strong>{DAILY_GRANT} free tokens</strong> every 24 hours,
          plus rewards for battles won.
        </p>

        <button className="game-btn daily-reward-claim-btn" onClick={handleClaim}>
          LET'S GO
        </button>
      </div>
    </div>
  )
}
