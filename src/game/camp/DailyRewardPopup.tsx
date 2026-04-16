/**
 * DailyRewardPopup — flat daily grant, one tap, one reward.
 *
 * v14 (Production Sprint 2): streak retired. Shows a single card with
 * the flat DAILY_GRANT amount and a COLLECT button. No 7-day strip, no
 * streak badge, no escalation. Players who come back every day get the
 * same amount; players who skip a day lose nothing beyond the missed
 * grant itself.
 */
import { useState, useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { DAILY_GRANT } from '@config/store'
import { TokenIcon } from './TokenIcon'
import { track } from '@analytics/events'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

interface DailyRewardPopupProps {
  onClose: () => void
}

export function DailyRewardPopup({ onClose }: DailyRewardPopupProps) {
  const claimDaily = useCampStore((s) => s.claimDaily)
  const [claimed, setClaimed] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null)

  const handleClaim = useCallback(() => {
    const result = claimDaily()
    if (!result) return
    setClaimed(true)
    setClaimedAmount(result.tokens)
    sfx.recruitChime()
    track('daily_claimed', { tokens: result.tokens })
    setTimeout(onClose, 1500)
  }, [claimDaily, onClose])

  return (
    <div className="daily-reward-backdrop" onClick={onClose}>
      <div className="daily-reward-card" onClick={(e) => e.stopPropagation()}>
        <button className="daily-reward-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="daily-reward-title">DAILY REWARD</h2>
        <p className="daily-reward-streak">A FULL DAY OF TRAINING ON THE HOUSE</p>

        {/* Single hero tile */}
        <div className="daily-reward-hero">
          <div className={`daily-reward-day current${claimed ? ' just-claimed' : ''}`}>
            <span className="daily-reward-day-amount daily-reward-day-amount--hero">
              <TokenIcon size={28} /> {DAILY_GRANT}
            </span>
            <span className="daily-reward-day-sub">= {DAILY_GRANT} SECONDS</span>
          </div>
        </div>

        {/* Claim button or claimed state */}
        {!claimed ? (
          <button className="game-btn daily-reward-claim-btn" onClick={handleClaim}>
            COLLECT {DAILY_GRANT} TOKENS
          </button>
        ) : (
          <div className="daily-reward-collected">
            <span className="daily-reward-collected-amount">
              +{claimedAmount} <TokenIcon size={16} />
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
