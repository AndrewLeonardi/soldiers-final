interface Props { size?: number; className?: string }

export function CrossedSwordsIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Left blade */}
      <line x1="2" y1="14" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left crossguard */}
      <line x1="3" y1="10" x2="6" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right blade */}
      <line x1="14" y1="14" x2="3" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right crossguard */}
      <line x1="10" y1="10" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
