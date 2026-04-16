/**
 * TokenCounter — token currency hero with daily strip and wallet popup.
 *
 * Sprint B+ redesign: hero treatment with prominent label, large value,
 * golden cyan icon ring, and pulsing daily strip below.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { TokenIcon } from './TokenIcon'
import { DAILY_STREAK_REWARDS } from '@config/store'
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
  const [displayValue, setDisplayValue] = useState(tokens)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Next daily reward amount (cycles 1→7)
  const nextDay = (dailyStreak % 7) + 1
  const nextReward = DAILY_STREAK_REWARDS[nextDay - 1]?.tokens ?? 30

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

  // Tween token value when it changes
  useEffect(() => {
    if (displayValue === tokens) return
    const start = displayValue
    const delta = tokens - start
    const duration = 400
    const startTime = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayValue(Math.round(start + delta * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens])

  // Countdown timer (always running)
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
    <div className="token-counter-wrapper token-counter-wrapper--hero" ref={wrapperRef}>
      <div
        className={`token-hero${hasUnclaimedDaily ? ' token-hero--unclaimed' : ''}`}
        onClick={handleTap}
      >
        <div className="token-hero-icon-wrap">
          <TokenIcon size={26} />
        </div>
        <div className="token-hero-body">
          <div className="token-hero-value">{displayValue}</div>
          <div className="token-hero-label">TOKENS</div>
        </div>
        <button
          className="token-hero-plus"
          onClick={(e) => { e.stopPropagation(); handlePlus() }}
          aria-label="Get more tokens"
        >
          +
        </button>
      </div>

      {/* Daily strip below hero */}
      <div
        className={`token-daily-strip${hasUnclaimedDaily ? ' token-daily-strip--unclaimed' : ''}`}
        onClick={handleDailyTap}
      >
        <span className="token-daily-strip-label">DAILY</span>
        <span className="token-daily-strip-value">
          {hasUnclaimedDaily ? `CLAIM +${nextReward}` : `+${nextReward} in ${countdown}`}
        </span>
      </div>

      {walletOpen && (
        <div className="token-wallet">
          <div className="token-wallet-row">
            <span className="token-wallet-label">BALANCE</span>
            <span className="token-wallet-value"><TokenIcon size={14} /> {tokens}</span>
          </div>
          <div className="token-wallet-row">
            <span className="token-wallet-label">NEXT DAILY</span>
            <span className="token-wallet-value">+{nextReward} in {countdown}</span>
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
