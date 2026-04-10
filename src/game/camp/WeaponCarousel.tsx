/**
 * WeaponCarousel — horizontal swipeable weapon selector with unlock gates.
 *
 * Sprint 3, Phase 2a. Shows all 5 weapons as cards. Locked weapons show
 * price chip. Tap unlocked → select. Tap locked → unlock confirm flow.
 * Insufficient compute → opens ComputeModal.
 *
 * CSS scroll-snap for mobile swipe.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { WEAPON_UNLOCK_COST, WEAPON_DISPLAY } from '@config/roster'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPONS: WeaponType[] = ['rifle', 'rocketLauncher', 'grenade', 'machineGun', 'tank']

// Emoji stand-ins until WeaponIcon SVGs (Phase 5)
const WEAPON_EMOJI: Record<WeaponType, string> = {
  rifle: '🔫',
  rocketLauncher: '🚀',
  grenade: '💣',
  machineGun: '🔥',
  tank: '🛡️',
}

interface WeaponCarouselProps {
  selected: WeaponType
  onSelect: (weapon: WeaponType) => void
}

export function WeaponCarousel({ selected, onSelect }: WeaponCarouselProps) {
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)
  const unlockWeapon = useCampStore((s) => s.unlockWeapon)
  const compute = useCampStore((s) => s.compute)
  const setComputeModalOpen = useSceneStore((s) => s.setComputeModalOpen)

  const handleTap = useCallback((weapon: WeaponType) => {
    const isUnlocked = unlockedWeapons.includes(weapon)

    if (isUnlocked) {
      sfx.buttonTap()
      onSelect(weapon)
      return
    }

    // Locked — try to unlock
    const cost = WEAPON_UNLOCK_COST[weapon]
    if (compute < cost) {
      // Can't afford — show compute modal
      sfx.buttonTap()
      setComputeModalOpen(true)
      return
    }

    // Can afford — unlock it
    const success = unlockWeapon(weapon)
    if (success) {
      sfx.weaponEquip()
      onSelect(weapon)
    }
  }, [unlockedWeapons, unlockWeapon, compute, onSelect, setComputeModalOpen])

  return (
    <div className="weapon-carousel">
      {WEAPONS.map((weapon) => {
        const isUnlocked = unlockedWeapons.includes(weapon)
        const isSelected = selected === weapon
        const cost = WEAPON_UNLOCK_COST[weapon]
        const display = WEAPON_DISPLAY[weapon]

        return (
          <button
            key={weapon}
            className={`weapon-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
            onClick={() => handleTap(weapon)}
          >
            <span className="weapon-card-icon">{WEAPON_EMOJI[weapon]}</span>
            <span className="weapon-card-name">{display.name}</span>
            {!isUnlocked && (
              <span className="weapon-card-price">
                {cost} ⚡
              </span>
            )}
            {isUnlocked && isSelected && (
              <span className="weapon-card-check">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
