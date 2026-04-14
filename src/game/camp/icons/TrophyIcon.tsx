interface Props { size?: number; className?: string }

export function TrophyIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Cup */}
      <path d="M4 2H12V6C12 8.2 10.2 10 8 10C5.8 10 4 8.2 4 6V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.2" />
      {/* Left handle */}
      <path d="M4 4H3C2.4 4 2 4.4 2 5V5.5C2 6.3 2.7 7 3.5 7H4" stroke="currentColor" strokeWidth="1" />
      {/* Right handle */}
      <path d="M12 4H13C13.6 4 14 4.4 14 5V5.5C14 6.3 13.3 7 12.5 7H12" stroke="currentColor" strokeWidth="1" />
      {/* Stem */}
      <line x1="8" y1="10" x2="8" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
      {/* Base */}
      <line x1="5.5" y1="13" x2="10.5" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
