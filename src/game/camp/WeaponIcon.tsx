/**
 * WeaponIcon — SVG silhouette icons for each weapon type.
 *
 * Sprint 3, Phase 5c. Minimal path-based icons.
 * Used by roster rows, weapon carousel, training sheet.
 */
import type { WeaponType } from '@config/types'

const ICON_PATHS: Record<WeaponType, string> = {
  rifle: 'M2 10h14l4-3v2h-2v2H4l-2-1z',
  rocketLauncher: 'M2 9h10l2-2h4l2 2v2l-2 2h-4l-2-2H2z',
  grenade: 'M8 3v2h2V3H8zM6 5h6v3a4 4 0 01-6 0V5zm3 8v3',
  machineGun: 'M1 10h16l3-4v3h-1v2H3l-2-1zm6-4h2v3H7z',
  tank: 'M3 8h14l2 3H1l2-3zm1 3h12v2H4v-2zm2-6h8l1 3H5l1-3z',
}

interface WeaponIconProps {
  weapon: WeaponType
  size?: number
  color?: string
}

export function WeaponIcon({ weapon, size = 20, color = '#c0d0b0' }: WeaponIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 16"
      fill={color}
      style={{ display: 'block' }}
    >
      <path d={ICON_PATHS[weapon]} />
    </svg>
  )
}
