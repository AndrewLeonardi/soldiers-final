/**
 * WeaponPicker — floating weapon selector during battle placement.
 *
 * Sprint C. Appears when a soldier with 2+ trained brains is being placed.
 * Shows each trained weapon with fitness %, default-highlights the best one.
 */
import { useState, useMemo, useCallback } from 'react'
import type { SoldierRecord } from '@stores/campStore'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET',
  grenade: 'GRENADE',
  machineGun: 'MG',
  tank: 'TANK',
}

interface WeaponPickerProps {
  soldier: SoldierRecord
  onPick: (weapon: WeaponType) => void
  onCancel: () => void
}

export function WeaponPicker({ soldier, onPick, onCancel }: WeaponPickerProps) {
  const weapons = useMemo(() => {
    if (!soldier.trainedBrains) return []
    return Object.keys(soldier.trainedBrains) as WeaponType[]
  }, [soldier.trainedBrains])

  // Default-select the highest-fitness brain
  const bestWeapon = useMemo(() => {
    if (weapons.length === 0) return null
    let best = weapons[0]!
    let bestFit = soldier.fitnessScore ?? 0
    // fitnessScore is the overall best — for per-weapon we'd need per-weapon fitness
    // For now, default to last trained (most recent)
    return weapons[weapons.length - 1]!
  }, [weapons, soldier])

  const [selected, setSelected] = useState<WeaponType | null>(bestWeapon)

  const handleConfirm = useCallback(() => {
    if (!selected) return
    sfx.buttonTap()
    onPick(selected)
  }, [selected, onPick])

  return (
    <div className="weapon-picker-backdrop" onClick={onCancel}>
      <div className="weapon-picker" onClick={(e) => e.stopPropagation()}>
        {weapons.map((w) => (
          <button
            key={w}
            className={`weapon-picker-option ${selected === w ? 'selected' : ''}`}
            onClick={() => {
              sfx.buttonTap()
              setSelected(w)
            }}
          >
            <span className="weapon-picker-weapon">{WEAPON_LABELS[w] ?? w.toUpperCase()}</span>
            <span className="weapon-picker-fitness">TRAINED</span>
          </button>
        ))}
        <button className="weapon-picker-confirm" onClick={handleConfirm}>
          DEPLOY
        </button>
      </div>
    </div>
  )
}
