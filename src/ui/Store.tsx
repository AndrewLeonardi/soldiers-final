import { useState, useEffect } from 'react'
import { useGameStore } from '@stores/gameStore'
import { COMPUTE_PACKS, DAILY_DRIP_INTERVAL_MS } from '@config/store'
import { MicrochipIcon } from './ToyIcons'
import * as sfx from '@audio/sfx'
import '@styles/store.css'

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'NOW'
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${mins}m`
}

export function Store() {
  const showStore = useGameStore((s) => s.showStore)
  const compute = useGameStore((s) => s.compute)
  const closeStore = useGameStore((s) => s.closeStore)
  const addCompute = useGameStore((s) => s.addCompute)
  const lastClaimTime = useGameStore((s) => s.lastDailyClaimTime)
  const claimDailyCompute = useGameStore((s) => s.claimDailyCompute)

  // Countdown timer (updates every minute)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!showStore) return
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [showStore])

  if (!showStore) return null

  const msUntilClaim = Math.max(0, (lastClaimTime + DAILY_DRIP_INTERVAL_MS) - Date.now())
  const canClaim = msUntilClaim <= 0

  const featured = COMPUTE_PACKS.find((p) => p.featured)
  const regular = COMPUTE_PACKS.filter((p) => !p.featured)

  function handleBuy(packId: string, amount: number) {
    // Placeholder: directly add compute (real IAP integration later)
    addCompute(amount)
    sfx.recruitChime()
  }

  function handleClaim() {
    if (claimDailyCompute()) {
      sfx.recruitChime()
    }
  }

  return (
    <div className="store-overlay">
      <div className="store-container">
        {/* Header */}
        <div className="store-header">
          <button className="store-back" onPointerDown={() => { sfx.buttonTap(); closeStore() }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="store-title">COMPUTE SUPPLY</div>
          <div className="store-balance">
            <MicrochipIcon size={18} color="#4ADE80" />
            <span>{compute}</span>
          </div>
        </div>

        {/* Featured pack */}
        {featured && (
          <div className="store-featured" onPointerDown={() => handleBuy(featured.id, featured.compute)}>
            <div className="store-best-badge">BEST VALUE</div>
            <div className="store-featured-content">
              <div className="store-featured-icon">
                <MicrochipIcon size={40} color="#4ADE80" />
                <MicrochipIcon size={32} color="#3aaa60" />
                <MicrochipIcon size={24} color="#2a8a50" />
              </div>
              <div className="store-featured-info">
                <div className="store-featured-name">{featured.name}</div>
                <div className="store-featured-amount">
                  <MicrochipIcon size={16} color="#4ADE80" />
                  {featured.compute.toLocaleString()}
                </div>
                <div className="store-featured-desc">{featured.description}</div>
              </div>
              <button className="store-buy-btn store-buy-featured">
                {featured.price}
              </button>
            </div>
          </div>
        )}

        {/* Pack grid */}
        <div className="store-grid">
          {regular.map((pack) => (
            <div
              key={pack.id}
              className="store-card"
              onPointerDown={() => handleBuy(pack.id, pack.compute)}
            >
              <div className="store-card-icon">
                <MicrochipIcon size={28} color="#4ADE80" />
              </div>
              <div className="store-card-amount">
                <MicrochipIcon size={14} color="#4ADE80" />
                {pack.compute.toLocaleString()}
              </div>
              <div className="store-card-desc">{pack.description}</div>
              <button className="store-buy-btn">
                {pack.price}
              </button>
            </div>
          ))}
        </div>

        {/* Daily drip section */}
        <div className="store-daily">
          <div className="store-daily-label">DAILY FREE COMPUTE</div>
          {canClaim ? (
            <button
              className="store-claim-btn"
              onPointerDown={handleClaim}
            >
              <MicrochipIcon size={18} color="#4ADE80" />
              CLAIM +50
            </button>
          ) : (
            <div className="store-countdown">
              Next free compute in: {formatCountdown(msUntilClaim)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
