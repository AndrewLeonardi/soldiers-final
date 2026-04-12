/**
 * GoldCoinIcon — reusable SVG gold coin icon for gold currency.
 *
 * Sprint A. Matches the ComputeIcon interface (size, className).
 * Ported from ToyIcons.tsx GoldCoinIcon, adapted for 16x16 viewBox.
 */

interface GoldCoinIconProps {
  size?: number
  className?: string
}

export function GoldCoinIcon({ size = 16, className }: GoldCoinIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="8" cy="8" r="7" fill="#FFD700" />
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="#CC9900" strokeWidth="1" />
      <text x="8" y="11.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#8B6914" fontFamily="var(--font-display)">G</text>
    </svg>
  )
}
