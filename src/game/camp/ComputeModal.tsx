/**
 * ComputeModal — "NOT ENOUGH COMPUTE" interstitial.
 *
 * Sprint 3, Phase 2b. Shows when the player tries to unlock/buy
 * something they can't afford. Displays balance, shortfall,
 * and a CTA to open the store.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

interface ComputeModalProps {
  /** The amount the player tried to spend */
  needed?: number
}

export function ComputeModal({ needed }: ComputeModalProps) {
  const isOpen = useSceneStore((s) => s.computeModalOpen)
  const setComputeModalOpen = useSceneStore((s) => s.setComputeModalOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const compute = useCampStore((s) => s.compute)

  if (!isOpen) return null

  const shortfall = needed ? Math.max(0, needed - compute) : 0

  const handleGoToStore = () => {
    sfx.buttonTap()
    setComputeModalOpen(false)
    setStoreSheetOpen(true)
  }

  const handleClose = () => {
    setComputeModalOpen(false)
  }

  return (
    <div className="compute-modal-backdrop" onClick={handleClose}>
      <div className="compute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compute-modal-title">NOT ENOUGH COMPUTE</div>
        <div className="compute-modal-balance">
          <span className="compute-modal-label">BALANCE</span>
          <span className="compute-modal-value">{compute}</span>
        </div>
        {shortfall > 0 && (
          <div className="compute-modal-shortfall">
            <span className="compute-modal-label">NEED</span>
            <span className="compute-modal-value shortfall">+{shortfall}</span>
          </div>
        )}
        <button className="game-btn compute-modal-cta" onClick={handleGoToStore}>
          GO TO STORE
        </button>
        <button className="compute-modal-dismiss" onClick={handleClose}>
          DISMISS
        </button>
      </div>
    </div>
  )
}
