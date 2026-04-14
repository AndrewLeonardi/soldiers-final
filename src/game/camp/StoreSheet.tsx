/**
 * StoreSheet — simplified token-only store.
 *
 * Sprint 4 polish: stripped to essentials. No tabs, no bundles.
 * Just "STORE — Buy more Tokens" with token pack cards.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { TOKEN_PACKS } from '@config/store'
import { TokenIcon } from './TokenIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const tokens = useCampStore((s) => s.tokens)
  const addTokens = useCampStore((s) => s.addTokens)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)
  const setStarterPackShown = useCampStore((s) => s.setStarterPackShown)

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  const handleBuyTokens = useCallback((amount: number) => {
    sfx.recruitChime()
    addTokens(amount)
  }, [addTokens])

  const handleStarterPack = useCallback(() => {
    sfx.recruitChime()
    addTokens(500)
    setStarterPackShown()
  }, [addTokens, setStarterPackShown])

  const trainedCount = soldiers.filter(s => s.trained).length
  const showStarterOffer = trainedCount >= 3 && !starterPackShown

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet store-sheet store-redesign" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">STORE</span>
          <div className="store-balances">
            <span className="store-bal-pill compute"><TokenIcon size={12} /> {tokens}</span>
          </div>
        </div>

        <div className="game-sheet-body">
          <div className="store-subtitle">BUY MORE TOKENS</div>

          {/* Starter offer */}
          {showStarterOffer && (
            <div className="store-starter-card" onClick={handleStarterPack}>
              <div className="store-starter-badge">FREE</div>
              <div className="store-starter-title">STARTER PACK</div>
              <div className="store-starter-desc">
                {trainedCount} soldiers trained — here's a boost!
              </div>
              <div className="store-starter-value"><TokenIcon size={14} /> 500</div>
              <button className="game-btn store-claim-btn">CLAIM NOW</button>
            </div>
          )}

          {/* Token packs grid */}
          <div className="store-packs-grid">
            {TOKEN_PACKS.map((pack, i) => (
              <button
                key={pack.id}
                className={`store-pack-card chunky ${pack.featured ? 'featured' : ''}`}
                onClick={() => handleBuyTokens(pack.tokens)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {pack.featured && <span className="store-pack-badge">BEST VALUE</span>}
                {pack.id === 'charge' && <span className="store-pack-badge popular">POPULAR</span>}
                <span className="store-pack-name">{pack.name}</span>
                <span className="store-pack-compute"><TokenIcon size={16} /> {pack.tokens}</span>
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
