/**
 * GoldCounter — gold currency pill for the HUD.
 *
 * Sprint A. Gold accent, clicking opens the recruit sheet.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { GoldCoinIcon } from './GoldCoinIcon'
import { CurrencyPill } from './CurrencyPill'

export function GoldCounter() {
  const gold = useCampStore((s) => s.gold)
  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)

  const handlePlus = useCallback(() => {
    setRecruitSheetOpen(true)
  }, [setRecruitSheetOpen])

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
