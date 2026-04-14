interface Props { size?: number; className?: string }

export function MedicIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Medical cross */}
      <rect x="6" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1" />
      <rect x="2" y="6" width="12" height="4" rx="1" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
