/**
 * CampHUD — the persistent heads-up display overlay.
 *
 * Sprint 3-4 + Redesign. Layout:
 *   - Top center: token counter (cyan)
 *   - PVP teaser banner (above bottom nav)
 *   - Bottom nav: 5 colorful Clash Royale-style tabs with big icons
 *
 * Hidden during fighting/result battle phases.
 */
import { useCallback, useEffect, useMemo } from 'react'
import { TokenCounter } from './TokenCounter'
import { ShieldIcon, CrossedSwordsNavIcon, ChestIcon, WeaponRackIcon, GearCogIcon } from './icons/NavIcons'
import { PVPTeaser } from './PVPTeaser'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { CAMP_BATTLES } from '@config/campBattles'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// ── Progression breadcrumb logic ──
interface NextUnlock {
  id: string
  name: string
  requirement: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic'
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
}

function computeNextUnlock(
  unlockedWeapons: string[],
  battlesCompleted: Record<string, { stars: number }>,
): NextUnlock | null {
  // Check battle rewards in order
  const battleChain: { battleId: string; weapon: string; name: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic'; label: string }[] = [
    { battleId: 'camp-1', weapon: 'machineGun', name: 'MACHINE GUN', rarity: 'rare', label: 'Win Battle 1' },
    { battleId: 'camp-2', weapon: 'rocketLauncher', name: 'ROCKET LAUNCHER', rarity: 'uncommon', label: 'Win Battle 2' },
    { battleId: 'camp-3', weapon: 'grenade', name: 'GRENADES', rarity: 'uncommon', label: 'Win Battle 3' },
  ]

  for (const b of battleChain) {
    if (!unlockedWeapons.includes(b.weapon)) {
      return { id: b.weapon, name: b.name, requirement: b.label, rarity: b.rarity }
    }
  }

  // Tank at level 5
  const playerLevel = Object.keys(battlesCompleted).length + 1
  if (!unlockedWeapons.includes('tank') && playerLevel < 5) {
    return { id: 'tank', name: 'TANK', requirement: `Reach Level ${5}`, rarity: 'epic' }
  }

  return null // All unlocked!
}

// ── Tab config ──
interface NavTab {
  id: string
  label: string
  colorClass: string
}

const NAV_TABS: NavTab[] = [
  { id: 'soldiers', label: 'SOLDIERS', colorClass: 'soldiers' },
  { id: 'attack', label: 'ATTACK', colorClass: 'attack' },
  { id: 'store', label: 'STORE', colorClass: 'store' },
  { id: 'armory', label: 'ARMORY', colorClass: 'armory' },
  { id: 'settings', label: 'SETTINGS', colorClass: 'settings' },
]

function NavTabIcon({ id, active, size }: { id: string; active: boolean; size: number }) {
  switch (id) {
    case 'soldiers': return <ShieldIcon size={size} active={active} />
    case 'attack': return <CrossedSwordsNavIcon size={size} active={active} />
    case 'store': return <ChestIcon size={size} active={active} />
    case 'armory': return <WeaponRackIcon size={size} active={active} />
    case 'settings': return <GearCogIcon size={size} active={active} />
    default: return null
  }
}

export function CampHUD() {
  const tickHealing = useCampStore((s) => s.tickHealing)
  const lastDailyClaimDate = useCampStore((s) => s.lastDailyClaimDate)
  const today = new Date().toISOString().split('T')[0]!
  const hasUnclaimedDaily = lastDailyClaimDate !== today

  // Auto-heal soldiers whose timer has expired (check every 5s)
  useEffect(() => {
    const interval = setInterval(tickHealing, 5000)
    return () => clearInterval(interval)
  }, [tickHealing])

  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)
  const setArmorySheetOpen = useSceneStore((s) => s.setArmorySheetOpen)
  const storeSheetOpen = useSceneStore((s) => s.storeSheetOpen)
  const rosterSheetOpen = useSceneStore((s) => s.rosterSheetOpen)
  const settingsOpen = useSceneStore((s) => s.settingsOpen)
  const armorySheetOpen = useSceneStore((s) => s.armorySheetOpen)
  const setArmoryScrollToItem = useSceneStore((s) => s.setArmoryScrollToItem)

  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const nextUnlock = useMemo(
    () => computeNextUnlock(unlockedWeapons, battlesCompleted),
    [unlockedWeapons, battlesCompleted],
  )

  const handleBreadcrumbTap = useCallback(() => {
    if (!nextUnlock) return
    sfx.buttonTap()
    setArmoryScrollToItem(nextUnlock.id)
    setArmorySheetOpen(true)
  }, [nextUnlock, setArmoryScrollToItem, setArmorySheetOpen])

  // Tab handlers
  const tabHandlers: Record<string, () => void> = useMemo(() => ({
    soldiers: () => { sfx.buttonTap(); setRosterSheetOpen(true) },
    attack: () => { sfx.buttonTap(); setBattlePhase('picking') },
    store: () => { sfx.buttonTap(); setStoreSheetOpen(true) },
    armory: () => { sfx.buttonTap(); setArmorySheetOpen(true) },
    settings: () => { sfx.buttonTap(); setSettingsOpen(true) },
  }), [setBattlePhase, setStoreSheetOpen, setRosterSheetOpen, setArmorySheetOpen, setSettingsOpen])

  // Active states
  const activeTab = useMemo(() => {
    if (rosterSheetOpen) return 'soldiers'
    if (battlePhase === 'picking') return 'attack'
    if (storeSheetOpen) return 'store'
    if (armorySheetOpen) return 'armory'
    if (settingsOpen) return 'settings'
    return null
  }, [rosterSheetOpen, battlePhase, storeSheetOpen, armorySheetOpen, settingsOpen])

  // Hide HUD during active battle phases
  if (battlePhase === 'fighting' || battlePhase === 'result') return null

  return (
    <>
      {/* Top center — token counter */}
      <div className="camp-top-bar">
        <TokenCounter hasUnclaimedDaily={hasUnclaimedDaily} />
      </div>

      {/* Progression breadcrumb — teases next unlock */}
      {nextUnlock && (
        <div
          className="progression-breadcrumb"
          style={{ borderLeftColor: RARITY_COLORS[nextUnlock.rarity] ?? '#aaa' }}
          onClick={handleBreadcrumbTap}
        >
          <span className="breadcrumb-label">NEXT</span>
          <span className="breadcrumb-name">{nextUnlock.name}</span>
          <span className="breadcrumb-sep">—</span>
          <span className="breadcrumb-req">{nextUnlock.requirement}</span>
        </div>
      )}

      {/* PVP teaser — aspirational locked banner */}
      <PVPTeaser />

      {/* Bottom nav — 5 colorful Clash Royale-style tabs */}
      <div className="camp-nav-bar">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const isAttack = tab.id === 'attack'
          return (
            <button
              key={tab.id}
              className={`camp-nav-tab camp-nav-tab--${tab.colorClass}${isActive ? ' active' : ''}${isAttack ? ' camp-nav-tab--center' : ''}`}
              onClick={tabHandlers[tab.id]}
            >
              <div className="camp-nav-tab-icon">
                <NavTabIcon id={tab.id} active={isActive} size={isAttack ? 36 : 30} />
              </div>
              <span className="camp-nav-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
