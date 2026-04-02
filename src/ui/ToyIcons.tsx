interface IconProps {
  size?: number
  color?: string
  style?: React.CSSProperties
}

// ── Unit Icons ──────────────────────────────────────────

export function SoldierIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-1.5 5C9.7 7 9 7.7 9 8.5V13l-2.5 5.5a1 1 0 0 0 .9 1.5h1.2l1.4-4h4l1.4 4h1.2a1 1 0 0 0 .9-1.5L15 13V8.5C15 7.7 14.3 7 13.5 7h-3zm.5 2h2v3h-2V9zm5 1.5l1.5-1.5.7.7L16.5 11.5l-.5-.5v-.5zm-8 0V11l-.5.5L5.8 9.7l.7-.7L8 10.5z" />
      <rect x="8" y="20" width="8" height="2" rx="1" />
    </svg>
  )
}

export function RifleIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M3 11h14l2-2h2v2h-1l1 2h-2l-1-1H4v2l-1 1V10l1 1h-.001z" />
      <rect x="6" y="13" width="2" height="3" rx="0.5" />
      <rect x="15" y="9" width="4" height="1" rx="0.5" />
    </svg>
  )
}

export function RocketLauncherIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <rect x="2" y="10" width="16" height="4" rx="2" />
      <path d="M18 10l3 2-3 2v-4z" />
      <path d="M2 9v6l-1-1v-4l1-1z" />
      <rect x="10" y="14" width="3" height="4" rx="0.5" />
      <rect x="13" y="7" width="2" height="3" rx="0.5" />
    </svg>
  )
}

export function MachineGunIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <rect x="3" y="10" width="14" height="3" rx="1" />
      <rect x="17" y="10.5" width="5" height="2" rx="1" />
      <path d="M3 10l-1 1v3l1 1v-5z" />
      <rect x="8" y="13" width="4" height="3" rx="0.5" />
      <line x1="16" y1="13" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="13" x2="12" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="7" width="3" height="3" rx="0.5" />
    </svg>
  )
}

export function TankIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <rect x="2" y="12" width="20" height="5" rx="2" />
      <rect x="8" y="8" width="8" height="4" rx="2" />
      <rect x="16" y="9" width="7" height="2" rx="1" />
      <rect x="1" y="17" width="22" height="3" rx="1.5" />
      <circle cx="4" cy="18.5" r="1.2" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="8" cy="18.5" r="1.2" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="12" cy="18.5" r="1.2" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="16" cy="18.5" r="1.2" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="20" cy="18.5" r="1.2" fill="none" stroke={color} strokeWidth="0.8" />
    </svg>
  )
}

// ── Defense Icons ────────────────────────────────────────

export function WallIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <rect x="2" y="4" width="9" height="4" rx="0.5" />
      <rect x="13" y="4" width="9" height="4" rx="0.5" />
      <rect x="2" y="10" width="6" height="4" rx="0.5" />
      <rect x="10" y="10" width="6" height="4" rx="0.5" />
      <rect x="18" y="10" width="4" height="4" rx="0.5" />
      <rect x="2" y="16" width="9" height="4" rx="0.5" />
      <rect x="13" y="16" width="9" height="4" rx="0.5" />
    </svg>
  )
}

export function SandbagIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <ellipse cx="6" cy="18" rx="5" ry="3" />
      <ellipse cx="18" cy="18" rx="5" ry="3" />
      <ellipse cx="12" cy="13" rx="5" ry="3" />
      <ellipse cx="12" cy="8" rx="4" ry="2.5" />
    </svg>
  )
}

export function TowerIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <line x1="6" y1="22" x2="8" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="22" x2="16" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="16" x2="17" y2="16" stroke={color} strokeWidth="1.5" />
      <rect x="5" y="8" width="14" height="2" rx="0.5" />
      <rect x="5" y="4" width="1.5" height="4" rx="0.5" />
      <rect x="17.5" y="4" width="1.5" height="4" rx="0.5" />
      <rect x="5" y="4" width="14" height="1.5" rx="0.5" />
    </svg>
  )
}

// ── Resource Icons ──────────────────────────────────────

export function MicrochipIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      {/* Chip body */}
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      {/* Die center */}
      <rect x="9" y="9" width="6" height="6" rx="0.5" opacity="0.4" />
      <circle cx="10.5" cy="10.5" r="0.8" opacity="0.6" />
      {/* Pins - left */}
      <rect x="3" y="8" width="3" height="1.5" rx="0.5" />
      <rect x="3" y="11.25" width="3" height="1.5" rx="0.5" />
      <rect x="3" y="14.5" width="3" height="1.5" rx="0.5" />
      {/* Pins - right */}
      <rect x="18" y="8" width="3" height="1.5" rx="0.5" />
      <rect x="18" y="11.25" width="3" height="1.5" rx="0.5" />
      <rect x="18" y="14.5" width="3" height="1.5" rx="0.5" />
      {/* Pins - top */}
      <rect x="8" y="3" width="1.5" height="3" rx="0.5" />
      <rect x="11.25" y="3" width="1.5" height="3" rx="0.5" />
      <rect x="14.5" y="3" width="1.5" height="3" rx="0.5" />
      {/* Pins - bottom */}
      <rect x="8" y="18" width="1.5" height="3" rx="0.5" />
      <rect x="11.25" y="18" width="1.5" height="3" rx="0.5" />
      <rect x="14.5" y="18" width="1.5" height="3" rx="0.5" />
    </svg>
  )
}

export function GoldCoinIcon({ size = 24, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <circle cx="12" cy="12" r="10" fill="#FFD700" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#CC9900" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#CC9900" strokeWidth="0.5" opacity="0.4" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#8B6914" fontFamily="var(--font-display)">G</text>
    </svg>
  )
}

// ── UI Icons ────────────────────────────────────────────

export function StarIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function BackArrowIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="10 18 4 12 10 6" />
    </svg>
  )
}

export function BattleIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M5 2l6 10-6 10h2l7-9 7 9h2l-6-10 6-10h-2l-7 9-7-9H5z" />
    </svg>
  )
}

export function TrainIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={style}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill={color} />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  )
}

export function CheckIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="4 12 9 17 20 6" />
    </svg>
  )
}

export function LockIcon({ size = 24, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" />
    </svg>
  )
}
