interface Props { size?: number; className?: string }

export function StorefrontIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Awning */}
      <path d="M2 6L3 2H13L14 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 6C2 7 3 7.5 4 7.5C5 7.5 5.5 7 5.5 6C5.5 7 6 7.5 8 7.5C10 7.5 10.5 7 10.5 6C10.5 7 11 7.5 12 7.5C13 7.5 14 7 14 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Building */}
      <rect x="3" y="7" width="10" height="7" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.15" />
      {/* Door */}
      <rect x="6.5" y="10" width="3" height="4" stroke="currentColor" strokeWidth="0.8" rx="0.5" />
    </svg>
  )
}
