/**
 * TokenCounter — token currency hero + inline daily pill + wallet popup.
 *
 * Token-design sprint: swap to new TokenChip, promote the value typography,
 * collapse the daily strip into an inline pill next to the value. Wallet
 * tooltip drops the "RATE: 1 TOKEN = 1 SECOND" line (currency conversion
 * copy belongs on the training-commit side only).
 *
 * The Sprint 2 visual honesty (1 Hz counter burn during training) is
 * preserved: the displayed value includes `unburned` tokens for any
 * running training slot, so the counter ticks down in sync with the ring.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { TokenChip } from './TokenChip'
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

  // Sprint 2 visual honesty — see TokenChip + training-tick comment.
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

  const handlePlus = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setStoreSheetOpen(true)
    setWalletOpen(false)
  }, [setStoreSheetOpen])

  const handleDailyTap = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    sfx.buttonTap()
    setDailyRewardOpen(true)
  }, [setDailyRewardOpen])

  // Click-outside dismisses wallet
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

  // Value tween — follows displayTokens, linear during burn, eased otherwise.
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

  // Countdown timer for the non-claimable state
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
          <TokenChip size={44} glow />
        </div>
        <div className="token-hero-body">
          <div className="token-hero-value">{displayValue.toLocaleString()}</div>
          <div className="token-hero-label">{isBurning ? 'TRAINING' : 'TOKENS'}</div>
        </div>

        {/* Daily pill — inline with the value row. Replaces the
            old stacked strip. Shows as a claim pill when available,
            collapses to a quiet countdown otherwise. */}
        <button
          className={`token-daily-inline${hasUnclaimedDaily ? ' token-daily-inline--claim' : ''}`}
          onClick={handleDailyTap}
          aria-label={hasUnclaimedDaily ? 'Claim daily reward' : 'Next daily countdown'}
        >
          {hasUnclaimedDaily
            ? <>+{DAILY_GRANT}</>
            : <>{countdown}</>}
        </button>

        <button
          className="token-hero-plus"
          onClick={handlePlus}
          aria-label="Get more tokens"
        >
          +
        </button>
      </div>

      {walletOpen && (
        <div className="token-wallet">
          <div className="token-wallet-row">
            <span className="token-wallet-label">BALANCE</span>
            <span className="token-wallet-value"><TokenChip size={16} /> {tokens.toLocaleString()}</span>
          </div>
          <div className="token-wallet-row">
            <span className="token-wallet-label">NEXT DAILY</span>
            <span className="token-wallet-value">+{DAILY_GRANT} in {countdown}</span>
          </div>
          <button className="game-btn token-wallet-buy" onClick={handlePlus}>
            GET MORE
          </button>
        </div>
      )}
    </div>
  )
}
