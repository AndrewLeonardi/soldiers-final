/**
 * TokenCounter — token currency pill with daily timer and wallet popup.
 *
 * Sprint 4 polish. Shows daily countdown/CLAIM directly below the pill.
 * Tapping the timer opens the daily reward popup.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { TokenIcon } from './TokenIcon'
import { CurrencyPill } from './CurrencyPill'
import * as sfx from '@audio/sfx'

interface TokenCounterProps {
  hasUnclaimedDaily?: boolean
}

export function TokenCounter({ hasUnclaimedDaily }: TokenCounterProps) {
  const tokens = useCampStore((s) => s.tokens)
  const dailyStreak = useCampStore((s) => s.dailyStreak)
  const lastDailyClaimDate = useCampStore((s) => s.lastDailyClaimDate)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setDailyRewardOpen = useSceneStore((s) => s.setDailyRewardOpen)

  const [walletOpen, setWalletOpen] = useState(false)
  const [countdown, setCountdown] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleTap = useCallback(() => {
    sfx.buttonTap()
    setWalletOpen(prev => !prev)
  }, [])

  const handlePlus = useCallback(() => {
    setStoreSheetOpen(true)
    setWalletOpen(false)
  }, [setStoreSheetOpen])

  const handleDailyTap = useCallback(() => {
    sfx.buttonTap()
    setDailyRewardOpen(true)
  }, [setDailyRewardOpen])

  // Click-outside to dismiss
  useEffect(() => {
    if (!walletOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setWalletOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [walletOpen])

  // Countdown timer (always running, not just when wallet is open)
  useEffect(() => {
    const update = () => {
      if (!lastDailyClaimDate) {
        setCountdown('NOW')
        return
      }
      const claimDate = new Date(lastDailyClaimDate)
      const nextClaim = new Date(claimDate)
      nextClaim.setDate(nextClaim.getDate() + 1)
      const remaining = nextClaim.getTime() - Date.now()
      if (remaining <= 0) {
        setCountdown('NOW')
        return
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      setCountdown(`${hours}h ${minutes}m`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [lastDailyClaimDate])

  return (
    <div className="token-counter-wrapper" ref={wrapperRef}>
      <CurrencyPill
        icon={<TokenIcon size={16} className="token-counter-icon" />}
        value={tokens}
        color="#00e5ff"
        onPlusClick={handlePlus}
        onTap={handleTap}
      />

      {/* Daily timer below pill */}
      <div
        className={`token-daily-timer ${hasUnclaimedDaily ? 'unclaimed' : ''}`}
        onClick={handleDailyTap}
      >
        {hasUnclaimedDaily ? 'CLAIM!' : countdown}
      </div>

      {walletOpen && (
        <div className="token-wallet">
          <div className="token-wallet-row">
            <span className="token-wallet-label">BALANCE</span>
            <span className="token-wallet-value"><TokenIcon size={14} /> {tokens}</span>
          </div>
          <div className="token-wallet-row">
            <span className="token-wallet-label">NEXT DAILY</span>
            <span className="token-wallet-value">{countdown}</span>
          </div>
          <div className="token-wallet-row">
            <span className="token-wallet-label">STREAK</span>
            <span className="token-wallet-value">DAY {dailyStreak} / 7</span>
          </div>
          <button className="game-btn token-wallet-buy" onClick={handlePlus}>
            GET MORE
          </button>
        </div>
      )}
    </div>
  )
}
