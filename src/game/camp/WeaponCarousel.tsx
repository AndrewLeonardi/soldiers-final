/**
 * WeaponCarousel — horizontal weapon selector showing only unlocked weapons.
 *
 * Weapons are unlocked by winning battles (weaponReward in campBattles).
 * Only unlocked weapons appear — no buy-to-unlock flow.
 */
import { useCallback } from 'react'
import { useCampStore } from '@stores/campStore'
import { WEAPON_DISPLAY } from '@config/roster'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_ABBREV: Record<WeaponType, string> = {
  rifle: 'RF',
  rocketLauncher: 'RL',
  grenade: 'GR',
  machineGun: 'MG',
  tank: 'TK',
}

interface WeaponCarouselProps {
  selected: WeaponType
  onSelect: (weapon: WeaponType) => void
}

export function WeaponCarousel({ selected, onSelect }: WeaponCarouselProps) {
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons) as WeaponType[]

  const handleTap = useCallback((weapon: WeaponType) => {
    sfx.buttonTap()
    onSelect(weapon)
  }, [onSelect])

  return (
    <div className="weapon-carousel">
      {unlockedWeapons.map((weapon) => {
        const isSelected = selected === weapon
        const display = WEAPON_DISPLAY[weapon]

        return (
          <button
            key={weapon}
            className={`weapon-card ${isSelected ? 'selected' : ''}`}
            onClick={() => handleTap(weapon)}
          >
            <span className="weapon-card-icon">{WEAPON_ABBREV[weapon]}</span>
            <span className="weapon-card-name">{display.name}</span>
          </button>
        )
      })}
    </div>
  )
}
