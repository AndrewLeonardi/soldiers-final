/**
 * NavIcons — premium gradient SVG icons for the bottom nav bar.
 *
 * Clash Royale-style: ~40px, SVG gradients for depth,
 * active state bumps brightness. Each icon uses unique
 * gradient IDs to avoid SVG collision.
 */

interface NavIconProps {
  size?: number
  active?: boolean
}

const SHADOW_FILTER = `
  <filter id="navIconShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.5)" />
  </filter>
`

// ── ShieldIcon — SOLDIERS tab ──────────────────────────
export function ShieldIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navShield'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#6a9a52' : '#5a8a42'} />
          <stop offset="50%" stopColor={active ? '#4f8a3a' : '#4a7a3a'} />
          <stop offset="100%" stopColor={active ? '#3a7028' : '#2e5a1e'} />
        </linearGradient>
        <linearGradient id={`${id}Trim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd966" />
          <stop offset="100%" stopColor="#b8942a" />
        </linearGradient>
        <linearGradient id={`${id}Star`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="100%" stopColor="#ccaa33" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Shield body */}
        <path
          d="M20 3 L34 10 L34 22 C34 30 27 36 20 38 C13 36 6 30 6 22 L6 10 Z"
          fill={`url(#${id}Fill)`}
          stroke={`url(#${id}Trim)`}
          strokeWidth="1.5"
        />
        {/* Inner highlight */}
        <path
          d="M20 6 L31 12 L31 22 C31 28.5 25.5 33.5 20 35.5 C14.5 33.5 9 28.5 9 22 L9 12 Z"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        {/* Inner chevron */}
        <path
          d="M14 19 L20 13 L26 19 L20 25 Z"
          fill={`url(#${id}Star)`}
          opacity="0.9"
        />
        {/* Star center */}
        <circle cx="20" cy="19" r="2.5" fill={`url(#${id}Trim)`} />
      </g>
    </svg>
  )
}

// ── CrossedSwordsIcon — ATTACK tab ─────────────────────
export function CrossedSwordsNavIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navSwords'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Blade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="50%" stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#888" />
        </linearGradient>
        <linearGradient id={`${id}Fire`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#ff5544' : '#ee3333'} />
          <stop offset="50%" stopColor={active ? '#dd2222' : '#cc1111'} />
          <stop offset="100%" stopColor={active ? '#aa1111' : '#881111'} />
        </linearGradient>
        <linearGradient id={`${id}Guard`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffa040" />
          <stop offset="100%" stopColor="#cc6600" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id={`${id}Glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Background fire glow */}
        <circle cx="20" cy="20" r="10" fill={`url(#${id}Fire)`} opacity="0.2" filter={`url(#${id}Glow)`} />
        {/* Left sword blade */}
        <path d="M8 34 L26 6" stroke={`url(#${id}Blade)`} strokeWidth="3" strokeLinecap="round" />
        {/* Left crossguard */}
        <rect x="11" y="25" width="10" height="3" rx="1.5" transform="rotate(-45 16 26.5)" fill={`url(#${id}Guard)`} />
        {/* Left pommel */}
        <circle cx="9.5" cy="32.5" r="2" fill={`url(#${id}Fire)`} />
        {/* Right sword blade */}
        <path d="M32 34 L14 6" stroke={`url(#${id}Blade)`} strokeWidth="3" strokeLinecap="round" />
        {/* Right crossguard */}
        <rect x="19" y="25" width="10" height="3" rx="1.5" transform="rotate(45 24 26.5)" fill={`url(#${id}Guard)`} />
        {/* Right pommel */}
        <circle cx="30.5" cy="32.5" r="2" fill={`url(#${id}Fire)`} />
        {/* Center clash spark */}
        <circle cx="20" cy="16" r="3" fill="#ffcc00" opacity={active ? 0.9 : 0.6} />
        <circle cx="20" cy="16" r="1.5" fill="#fff" opacity="0.8" />
      </g>
    </svg>
  )
}

// ── ChestIcon — STORE tab ──────────────────────────────
export function ChestIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navChest'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#9060cc' : '#7b4bb3'} />
          <stop offset="100%" stopColor={active ? '#5a3388' : '#4a2870'} />
        </linearGradient>
        <linearGradient id={`${id}Lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#a070dd' : '#8b5bc3'} />
          <stop offset="100%" stopColor={active ? '#7b4bb3' : '#6a3aa0'} />
        </linearGradient>
        <linearGradient id={`${id}Gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd966" />
          <stop offset="100%" stopColor="#b8942a" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Chest body */}
        <rect x="6" y="19" width="28" height="14" rx="3" fill={`url(#${id}Body)`} />
        {/* Chest lid */}
        <path
          d="M6 19 L6 14 C6 11 9 8 20 8 C31 8 34 11 34 14 L34 19 Z"
          fill={`url(#${id}Lid)`}
        />
        {/* Lid arch highlight */}
        <path
          d="M8 18 L8 14.5 C8 12.5 11 10 20 10 C29 10 32 12.5 32 14.5 L32 18"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        {/* Gold trim band */}
        <rect x="6" y="17.5" width="28" height="3" rx="1" fill={`url(#${id}Gold)`} />
        {/* Gold clasp */}
        <rect x="17" y="15" width="6" height="8" rx="2" fill={`url(#${id}Gold)`} />
        {/* Keyhole */}
        <circle cx="20" cy="21" r="1.5" fill="#4a2870" />
        <rect x="19.3" y="21" width="1.4" height="3" rx="0.5" fill="#4a2870" />
        {/* Sparkle */}
        <circle cx="28" cy="12" r="1" fill="#fff" opacity={active ? 0.8 : 0.4} />
      </g>
    </svg>
  )
}

// ── WeaponRackIcon — ARMORY tab ────────────────────────
export function WeaponRackIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navArmory'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#5588bb' : '#3a6a9a'} />
          <stop offset="50%" stopColor={active ? '#3a6a9a' : '#2a5580'} />
          <stop offset="100%" stopColor={active ? '#2a5580' : '#1a3a5a'} />
        </linearGradient>
        <linearGradient id={`${id}Metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d0d0d0" />
          <stop offset="50%" stopColor="#a0a0a0" />
          <stop offset="100%" stopColor="#707070" />
        </linearGradient>
        <linearGradient id={`${id}Wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6b3a" />
          <stop offset="100%" stopColor="#5a4422" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Background plate */}
        <rect x="7" y="7" width="26" height="26" rx="5" fill={`url(#${id}Steel)`} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* Rifle — diagonal */}
        <path d="M11 30 L29 10" stroke={`url(#${id}Metal)`} strokeWidth="2.5" strokeLinecap="round" />
        {/* Rifle stock */}
        <path d="M11 30 L9 33" stroke={`url(#${id}Wood)`} strokeWidth="3" strokeLinecap="round" />
        {/* Rifle barrel tip */}
        <circle cx="29" cy="10" r="1.5" fill={`url(#${id}Metal)`} />
        {/* Wrench — diagonal opposite */}
        <path d="M29 30 L13 12" stroke={`url(#${id}Metal)`} strokeWidth="2.5" strokeLinecap="round" />
        {/* Wrench head */}
        <path d="M11 12 C9 10 9 8 11 6 L15 10 Z" fill={`url(#${id}Metal)`} />
        {/* Wrench handle end */}
        <circle cx="29" cy="30" r="2" fill={`url(#${id}Metal)`} />
        {/* Center bolt */}
        <circle cx="20" cy="20" r="3" fill={`url(#${id}Steel)`} stroke={`url(#${id}Metal)`} strokeWidth="1.5" />
        <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.3)" />
      </g>
    </svg>
  )
}

// ── TargetIcon — TRAINING tab ──────────────────────────
export function TargetIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navTarget'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#ffb04a' : '#cc8a3a'} />
          <stop offset="50%" stopColor={active ? '#ee8a2a' : '#aa6a20'} />
          <stop offset="100%" stopColor={active ? '#cc6a14' : '#995010'} />
        </linearGradient>
        <linearGradient id={`${id}Ring`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#fff2cc' : '#e0d0a0'} />
          <stop offset="100%" stopColor={active ? '#ffd966' : '#b89740'} />
        </linearGradient>
        <radialGradient id={`${id}Center`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd966" />
          <stop offset="60%" stopColor="#cc6a14" />
          <stop offset="100%" stopColor="#6a3a08" />
        </radialGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Background plate */}
        <rect x="7" y="7" width="26" height="26" rx="5" fill={`url(#${id}Plate)`} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Outer ring */}
        <circle cx="20" cy="20" r="11" fill="none" stroke={`url(#${id}Ring)`} strokeWidth="2" opacity={active ? 0.95 : 0.75} />
        {/* Inner ring */}
        <circle cx="20" cy="20" r="6.5" fill="none" stroke={`url(#${id}Ring)`} strokeWidth="1.5" opacity={active ? 0.9 : 0.7} />
        {/* Crosshair ticks */}
        <line x1="20" y1="6" x2="20" y2="10" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="20" y1="30" x2="20" y2="34" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="6" y1="20" x2="10" y2="20" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="30" y1="20" x2="34" y2="20" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
        {/* Center dot */}
        <circle cx="20" cy="20" r="2.6" fill={`url(#${id}Center)`} stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        {/* Highlight */}
        <circle cx="19" cy="19" r="0.9" fill="#fff" opacity={active ? 0.9 : 0.5} />
      </g>
    </svg>
  )
}

// ── GearCogIcon — SETTINGS tab ─────────────────────────
export function GearCogIcon({ size = 40, active = false }: NavIconProps) {
  const id = 'navGear'
  // Generate gear tooth path with 8 teeth
  const cx = 20, cy = 20, outerR = 16, innerR = 12, teeth = 8
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2 - Math.PI / 2
    const a2 = ((i + 0.35) / teeth) * Math.PI * 2 - Math.PI / 2
    const a3 = ((i + 0.65) / teeth) * Math.PI * 2 - Math.PI / 2
    const a4 = ((i + 1) / teeth) * Math.PI * 2 - Math.PI / 2
    const pts = [
      [cx + outerR * Math.cos(a1), cy + outerR * Math.sin(a1)],
      [cx + outerR * Math.cos(a2), cy + outerR * Math.sin(a2)],
      [cx + innerR * Math.cos(a3), cy + innerR * Math.sin(a3)],
      [cx + innerR * Math.cos(a4), cy + innerR * Math.sin(a4)],
    ]
    d += (i === 0 ? 'M' : 'L') + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
  }
  d += 'Z'

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}Fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#8a8a7a' : '#6a6a5a'} />
          <stop offset="50%" stopColor={active ? '#6a6a5a' : '#555548'} />
          <stop offset="100%" stopColor={active ? '#555548' : '#3a3a30'} />
        </linearGradient>
        <linearGradient id={`${id}Shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter={`url(#${id}Shadow)`}>
        {/* Gear body */}
        <path d={d} fill={`url(#${id}Fill)`} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        {/* Metallic shine overlay */}
        <path d={d} fill={`url(#${id}Shine)`} />
        {/* Inner ring */}
        <circle cx="20" cy="20" r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {/* Center axle */}
        <circle cx="20" cy="20" r="4" fill={`url(#${id}Fill)`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* Axle highlight */}
        <circle cx="19" cy="19" r="1.5" fill="rgba(255,255,255,0.2)" />
      </g>
    </svg>
  )
}
