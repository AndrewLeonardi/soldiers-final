/**
 * GoldCounter — gold currency pill for the HUD.
 *
 * Sprint A (v2). Gold accent, clicking + opens the store (buy more gold).
 * Recruiting is handled through the roster, not the gold button.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { GoldCoinIcon } from './GoldCoinIcon'
import { CurrencyPill } from './CurrencyPill'

export function GoldCounter() {
  const gold = useCampStore((s) => s.gold)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)

  const handlePlus = useCallback(() => {
    setStoreSheetOpen(true)
  }, [setStoreSheetOpen])

  return (
    <CurrencyPill
      icon={<GoldCoinIcon size={16} className="gold-counter-icon" />}
      value={gold}
      color="#FFD700"
      onPlusClick={handlePlus}
      className="gold-pill"
    />
  )
}
