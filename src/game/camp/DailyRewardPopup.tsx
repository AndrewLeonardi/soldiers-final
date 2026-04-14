/**
 * DailyRewardPopup — full-screen 7-day streak reward popup.
 *
 * Sprint Economy. Appears on camp load when daily reward is unclaimed.
 * Game-feel: particles, sound, bouncy animations, streak calendar.
 */
import { useState, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { DAILY_STREAK_REWARDS } from '@config/store'
import { TokenIcon } from './TokenIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

interface DailyRewardPopupProps {
  onClose: () => void
}

export function DailyRewardPopup({ onClose }: DailyRewardPopupProps) {
  const claimDailyReward = useCampStore((s) => s.claimDailyReward)
  const dailyStreak = useCampStore((s) => s.dailyStreak)

  const [claimed, setClaimed] = useState(false)
  const [claimedReward, setClaimedReward] = useState<{ tokens: number; streakDay: number } | null>(null)

  // Next streak day (what will be claimed)
  const nextDay = (dailyStreak % 7) + 1

  const handleClaim = useCallback(() => {
    const result = claimDailyReward()
    if (!result) return

    setClaimed(true)
    setClaimedReward(result)

    // Sound: fanfare for jackpot, chime for normal
    if (result.streakDay === 7) {
      sfx.graduationFanfare()
    } else {
      sfx.recruitChime()
    }

    // Auto-dismiss after animation
    setTimeout(onClose, 2000)
  }, [claimDailyReward, onClose])

  return (
    <div className="daily-reward-backdrop">
      <div className="daily-reward-card">
        <h2 className="daily-reward-title">DAILY REWARD</h2>
        <p className="daily-reward-streak">DAY {nextDay} OF 7</p>

        {/* 7-day grid */}
        <div className="daily-reward-grid">
          {DAILY_STREAK_REWARDS.map((reward) => {
            const isPast = reward.day < nextDay
            const isCurrent = reward.day === nextDay
            const isFuture = reward.day > nextDay
            const justClaimed = claimed && isCurrent

            return (
              <div
                key={reward.day}
                className={[
                  'daily-reward-day',
                  isPast ? 'claimed' : '',
                  isCurrent ? 'current' : '',
                  isFuture ? 'future' : '',
                  justClaimed ? 'just-claimed' : '',
                  reward.isJackpot ? 'jackpot' : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="daily-reward-day-num">
                  {isPast ? '\u2713' : `D${reward.day}`}
                </span>
                <span className="daily-reward-day-amount">
                  <TokenIcon size={12} /> {reward.tokens}
                </span>
                {reward.isJackpot && (
                  <span className="daily-reward-jackpot-label">JACKPOT</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Claim button or claimed state */}
        {!claimed ? (
          <button className="game-btn daily-reward-claim-btn" onClick={handleClaim}>
            COLLECT DAY {nextDay}
          </button>
        ) : (
          <div className="daily-reward-collected">
            <span className="daily-reward-collected-amount">
              +{claimedReward?.tokens} <TokenIcon size={16} />
            </span>
            {/* Particle burst */}
            <div className="daily-reward-particles">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="daily-reward-particle"
                  style={{
                    '--particle-angle': `${(i / 10) * 360}deg`,
                    '--particle-delay': `${i * 0.05}s`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
