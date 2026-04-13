/**
 * StoreSheet — the game store bottom sheet.
 *
 * Sprint 2 redesign: GAME not DASHBOARD. Chunky cards, 3D previews,
 * hero banners, particle sparkles. 4 tabs:
 *   - Featured: hero banner + time-limited starter offer
 *   - Compute: chunky compute pack cards with badges
 *   - Gold: gold pack cards
 *   - Bundles: compute + gold + item combos with 3D previews
 */
import { useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { COMPUTE_PACKS, GOLD_PACKS, STORE_BUNDLES } from '@config/store'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import { createDisplayDefense } from '@three/models/Defenses'
import type { DefenseStyle } from '@three/models/Defenses'
import type { WeaponType } from '@config/types'
import { ComputeIcon } from './ComputeIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'
import { useRef } from 'react'

type StoreTab = 'featured' | 'compute' | 'gold' | 'bundles'

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
}

/** Slowly rotating 3D model for bundle cards */
function SpinningBundleItem({ object }: { object: THREE.Group }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, delta) => { ref.current.rotation.y += delta * 1.5 })
  return <group ref={ref}><primitive object={object} /></group>
}

export function StoreSheet() {
  const isOpen = useSceneStore((s) => s.storeSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const compute = useCampStore((s) => s.compute)
  const gold = useCampStore((s) => s.gold)
  const addCompute = useCampStore((s) => s.addCompute)
  const addGold = useCampStore((s) => s.addGold)
  const soldiers = useCampStore((s) => s.soldiers)
  const starterPackShown = useCampStore((s) => s.starterPackShown)
  const setStarterPackShown = useCampStore((s) => s.setStarterPackShown)

  const [activeTab, setActiveTab] = useState<StoreTab>('featured')

  const handleClose = useCallback(() => {
    setStoreSheetOpen(false)
  }, [setStoreSheetOpen])

  const handleBuyCompute = useCallback((amount: number) => {
    sfx.recruitChime()
    addCompute(amount)
  }, [addCompute])

  const handleBuyGold = useCallback((amount: number) => {
    sfx.recruitChime()
    addGold(amount)
  }, [addGold])

  const handleBuyBundle = useCallback((computeAmt: number, goldAmt: number) => {
    sfx.completionFanfare()
    addCompute(computeAmt)
    addGold(goldAmt)
  }, [addCompute, addGold])

  const handleStarterPack = useCallback(() => {
    sfx.recruitChime()
    addCompute(500)
    setStarterPackShown()
  }, [addCompute, setStarterPackShown])

  const trainedCount = soldiers.filter(s => s.trained).length
  const showStarterOffer = trainedCount >= 3 && !starterPackShown

  // Find the featured/best-value pack
  const featuredPack = COMPUTE_PACKS.find(p => p.featured) ?? COMPUTE_PACKS[COMPUTE_PACKS.length - 1]

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet store-sheet store-redesign" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">STORE</span>
          <div className="store-balances">
            <span className="store-bal-pill compute"><ComputeIcon size={12} /> {compute}</span>
            <span className="store-bal-pill gold">🪙 {gold}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="store-tabs">
          {(['featured', 'compute', 'gold', 'bundles'] as StoreTab[]).map(tab => (
            <button
              key={tab}
              className={`store-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => { sfx.buttonTap(); setActiveTab(tab) }}
            >
              {tab === 'featured' ? '🔥' : tab === 'compute' ? '⚡' : tab === 'gold' ? '🪙' : '📦'}{' '}
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="game-sheet-body">

          {/* ═══ FEATURED TAB ═══ */}
          {activeTab === 'featured' && (
            <div className="store-featured">
              {/* Hero banner */}
              {featuredPack && (
                <div className="store-hero-banner" onClick={() => handleBuyCompute(featuredPack.compute)}>
                  {/* Sparkle particles */}
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="store-hero-sparkle"
                      style={{
                        left: `${15 + i * 14}%`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                  <div className="store-hero-badge">BEST VALUE</div>
                  <div className="store-hero-name">{featuredPack.name}</div>
                  <div className="store-hero-amount">
                    <ComputeIcon size={22} /> {featuredPack.compute}
                  </div>
                  <div className="store-hero-desc">{featuredPack.description}</div>
                  <div className="store-hero-price">{featuredPack.price}</div>
                </div>
              )}

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

              {/* Quick-buy grid: top 3 packs */}
              <div className="store-quick-grid">
                {COMPUTE_PACKS.slice(0, 3).map((pack) => (
                  <button
                    key={pack.id}
                    className="store-quick-card"
                    onClick={() => handleBuyCompute(pack.compute)}
                  >
                    <span className="store-quick-amount"><ComputeIcon size={12} /> {pack.compute}</span>
                    <span className="store-quick-price">{pack.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ COMPUTE TAB ═══ */}
          {activeTab === 'compute' && (
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
          )}

          {/* ═══ GOLD TAB ═══ */}
          {activeTab === 'gold' && (
            <div className="store-packs-grid">
              {GOLD_PACKS.map((pack, i) => (
                <button
                  key={pack.id}
                  className={`store-pack-card chunky gold-card ${pack.featured ? 'featured' : ''}`}
                  onClick={() => handleBuyGold(pack.gold)}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {pack.featured && <span className="store-pack-badge gold-badge">BEST VALUE</span>}
                  <span className="store-pack-name">{pack.name}</span>
                  <span className="store-pack-compute gold-amount">🪙 {pack.gold}</span>
                  <span className="store-pack-price">{pack.price}</span>
                </button>
              ))}
            </div>
          )}

          {/* ═══ BUNDLES TAB ═══ */}
          {activeTab === 'bundles' && (
            <div className="store-bundles">
              {STORE_BUNDLES.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onBuy={() => handleBuyBundle(bundle.compute, bundle.gold)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Individual bundle card with optional 3D item preview */
function BundleCard({ bundle, onBuy }: { bundle: typeof STORE_BUNDLES[number]; onBuy: () => void }) {
  const model = useMemo(() => {
    if (!bundle.itemId) return null
    if (bundle.itemType === 'weapon') return createDisplayWeapon(bundle.itemId as WeaponType)
    if (bundle.itemType === 'defense') return createDisplayDefense(bundle.itemId as DefenseStyle)
    return null
  }, [bundle.itemId, bundle.itemType])

  const rarityColor = RARITY_COLORS[bundle.rarity] ?? '#aaa'

  return (
    <div
      className="store-bundle-card"
      style={{ borderColor: rarityColor }}
      onClick={onBuy}
    >
      {/* 3D preview */}
      {model && (
        <div className="store-bundle-canvas">
          <Canvas
            camera={{ position: [0, 0.15, 1.4], fov: 35 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 3, 4]} intensity={1.0} />
            <directionalLight position={[-3, 1, -2]} intensity={0.4} color={0x88aaff} />
            <SpinningBundleItem object={model} />
          </Canvas>
        </div>
      )}

      <div className="store-bundle-info">
        <div className="store-bundle-rarity" style={{ color: rarityColor }}>
          {bundle.rarity.toUpperCase()}
        </div>
        <div className="store-bundle-name">{bundle.name}</div>
        <div className="store-bundle-tagline">{bundle.tagline}</div>
        <div className="store-bundle-contents">
          <span className="store-bundle-item"><ComputeIcon size={11} /> {bundle.compute}</span>
          <span className="store-bundle-item gold">🪙 {bundle.gold}</span>
        </div>
        <div className="store-bundle-price">{bundle.price}</div>
      </div>
    </div>
  )
}
