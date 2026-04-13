/**
 * CampHUD — the persistent heads-up display overlay.
 *
 * Sprint 3-4. Replaces the old top-right gear + counter.
 * Layout:
 *   - Top center: compute counter (cyan) + gold counter (gold, placeholder)
 *   - Bottom bar: 5 beveled buttons — TRAIN · ATTACK · STORE · ROSTER · SETTINGS
 *
 * Hidden during fighting/result battle phases.
 */
import { useCallback, useEffect, useMemo } from 'react'
import { ComputeCounter } from './ComputeCounter'
import { GoldCounter } from './GoldCounter'
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
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)
  const setArmorySheetOpen = useSceneStore((s) => s.setArmorySheetOpen)
  const trainingSheetOpen = useSceneStore((s) => s.trainingSheetOpen)
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

  const handleTrain = useCallback(() => {
    sfx.buttonTap()
    setTrainingSheetOpen(true)
  }, [setTrainingSheetOpen])

  const handleAttack = useCallback(() => {
    sfx.buttonTap()
    setBattlePhase('picking')
  }, [setBattlePhase])

  const handleStore = useCallback(() => {
    sfx.buttonTap()
    setStoreSheetOpen(true)
  }, [setStoreSheetOpen])

  const handleRoster = useCallback(() => {
    sfx.buttonTap()
    setRosterSheetOpen(true)
  }, [setRosterSheetOpen])

  const handleArmory = useCallback(() => {
    sfx.buttonTap()
    setArmorySheetOpen(true)
  }, [setArmorySheetOpen])

  const handleSettings = useCallback(() => {
    sfx.buttonTap()
    setSettingsOpen(true)
  }, [setSettingsOpen])

  // Hide HUD during active battle phases
  if (battlePhase === 'fighting' || battlePhase === 'result') return null

  return (
    <>
      {/* Top center — dual currency counters */}
      <div className="camp-top-bar">
        <GoldCounter />
        <ComputeCounter hasUnclaimedDaily={hasUnclaimedDaily} />
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

      {/* Bottom bar — 6 beveled action buttons */}
      <div className="camp-bottom-bar">
        <button className={`camp-bottom-btn${trainingSheetOpen ? ' active' : ''}`} onClick={handleTrain}>
          <span className="camp-bottom-btn-icon">⚔</span>
          <span className="camp-bottom-btn-label">TRAIN</span>
        </button>

        <button className={`camp-bottom-btn attack${battlePhase === 'picking' ? ' active' : ''}`} onClick={handleAttack}>
          <span className="camp-bottom-btn-icon">💥</span>
          <span className="camp-bottom-btn-label">ATTACK</span>
        </button>

        <button className={`camp-bottom-btn${storeSheetOpen ? ' active' : ''}`} onClick={handleStore}>
          <span className="camp-bottom-btn-icon">🏪</span>
          <span className="camp-bottom-btn-label">STORE</span>
        </button>

        <button className={`camp-bottom-btn${armorySheetOpen ? ' active' : ''}`} onClick={handleArmory}>
          <span className="camp-bottom-btn-icon">🏆</span>
          <span className="camp-bottom-btn-label">ARMORY</span>
        </button>

        <button className={`camp-bottom-btn${rosterSheetOpen ? ' active' : ''}`} onClick={handleRoster}>
          <span className="camp-bottom-btn-icon">📋</span>
          <span className="camp-bottom-btn-label">ROSTER</span>
        </button>

        <button className={`camp-bottom-btn${settingsOpen ? ' active' : ''}`} onClick={handleSettings}>
          <span className="camp-bottom-btn-icon">⚙</span>
          <span className="camp-bottom-btn-label">SETTINGS</span>
        </button>
      </div>
    </>
  )
}
