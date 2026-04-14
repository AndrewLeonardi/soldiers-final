/**
 * StoreSheet — simplified compute-only store.
 *
 * Sprint 4 polish: stripped to essentials. No tabs, no gold, no bundles.
 * Just "STORE — Buy more Compute" with compute pack cards.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { COMPUTE_PACKS } from '@config/store'
import { ComputeIcon } from './ComputeIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const compute = useCampStore((s) => s.compute)
  const addCompute = useCampStore((s) => s.addCompute)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)
  const setStarterPackShown = useCampStore((s) => s.setStarterPackShown)

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  const handleBuyCompute = useCallback((amount: number) => {
    sfx.recruitChime()
    addCompute(amount)
  }, [addCompute])

  const handleStarterPack = useCallback(() => {
    sfx.recruitChime()
    addCompute(500)
    setStarterPackShown()
  }, [addCompute, setStarterPackShown])

  const trainedCount = soldiers.filter(s => s.trained).length
  const showStarterOffer = trainedCount >= 3 && !starterPackShown

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet store-sheet store-redesign" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">STORE</span>
          <div className="store-balances">
            <span className="store-bal-pill compute"><ComputeIcon size={12} /> {compute}</span>
          </div>
        </div>

        <div className="game-sheet-body">
          <div className="store-subtitle">BUY MORE COMPUTE</div>

          {/* Starter offer */}
          {showStarterOffer && (
            <div className="store-starter-card" onClick={handleStarterPack}>
              <div className="store-starter-badge">FREE</div>
              <div className="store-starter-title">STARTER PACK</div>
              <div className="store-starter-desc">
                {trainedCount} soldiers trained — here's a boost!
              </div>
              <div className="store-starter-value"><ComputeIcon size={14} /> 500</div>
              <button className="game-btn store-claim-btn">CLAIM NOW</button>
            </div>
          )}

          {/* Compute packs grid */}
          <div className="store-packs-grid">
            {COMPUTE_PACKS.map((pack, i) => (
              <button
                key={pack.id}
                className={`store-pack-card chunky ${pack.featured ? 'featured' : ''}`}
                onClick={() => handleBuyCompute(pack.compute)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {pack.featured && <span className="store-pack-badge">BEST VALUE</span>}
                {pack.id === 'charge' && <span className="store-pack-badge popular">POPULAR</span>}
                <span className="store-pack-name">{pack.name}</span>
                <span className="store-pack-compute"><ComputeIcon size={16} /> {pack.compute}</span>
                <span className="store-pack-desc">{pack.description}</span>
                <span className="store-pack-price">{pack.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
