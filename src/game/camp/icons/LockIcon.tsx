interface Props { size?: number; className?: string; color?: string }

export function LockIcon({ size = 16, className, color = 'currentColor' }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', color }}>
      {/* Body */}
      <rect x="3.5" y="7" width="9" height="7.5" rx="1.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.2" />
      {/* Shackle */}
      <path d="M5.5 7V5C5.5 3.6 6.6 2.5 8 2.5C9.4 2.5 10.5 3.6 10.5 5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Keyhole */}
      <circle cx="8" cy="10.5" r="1" fill="currentColor" />
    </svg>
  )
}
