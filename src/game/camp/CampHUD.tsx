/**
 * CampHUD — the persistent heads-up display overlay.
 *
 * Layout (post-redesign):
 *   - Top center: token hero counter
 *   - Top right: settings gear
 *   - PVP teaser banner (above bottom nav)
 *   - Bottom nav: 5 colorful tabs — SOLDIERS, TRAINING, ATTACK, STORE, ARMORY
 *
 * Hidden during fighting/result battle phases.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TokenCounter } from './TokenCounter'
import { ShieldIcon, CrossedSwordsNavIcon, ChestIcon, WeaponRackIcon, GearCogIcon, TargetIcon } from './icons/NavIcons'
import { PVPTeaser } from './PVPTeaser'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// ── Tab config ──
interface NavTab {
  id: string
  label: string
  colorClass: string
}

const NAV_TABS: NavTab[] = [
  { id: 'soldiers', label: 'SOLDIERS', colorClass: 'soldiers' },
  { id: 'training', label: 'TRAINING', colorClass: 'training' },
  { id: 'attack', label: 'ATTACK', colorClass: 'attack' },
  { id: 'store', label: 'STORE', colorClass: 'store' },
  { id: 'armory', label: 'ARMORY', colorClass: 'armory' },
]

function NavTabIcon({ id, active, size }: { id: string; active: boolean; size: number }) {
  switch (id) {
    case 'soldiers': return <ShieldIcon size={size} active={active} />
    case 'training': return <TargetIcon size={size} active={active} />
    case 'attack': return <CrossedSwordsNavIcon size={size} active={active} />
    case 'store': return <ChestIcon size={size} active={active} />
    case 'armory': return <WeaponRackIcon size={size} active={active} />
    default: return null
  }
}

export function CampHUD() {
  const tickHealing = useCampStore((s) => s.tickHealing)
  const canClaimDaily = useCampStore((s) => s.canClaimDaily)
  const hasUnclaimedDaily = canClaimDaily()

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

  // Track which tab opened the roster sheet (for nav highlight)
  const [lastRosterOpener, setLastRosterOpener] = useState<'soldiers' | 'training' | null>(null)

  useEffect(() => {
    if (!rosterSheetOpen) setLastRosterOpener(null)
  }, [rosterSheetOpen])

  // Tab handlers
  const tabHandlers: Record<string, () => void> = useMemo(() => ({
    soldiers: () => { sfx.buttonTap(); setLastRosterOpener('soldiers'); setRosterSheetOpen(true) },
    training: () => { sfx.buttonTap(); setLastRosterOpener('training'); setRosterSheetOpen(true) },
    attack: () => { sfx.buttonTap(); setBattlePhase('picking') },
    store: () => { sfx.buttonTap(); setStoreSheetOpen(true) },
    armory: () => { sfx.buttonTap(); setArmorySheetOpen(true) },
  }), [setBattlePhase, setStoreSheetOpen, setRosterSheetOpen, setArmorySheetOpen])

  const handleSettingsTap = useCallback(() => {
    sfx.buttonTap()
    setSettingsOpen(true)
  }, [setSettingsOpen])

  // Active states
  const activeTab = useMemo(() => {
    if (rosterSheetOpen) return lastRosterOpener ?? 'soldiers'
    if (battlePhase === 'picking') return 'attack'
    if (storeSheetOpen) return 'store'
    if (armorySheetOpen) return 'armory'
    return null
  }, [rosterSheetOpen, lastRosterOpener, battlePhase, storeSheetOpen, armorySheetOpen])

  // Hide HUD during active battle phases
  if (battlePhase === 'fighting' || battlePhase === 'result') return null

  return (
    <>
      {/* Top center — token hero */}
      <div className="camp-top-bar">
        <TokenCounter hasUnclaimedDaily={hasUnclaimedDaily} />
      </div>

      {/* Top right — settings gear */}
      <button
        className={`camp-settings-gear${settingsOpen ? ' camp-settings-gear--active' : ''}`}
        onClick={handleSettingsTap}
        aria-label="Settings"
      >
        <GearCogIcon size={22} active={settingsOpen} />
      </button>

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
