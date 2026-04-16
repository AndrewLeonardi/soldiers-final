/**
 * StoreSheet — the Token Store. Featured hero pack + 2-column grid.
 *
 * Token-design sprint: header renamed "TOKEN STORE", old scattered
 * `ChipPile` replaced by `TokenChip` stacks sized by pack.stackCount
 * (Spark=1, Charge=2, Surge=3, Arsenal=5, War Chest=8). No seconds
 * copy anywhere — conversion messaging lives only on the training side.
 */
import { useCallback, useEffect } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { TOKEN_PACKS } from '@config/store'
import type { TokenPack } from '@config/store'
import { TokenChip } from './TokenChip'
import { purchasePack, grantStarterPack } from '@api/purchase'
import { ensureAgeConfirmed } from './AgeGate'
import { isSupabaseEnabled } from '@api/user'
import { track } from '@analytics/events'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const tokens = useCampStore((s) => s.tokens)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)

  useEffect(() => {
    if (!isOpen) return
    track('store_opened', {})
    for (const pack of TOKEN_PACKS) {
      track('pack_viewed', { packId: pack.id })
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  const handleBuyPack = useCallback(async (packId: string) => {
    sfx.recruitChime()
    const pack = TOKEN_PACKS.find(p => p.id === packId)
    if (isSupabaseEnabled()) {
      const ok = await ensureAgeConfirmed()
      if (!ok) return
    }
    if (pack) {
      track('pack_clicked', { packId: pack.id, price: pack.price, tokens: pack.tokens })
    }
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
          <span className="game-sheet-title">TOKEN STORE</span>
          <div className="store-balances">
            <span className="store-bal-pill compute"><TokenChip size={16} /> {tokens.toLocaleString()}</span>
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
              <div className="store-starter-value"><TokenChip size={16} /> 500</div>
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
                <TokenChip size={86} count={featuredPack.stackCount} glow />
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
                  <TokenChip size={pack.stackCount >= 5 ? 60 : 72} count={pack.stackCount} />
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
