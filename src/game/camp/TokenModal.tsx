/**
 * TokenModal — "NOT ENOUGH TOKENS" interstitial.
 *
 * Sprint 3, Phase 2b. Shows when the player tries to unlock/buy
 * something they can't afford. Displays balance, shortfall,
 * and a CTA to open the store.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

interface TokenModalProps {
  /** The amount the player tried to spend */
  needed?: number
}

export function TokenModal({ needed }: TokenModalProps) {
  const isOpen = useSceneStore((s) => s.tokenModalOpen)
  const setTokenModalOpen = useSceneStore((s) => s.setTokenModalOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const tokens = useCampStore((s) => s.tokens)

  if (!isOpen) return null

  const shortfall = needed ? Math.max(0, needed - tokens) : 0

  const handleGoToStore = () => {
    sfx.buttonTap()
    setTokenModalOpen(false)
    setStoreSheetOpen(true)
  }

  const handleClose = () => {
    setTokenModalOpen(false)
  }

  return (
    <div className="compute-modal-backdrop" onClick={handleClose}>
      <div className="compute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compute-modal-title">NOT ENOUGH TOKENS</div>
        <div className="compute-modal-balance">
          <span className="compute-modal-label">BALANCE</span>
          <span className="compute-modal-value">{tokens}</span>
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
