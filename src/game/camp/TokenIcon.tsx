/**
 * TokenIcon — reusable SVG microchip icon for token currency.
 *
 * Sprint 6, Phase 1. Extracted from TokenCounter.tsx so every icon
 * can be replaced with a crisp, scalable SVG chip.
 */

interface TokenIconProps {
  size?: number
  className?: string
}

export function TokenIcon({ size = 16, className }: TokenIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Chip body */}
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1"/>
      {/* Side pins — left */}
      <line x1="1" y1="5.5" x2="3" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="1" y1="10.5" x2="3" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Side pins — right */}
      <line x1="13" y1="5.5" x2="15" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="13" y1="10.5" x2="15" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Side pins — top */}
      <line x1="5.5" y1="1" x2="5.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="10.5" y1="1" x2="10.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Side pins — bottom */}
      <line x1="5.5" y1="13" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="10.5" y1="13" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Center lightning bolt */}
      <path d="M9 5.5L7.2 8.3H8.8L7 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
