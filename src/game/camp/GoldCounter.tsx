/**
 * GoldCounter — gold currency pill with expandable wallet popup.
 *
 * Sprint Economy. Tap to see balance + GET MORE button.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { GoldCoinIcon } from './GoldCoinIcon'
import { CurrencyPill } from './CurrencyPill'
import * as sfx from '@audio/sfx'

export function GoldCounter() {
  const gold = useCampStore((s) => s.gold)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)

  const [walletOpen, setWalletOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleTap = useCallback(() => {
    sfx.buttonTap()
    setWalletOpen(prev => !prev)
  }, [])

  const handlePlus = useCallback(() => {
    setStoreSheetOpen(true)
    setWalletOpen(false)
  }, [setStoreSheetOpen])

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

  return (
    <div className="gold-counter-wrapper" ref={wrapperRef}>
      <CurrencyPill
        icon={<GoldCoinIcon size={16} className="gold-counter-icon" />}
        value={gold}
        color="#FFD700"
        onPlusClick={handlePlus}
        onTap={handleTap}
        className="gold-pill"
      />

      {walletOpen && (
        <div className="gold-wallet">
          <div className="compute-wallet-row">
            <span className="compute-wallet-label">BALANCE</span>
            <span className="compute-wallet-value"><GoldCoinIcon size={14} /> {gold}</span>
          </div>
          <button className="game-btn compute-wallet-buy" onClick={handlePlus}>
            GET MORE
          </button>
        </div>
      )}
    </div>
  )
}
