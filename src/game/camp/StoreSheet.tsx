/**
 * StoreSheet — mobile game-shop redesign.
 *
 * Layout: featured legendary hero pack on top + 2-column grid of remaining
 * packs below. Each tile shows a pile of token chips sized by pack value,
 * a tier-colored accent stripe, the token amount, "TOKENS" label, pack
 * name, and a green pill price button.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { TOKEN_PACKS } from '@config/store'
import type { TokenPack } from '@config/store'
import { TokenIcon } from './TokenIcon'
import { purchasePack, grantStarterPack } from '@api/purchase'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

/** Stacked pile of token chips, sized by pack value. */
function ChipPile({ count, large }: { count: number; large?: boolean }) {
  // Cap visual chips so the pile doesn't get absurd
  const visible = Math.min(count, 9)
  const baseSize = large ? 36 : 26
  return (
    <div className={`chip-pile${large ? ' chip-pile--large' : ''}`}>
      {Array.from({ length: visible }).map((_, i) => {
        // Spread chips across the pile area with deterministic offsets
        const angle = (i * 47) % 360
        const rad = (angle * Math.PI) / 180
        const radius = (i % 3) * (large ? 9 : 7)
        const tx = Math.cos(rad) * radius
        const ty = Math.sin(rad) * radius * 0.55
        const rot = ((i * 23) % 60) - 30
        return (
          <span
            key={i}
            className="chip-pile-item"
            style={{
              top: '50%',
              left: '50%',
              width: baseSize,
              height: baseSize,
              marginLeft: -baseSize / 2 + tx,
              marginTop: -baseSize / 2 + ty,
              transform: `rotate(${rot}deg)`,
              zIndex: i,
            }}
          >
            <TokenIcon size={baseSize} />
          </span>
        )
      })}
    </div>
  )
}

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const tokens = useCampStore((s) => s.tokens)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  // Route through the purchase seam. Sprint 1: grants tokens locally.
  // Sprint 3: opens Stripe Checkout. Callsites don't change.
  const handleBuyPack = useCallback((packId: string) => {
    sfx.recruitChime()
    void purchasePack(packId)
  }, [])

  const handleStarterPack = useCallback(() => {
    sfx.recruitChime()
    grantStarterPack()
  }, [])

  const trainedCount = soldiers.filter(s => s.trained).length
  const showStarterOffer = trainedCount >= 3 && !starterPackShown

  if (!isOpen) return null

  const featuredPack: TokenPack | undefined = TOKEN_PACKS.find(p => p.featured)
  const gridPacks: TokenPack[] = TOKEN_PACKS.filter(p => !p.featured)

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
          <div className="store-tokens-tagline">BUY MORE TOKENS</div>

          {/* Starter offer (kept) */}
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

          {/* Featured hero pack */}
          {featuredPack && (
            <button
              className={`store-featured-card store-featured-card--${featuredPack.tier}`}
              onClick={() => handleBuyPack(featuredPack.id)}
            >
              <span className="store-featured-ribbon">BEST VALUE</span>
              <div className="store-featured-chips">
                <ChipPile count={featuredPack.chipCount} large />
              </div>
              <div className="store-featured-info">
                <div className="store-featured-amount">{featuredPack.tokens.toLocaleString()}</div>
                <div className="store-featured-label">TOKENS</div>
                <div className="store-featured-name">{featuredPack.name}</div>
                <div className="store-featured-desc">{featuredPack.description}</div>
              </div>
              <span className="store-tile-price store-tile-price--large">{featuredPack.price}</span>
            </button>
          )}

          {/* 2-column grid of remaining packs */}
          <div className="store-grid">
            {gridPacks.map((pack, i) => (
              <button
                key={pack.id}
                className={`store-grid-tile store-grid-tile--${pack.tier}`}
                onClick={() => handleBuyPack(pack.id)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="store-tile-tier-stripe" />
                {pack.id === 'charge' && <span className="store-tile-popular">POPULAR</span>}
                <div className="store-tile-chips">
                  <ChipPile count={pack.chipCount} />
                </div>
                <div className="store-tile-amount">{pack.tokens.toLocaleString()}</div>
                <div className="store-tile-label">TOKENS</div>
                <div className="store-tile-name">{pack.name}</div>
                <span className="store-tile-price">{pack.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
