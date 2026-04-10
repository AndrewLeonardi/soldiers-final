/**
 * StoreSheet — the compute store bottom sheet.
 *
 * Sprint 3, Phase 3. 4 tabs:
 *   - Packs: Grid of COMPUTE_PACKS (visual stub, no real IAP)
 *   - Offers: Starter pack after 3+ trained soldiers
 *   - Daily: Claim button with countdown
 *   - Tiers: Tier upgrade descriptions (visual stub)
 */
import { useState, useCallback, useEffect } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { COMPUTE_PACKS, DAILY_DRIP_AMOUNT, DAILY_DRIP_INTERVAL_MS } from '@config/store'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

type StoreTab = 'packs' | 'offers' | 'daily' | 'tiers'

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const compute = useCampStore((s) => s.compute)
  const addCompute = useCampStore((s) => s.addCompute)
  const claimDailyCompute = useCampStore((s) => s.claimDailyCompute)
  const lastDailyClaimTime = useCampStore((s) => s.lastDailyClaimTime)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)
  const setStarterPackShown = useCampStore((s) => s.setStarterPackShown)

  const [activeTab, setActiveTab] = useState<StoreTab>('packs')
  const [dailyCountdown, setDailyCountdown] = useState('')
  const [justClaimed, setJustClaimed] = useState(false)

  // Daily countdown timer
  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      if (lastDailyClaimTime === 0) {
        setDailyCountdown('')
        return
      }
      const elapsed = Date.now() - lastDailyClaimTime
      const remaining = DAILY_DRIP_INTERVAL_MS - elapsed
      if (remaining <= 0) {
        setDailyCountdown('')
        return
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      setDailyCountdown(`${hours}h ${minutes}m`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [isOpen, lastDailyClaimTime])

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  const handleBuyPack = useCallback((computeAmount: number) => {
    // Visual stub — no real IAP, just add compute
    sfx.recruitChime()
    addCompute(computeAmount)
  }, [addCompute])

  const handleClaimDaily = useCallback(() => {
    const result = claimDailyCompute()
    if (result) {
      sfx.recruitChime()
      setJustClaimed(true)
      setTimeout(() => setJustClaimed(false), 2000)
    }
  }, [claimDailyCompute])

  const handleStarterPack = useCallback(() => {
    sfx.recruitChime()
    addCompute(500)
    setStarterPackShown()
  }, [addCompute, setStarterPackShown])

  const canClaimDaily = lastDailyClaimTime === 0 || (Date.now() - lastDailyClaimTime) >= DAILY_DRIP_INTERVAL_MS

  // Show offers tab if player has 3+ trained soldiers and hasn't seen starter pack
  const trainedCount = soldiers.filter(s => s.trained).length
  const showStarterOffer = trainedCount >= 3 && !starterPackShown

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet store-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">COMPUTE STORE</span>
          <span className="store-balance">⚡ {compute}</span>
        </div>

        {/* Tab bar */}
        <div className="store-tabs">
          {(['packs', 'offers', 'daily', 'tiers'] as StoreTab[]).map(tab => (
            <button
              key={tab}
              className={`store-tab ${activeTab === tab ? 'active' : ''} ${tab === 'offers' && showStarterOffer ? 'has-badge' : ''}`}
              onClick={() => { sfx.buttonTap(); setActiveTab(tab) }}
            >
              {tab.toUpperCase()}
              {tab === 'daily' && canClaimDaily && <span className="store-tab-dot" />}
            </button>
          ))}
        </div>

        <div className="game-sheet-body">
          {/* PACKS tab */}
          {activeTab === 'packs' && (
            <div className="store-packs-grid">
              {COMPUTE_PACKS.map(pack => (
                <button
                  key={pack.id}
                  className={`store-pack-card ${pack.featured ? 'featured' : ''}`}
                  onClick={() => handleBuyPack(pack.compute)}
                >
                  {pack.featured && <span className="store-pack-badge">BEST VALUE</span>}
                  <span className="store-pack-name">{pack.name}</span>
                  <span className="store-pack-compute">⚡ {pack.compute}</span>
                  <span className="store-pack-desc">{pack.description}</span>
                  <span className="store-pack-price">{pack.price}</span>
                </button>
              ))}
            </div>
          )}

          {/* OFFERS tab */}
          {activeTab === 'offers' && (
            <div className="store-offers">
              {showStarterOffer ? (
                <div className="store-offer-card">
                  <div className="store-offer-title">STARTER PACK</div>
                  <div className="store-offer-desc">
                    You've trained {trainedCount} soldiers — here's a boost to keep going!
                  </div>
                  <div className="store-offer-value">⚡ 500 COMPUTE</div>
                  <button className="game-btn" onClick={handleStarterPack}>
                    CLAIM FREE
                  </button>
                </div>
              ) : (
                <div className="store-empty">No offers available right now</div>
              )}
            </div>
          )}

          {/* DAILY tab */}
          {activeTab === 'daily' && (
            <div className="store-daily">
              <div className="store-daily-title">DAILY COMPUTE</div>
              <div className="store-daily-amount">⚡ {DAILY_DRIP_AMOUNT}</div>
              {justClaimed ? (
                <div className="store-daily-claimed">CLAIMED!</div>
              ) : canClaimDaily ? (
                <button className="game-btn store-daily-btn" onClick={handleClaimDaily}>
                  CLAIM NOW
                </button>
              ) : (
                <div className="store-daily-countdown">
                  <span className="store-daily-countdown-label">NEXT CLAIM IN</span>
                  <span className="store-daily-countdown-time">{dailyCountdown}</span>
                </div>
              )}
              <div className="store-daily-note">
                Come back daily for free compute. Miss a day? We'll save up to 3 days for you.
              </div>
            </div>
          )}

          {/* TIERS tab */}
          {activeTab === 'tiers' && (
            <div className="store-tiers">
              <div className="store-tier-card">
                <div className="store-tier-name" style={{ color: '#00e5ff' }}>TIER 1 — BASIC</div>
                <div className="store-tier-desc">1x speed. The default training pace.</div>
              </div>
              <div className="store-tier-card">
                <div className="store-tier-name" style={{ color: '#4488ff' }}>TIER 2 — FAST</div>
                <div className="store-tier-desc">4x speed. Costs 2x. Soldiers learn faster.</div>
              </div>
              <div className="store-tier-card">
                <div className="store-tier-name" style={{ color: '#aa44ff' }}>TIER 3 — HYPER</div>
                <div className="store-tier-desc">16x speed. Costs 4x. Neural nets glow hot.</div>
              </div>
              <div className="store-tier-card">
                <div className="store-tier-name" style={{ color: '#ffffff' }}>TIER 4 — QUANTUM</div>
                <div className="store-tier-desc">64x speed. Costs 8x. White-hot evolution.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
