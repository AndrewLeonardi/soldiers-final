/**
 * ArmorySheet — full-screen 3D unlock showcase.
 *
 * Sprint 2 (The Hook). Shows all weapons, defenses, and vehicles
 * as rotating 3D models organized by category. Locked items show
 * silhouettes with unlock requirements. Tapping an item opens a
 * detail card with bigger 3D model + stats.
 */
import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LockIcon } from './icons/LockIcon'
import { CrossedSwordsIcon } from './icons/CrossedSwordsIcon'
import { TokenChip } from './TokenChip'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import { createDisplayDefense } from '@three/models/Defenses'
import type { DefenseStyle } from '@three/models/Defenses'
import { WEAPON_DISPLAY } from '@config/roster'
import { DEFENSE_REGISTRY } from '@config/defenses'
import { CAMP_BATTLES } from '@config/campBattles'
import { WEAPON_STATS } from '@config/units'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// ── Data ─────────────────────────────────────────────────

type ArmoryTab = 'weapons' | 'defenses' | 'vehicles'

interface ArmoryItem {
  id: string
  name: string
  desc: string
  type: 'weapon' | 'defense' | 'vehicle'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic'
  unlockReq: string | null // null = always unlocked
  battleReqId?: string     // battle that grants this
  levelReq?: number        // level milestone required
  cost?: number            // gold cost (defenses)
  stats?: { damage: number; range: number; fireRate: number }
}

const WEAPON_RARITY: Record<string, 'common' | 'uncommon' | 'rare' | 'epic'> = {
  rifle: 'common',
  rocketLauncher: 'uncommon',
  grenade: 'uncommon',
  machineGun: 'rare',
  tank: 'epic',
}

const ARMORY_WEAPONS: ArmoryItem[] = [
  {
    id: 'rifle', name: 'RIFLE', desc: WEAPON_DISPLAY.rifle.desc,
    type: 'weapon', rarity: 'common', unlockReq: null,
    stats: WEAPON_STATS.rifle ? { damage: WEAPON_STATS.rifle.damage, range: WEAPON_STATS.rifle.range, fireRate: WEAPON_STATS.rifle.fireRate } : undefined,
  },
  {
    id: 'machineGun', name: 'MACHINE GUN', desc: WEAPON_DISPLAY.machineGun.desc,
    type: 'weapon', rarity: 'rare', unlockReq: 'Win Battle 1', battleReqId: 'camp-1',
    stats: WEAPON_STATS.machineGun ? { damage: WEAPON_STATS.machineGun.damage, range: WEAPON_STATS.machineGun.range, fireRate: WEAPON_STATS.machineGun.fireRate } : undefined,
  },
  {
    id: 'rocketLauncher', name: 'ROCKET LAUNCHER', desc: WEAPON_DISPLAY.rocketLauncher.desc,
    type: 'weapon', rarity: 'uncommon', unlockReq: 'Win Battle 2', battleReqId: 'camp-2',
    stats: WEAPON_STATS.rocketLauncher ? { damage: WEAPON_STATS.rocketLauncher.damage, range: WEAPON_STATS.rocketLauncher.range, fireRate: WEAPON_STATS.rocketLauncher.fireRate } : undefined,
  },
  {
    id: 'grenade', name: 'GRENADES', desc: WEAPON_DISPLAY.grenade.desc,
    type: 'weapon', rarity: 'uncommon', unlockReq: 'Win Battle 3', battleReqId: 'camp-3',
    stats: WEAPON_STATS.grenade ? { damage: WEAPON_STATS.grenade.damage, range: WEAPON_STATS.grenade.range, fireRate: WEAPON_STATS.grenade.fireRate } : undefined,
  },
]

const ARMORY_DEFENSES: ArmoryItem[] = DEFENSE_REGISTRY.map((d) => ({
  id: d.type,
  name: d.label,
  desc: d.type === 'wall' ? 'Brick barrier. Absorbs enemy fire.' :
        d.type === 'sandbag' ? 'Quick cover. Cheap and effective.' :
        'Elevated platform. Sniper advantage.',
  type: 'defense' as const,
  rarity: d.cost >= 200 ? 'rare' as const : d.cost >= 75 ? 'uncommon' as const : 'common' as const,
  unlockReq: null,
  cost: d.cost,
}))

const ARMORY_VEHICLES: ArmoryItem[] = [
  {
    id: 'tank', name: 'TANK', desc: WEAPON_DISPLAY.tank.desc,
    type: 'vehicle', rarity: 'epic', unlockReq: 'Reach Level 5', levelReq: 5,
  },
]

const TAB_ITEMS: Record<ArmoryTab, ArmoryItem[]> = {
  weapons: ARMORY_WEAPONS,
  defenses: ARMORY_DEFENSES,
  vehicles: ARMORY_VEHICLES,
}

// ── 3D Spinning model ────────────────────────────────────

function SpinningModel({ object }: { object: THREE.Group }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, delta) => { ref.current.rotation.y += delta * 1.2 })
  return <group ref={ref}><primitive object={object} /></group>
}

function createModel(item: ArmoryItem): THREE.Group {
  if (item.type === 'weapon' || item.type === 'vehicle') {
    return createDisplayWeapon(item.id as WeaponType)
  }
  return createDisplayDefense(item.id as DefenseStyle)
}

// ── Rarity colors ────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
}

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(170,170,170,0.3)',
  uncommon: 'rgba(76,175,80,0.4)',
  rare: 'rgba(33,150,243,0.4)',
  epic: 'rgba(156,39,176,0.5)',
}

// ── ArmoryCard ───────────────────────────────────────────

function ArmoryCard({
  item,
  isUnlocked,
  onTap,
}: {
  item: ArmoryItem
  isUnlocked: boolean
  onTap: () => void
}) {
  const model = useMemo(() => createModel(item), [item])
  const rarityColor = RARITY_COLORS[item.rarity] ?? '#aaa'
  const glowColor = RARITY_GLOW[item.rarity] ?? 'rgba(170,170,170,0.3)'

  return (
    <div
      className={`armory-card ${isUnlocked ? 'unlocked' : 'locked'}`}
      style={{
        borderColor: isUnlocked ? rarityColor : 'rgba(255,255,255,0.08)',
        boxShadow: isUnlocked ? `0 0 18px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
      }}
      onClick={() => { sfx.buttonTap(); onTap() }}
    >
      {/* 3D Preview */}
      <div className="armory-card-canvas" style={{ filter: isUnlocked ? 'none' : 'brightness(0.12) saturate(0)' }}>
        <Canvas
          camera={{ position: [0, 0.0, 1.8], fov: 38 }}
          gl={{ alpha: true, antialias: true }}
          frameloop="demand"
          style={{ width: '100%', height: '100%' }}
          onCreated={({ invalidate }) => {
            // Trigger continuous render for spinning
            const spin = () => { invalidate(); requestAnimationFrame(spin) }
            spin()
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 4]} intensity={1.0} />
          <directionalLight position={[-3, 1, -2]} intensity={0.4} color={0x88aaff} />
          <SpinningModel object={model} />
        </Canvas>
      </div>

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="armory-card-lock">
          <span className="armory-lock-icon"><LockIcon size={18} /></span>
          <span className="armory-lock-text">{item.unlockReq ?? 'LOCKED'}</span>
        </div>
      )}

      {/* Name + rarity tag */}
      <div className="armory-card-footer">
        <span className="armory-card-name">{item.name}</span>
        <span className="armory-card-rarity" style={{ color: rarityColor }}>
          {item.rarity.toUpperCase()}
        </span>
      </div>

      {/* Cost badge for defenses */}
      {item.cost != null && (
        <div className="armory-card-cost">
          <TokenChip size={12} /> {item.cost}
        </div>
      )}
    </div>
  )
}

// ── Detail Overlay ───────────────────────────────────────

function ArmoryDetail({
  item,
  isUnlocked,
  onClose,
}: {
  item: ArmoryItem
  isUnlocked: boolean
  onClose: () => void
}) {
  const model = useMemo(() => createModel(item), [item])
  const rarityColor = RARITY_COLORS[item.rarity] ?? '#aaa'

  return (
    <div className="armory-detail-backdrop" onClick={onClose}>
      <div className="armory-detail-card" onClick={(e) => e.stopPropagation()}>
        {/* Rarity stripe */}
        <div className="armory-detail-rarity-stripe" style={{ background: rarityColor }}>
          {item.rarity.toUpperCase()}
        </div>

        {/* Big 3D model */}
        <div className="armory-detail-canvas">
          <Canvas
            camera={{ position: [0, 0.1, 2.2], fov: 38 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 4, 5]} intensity={1.2} />
            <directionalLight position={[-3, 1, -2]} intensity={0.5} color={0x88aaff} />
            <pointLight position={[0, -1, 2]} intensity={0.3} color={rarityColor} />
            <SpinningModel object={model} />
          </Canvas>
        </div>

        {/* Info */}
        <h2 className="armory-detail-name">{item.name}</h2>
        <p className="armory-detail-desc">{item.desc}</p>

        {/* Stats */}
        {item.stats && (
          <div className="armory-detail-stats">
            <div className="armory-stat">
              <span className="armory-stat-label">DMG</span>
              <div className="armory-stat-bar">
                <div className="armory-stat-fill" style={{ width: `${Math.min(item.stats.damage * 3, 100)}%`, background: '#ff6b6b' }} />
              </div>
            </div>
            <div className="armory-stat">
              <span className="armory-stat-label">RNG</span>
              <div className="armory-stat-bar">
                <div className="armory-stat-fill" style={{ width: `${Math.min(item.stats.range * 6, 100)}%`, background: '#4ecdc4' }} />
              </div>
            </div>
            <div className="armory-stat">
              <span className="armory-stat-label">ROF</span>
              <div className="armory-stat-bar">
                <div className="armory-stat-fill" style={{ width: `${Math.min(item.stats.fireRate * 10, 100)}%`, background: '#ffd93d' }} />
              </div>
            </div>
          </div>
        )}

        {/* Defense cost */}
        {item.cost != null && (
          <div className="armory-detail-cost">
            <TokenChip size={12} /> {item.cost} TOKENS
          </div>
        )}

        {/* Lock status */}
        {!isUnlocked && (
          <div className="armory-detail-locked">
            <LockIcon size={14} /> {item.unlockReq}
          </div>
        )}

        <button className="armory-detail-close game-btn" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}

// ── Main ArmorySheet ─────────────────────────────────────

export function ArmorySheet() {
  const armorySheetOpen = useSceneStore((s) => s.armorySheetOpen)
  const setArmorySheetOpen = useSceneStore((s) => s.setArmorySheetOpen)
  const armoryScrollToItem = useSceneStore((s) => s.armoryScrollToItem)
  const setArmoryScrollToItem = useSceneStore((s) => s.setArmoryScrollToItem)

  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)

  const [activeTab, setActiveTab] = useState<ArmoryTab>('weapons')
  const [detailItem, setDetailItem] = useState<ArmoryItem | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Derive player level from battles completed
  const playerLevel = Object.keys(battlesCompleted).length + 1

  const isItemUnlocked = useCallback((item: ArmoryItem): boolean => {
    if (item.unlockReq === null) return true
    if (item.type === 'weapon' || item.type === 'vehicle') {
      return unlockedWeapons.includes(item.id)
    }
    if (item.levelReq) return playerLevel >= item.levelReq
    return false
  }, [unlockedWeapons, playerLevel])

  // Handle scroll-to from breadcrumb
  useEffect(() => {
    if (!armorySheetOpen || !armoryScrollToItem) return
    // Find which tab has the item
    for (const [tab, items] of Object.entries(TAB_ITEMS)) {
      if (items.some((i) => i.id === armoryScrollToItem)) {
        setActiveTab(tab as ArmoryTab)
        // Scroll into view after tab switch
        setTimeout(() => {
          const el = document.getElementById(`armory-item-${armoryScrollToItem}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
        break
      }
    }
    setArmoryScrollToItem(null)
  }, [armorySheetOpen, armoryScrollToItem, setArmoryScrollToItem])

  const handleClose = useCallback(() => {
    sfx.buttonTap()
    setArmorySheetOpen(false)
  }, [setArmorySheetOpen])

  const handleTabSwitch = useCallback((tab: ArmoryTab) => {
    sfx.buttonTap()
    setActiveTab(tab)
  }, [])

  if (!armorySheetOpen) return null

  const items = TAB_ITEMS[activeTab]

  return (
    <div className="armory-overlay">
      {/* Header */}
      <div className="armory-header">
        <button className="armory-close game-btn" onClick={handleClose}>✕</button>
        <h1 className="armory-title">ARMORY</h1>
        <div className="armory-subtitle">
          {unlockedWeapons.length} / {ARMORY_WEAPONS.length + ARMORY_VEHICLES.length} UNLOCKED
        </div>
      </div>

      {/* Tabs */}
      <div className="armory-tabs">
        {(['weapons', 'defenses', 'vehicles'] as ArmoryTab[]).map((tab) => (
          <button
            key={tab}
            className={`armory-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => handleTabSwitch(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="armory-grid" ref={gridRef}>
        {items.map((item, i) => (
          <div
            key={item.id}
            id={`armory-item-${item.id}`}
            style={{ animationDelay: `${i * 0.08}s` }}
            className="armory-card-wrapper"
          >
            <ArmoryCard
              item={item}
              isUnlocked={isItemUnlocked(item)}
              onTap={() => setDetailItem(item)}
            />
          </div>
        ))}
      </div>

      {/* Detail overlay */}
      {detailItem && (
        <ArmoryDetail
          item={detailItem}
          isUnlocked={isItemUnlocked(detailItem)}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  )
}
