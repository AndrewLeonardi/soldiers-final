/**
 * FiringRangeHUD — 2D overlay for weapon testing / firing range.
 *
 * Shows soldier name, weapon stats, weapon swap buttons, and EXIT.
 * Follows ObservationHUD pattern.
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { WEAPON_STATS } from '@config/units'
import { WEAPON_DISPLAY } from '@config/roster'
import { WeaponIcon } from './WeaponIcon'
import * as sfx from '@audio/sfx'
import type { WeaponType } from '@config/types'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET',
  grenade: 'GRENADES',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

export function FiringRangeHUD() {
  const firingRangeSoldierId = useSceneStore((s) => s.firingRangeSoldierId)
  const firingRangeWeapon = useSceneStore((s) => s.firingRangeWeapon)
  const setFiringRange = useSceneStore((s) => s.setFiringRange)
  const soldiers = useCampStore((s) => s.soldiers)

  const soldier = soldiers.find((s) => s.id === firingRangeSoldierId)
  const weapon = firingRangeWeapon
  const stats = weapon ? WEAPON_STATS[weapon] : null
  const display = weapon ? WEAPON_DISPLAY[weapon] : null
  const trainedWeapons = soldier?.trainedBrains ? Object.keys(soldier.trainedBrains) as WeaponType[] : []

  const handleExit = useCallback(() => {
    sfx.buttonTap()
    setFiringRange(null, null)
  }, [setFiringRange])

  const handleSwapWeapon = useCallback((w: WeaponType) => {
    sfx.weaponEquip()
    setFiringRange(firingRangeSoldierId, w)
  }, [firingRangeSoldierId, setFiringRange])

  if (!soldier || !weapon || !stats) return null

  return (
    <div className="fr-hud">
      {/* Top-left: soldier + weapon name */}
      <div className="fr-top-left">
        <div className="fr-soldier-name">{soldier.name}</div>
        <div className="fr-weapon-name">{WEAPON_LABELS[weapon] ?? weapon}</div>
        {display && <div className="fr-weapon-desc">{display.desc}</div>}
      </div>

      {/* Top-center: weapon stats */}
      <div className="fr-stats">
        <div className="fr-stat">
          <span className="fr-stat-label">DMG</span>
          <span className="fr-stat-value">{stats.damage}</span>
        </div>
        <div className="fr-stat">
          <span className="fr-stat-label">RANGE</span>
          <span className="fr-stat-value">{stats.range}</span>
        </div>
        <div className="fr-stat">
          <span className="fr-stat-label">ROF</span>
          <span className="fr-stat-value">{(1 / stats.fireRate).toFixed(1)}/s</span>
        </div>
        <div className="fr-stat">
          <span className="fr-stat-label">DPS</span>
          <span className="fr-stat-value">{Math.round(stats.damage / stats.fireRate)}</span>
        </div>
      </div>

      {/* Bottom: weapon swap + exit */}
      <div className="fr-bottom">
        {trainedWeapons.length > 1 && (
          <div className="fr-weapon-swap">
            {trainedWeapons.map((w) => (
              <button
                key={w}
                className={`fr-swap-btn ${w === weapon ? 'active' : ''}`}
                onClick={() => handleSwapWeapon(w)}
              >
                <WeaponIcon weapon={w} size={20} />
                <span>{WEAPON_LABELS[w] ?? w}</span>
              </button>
            ))}
          </div>
        )}
        <button className="fr-exit-btn" onClick={handleExit}>
          EXIT RANGE
        </button>
      </div>
    </div>
  )
}
