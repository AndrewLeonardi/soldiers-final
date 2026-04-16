/**
 * TokenCounter — token currency hero with flat-daily strip and wallet popup.
 *
 * v14 (Production Sprint 2): streak retired. The daily strip shows a fixed
 * +N reward (DAILY_GRANT) and a Nh Nm countdown. Wallet popup shows balance
 * and next-daily info only.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { TokenIcon } from './TokenIcon'
import { DAILY_GRANT } from '@config/store'
import * as sfx from '@audio/sfx'

interface TokenCounterProps {
  hasUnclaimedDaily?: boolean
}

export function TokenCounter({ hasUnclaimedDaily }: TokenCounterProps) {
  const tokens = useCampStore((s) => s.tokens)
  const lastDailyClaimMs = useCampStore((s) => s.lastDailyClaimMs)
  const msUntilNextDaily = useCampStore((s) => s.msUntilNextDaily)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setDailyRewardOpen = useSceneStore((s) => s.setDailyRewardOpen)

  // Visual honesty (Sprint 2.5): during active training runs, the counter
  // displays the actual balance PLUS the unburned portion of committed
  // tokens — so it ticks down 1/sec in sync with the training timer.
  // The real balance dropped at commit time; this overlay is cosmetic proof
  // of the 1 token = 1 second rate. See production-plan.md Subsystem 2.5.
  const slots = useCampTrainingStore((s) => s.slots)
  let visualBurnPending = 0
  for (const slot of slots) {
    if (slot.trainingPhase === 'running' || slot.trainingPhase === 'ceremony-start') {
      visualBurnPending += Math.max(0, slot.tokenTotal - slot.tokenBurned)
    }
  }
  const displayTokens = tokens + Math.round(visualBurnPending)
  const isBurning = visualBurnPending > 0.01

  const [walletOpen, setWalletOpen] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [displayValue, setDisplayValue] = useState(displayTokens)
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

  // Tween token value when it changes. When training is burning tokens
  // visually, we skip the easing and follow the displayTokens directly
  // (the taxi-meter drop should feel immediate and linear, not easy-out).
  useEffect(() => {
    if (isBurning) {
      setDisplayValue(displayTokens)
      return
    }
    if (displayValue === displayTokens) return
    const start = displayValue
    const delta = displayTokens - start
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
  }, [displayTokens, isBurning])

  // Countdown timer (polls msUntilNextDaily every minute)
  useEffect(() => {
    const update = () => {
      const remaining = msUntilNextDaily()
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
  }, [lastDailyClaimMs, msUntilNextDaily])

  return (
    <div className="token-counter-wrapper token-counter-wrapper--hero" ref={wrapperRef}>
      <div
        className={`token-hero${hasUnclaimedDaily ? ' token-hero--unclaimed' : ''}${isBurning ? ' token-hero--burning' : ''}`}
        onClick={handleTap}
      >
        <div className="token-hero-icon-wrap">
          <TokenIcon size={26} />
        </div>
        <div className="token-hero-body">
          <div className="token-hero-value">{displayValue}</div>
          <div className="token-hero-label">{isBurning ? 'TRAINING' : 'TOKENS'}</div>
        </div>
        <button
          className="token-hero-plus"
          onClick={(e) => { e.stopPropagation(); handlePlus() }}
          aria-label="Get more tokens"
        >
          +
        </button>
      </div>

      {/* Daily strip below hero — flat grant, no streak */}
      <div
        className={`token-daily-strip${hasUnclaimedDaily ? ' token-daily-strip--unclaimed' : ''}`}
        onClick={handleDailyTap}
      >
        <span className="token-daily-strip-label">DAILY</span>
        <span className="token-daily-strip-value">
          {hasUnclaimedDaily ? `CLAIM +${DAILY_GRANT}` : `+${DAILY_GRANT} in ${countdown}`}
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
            <span className="token-wallet-value">+{DAILY_GRANT} in {countdown}</span>
          </div>
          <div className="token-wallet-row">
            <span className="token-wallet-label">RATE</span>
            <span className="token-wallet-value">1 TOKEN = 1 SECOND</span>
          </div>
          <button className="game-btn token-wallet-buy" onClick={handlePlus}>
            GET MORE
          </button>
        </div>
      )}
    </div>
  )
}
