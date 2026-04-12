/**
 * ComputeCounter — compute currency pill for the HUD.
 *
 * Sprint A refactor. Now wraps the generic CurrencyPill component.
 * Cyan accent, clicking opens the store sheet.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { ComputeIcon } from './ComputeIcon'
import { CurrencyPill } from './CurrencyPill'

export function ComputeCounter() {
  const compute = useCampStore((s) => s.compute)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)

  const handlePlus = useCallback(() => {
    setStoreSheetOpen(true)
  }, [setStoreSheetOpen])

  return (
    <CurrencyPill
      icon={<ComputeIcon size={16} className="compute-counter-icon" />}
      value={compute}
      color="#00e5ff"
      onPlusClick={handlePlus}
    />
  )
}
