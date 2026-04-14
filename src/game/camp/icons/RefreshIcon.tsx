interface Props { size?: number; className?: string }

export function RefreshIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Circular arrow */}
      <path
        d="M13 8C13 10.8 10.8 13 8 13C5.2 13 3 10.8 3 8C3 5.2 5.2 3 8 3C9.8 3 11.3 4 12.2 5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <path d="M13 2.5V5.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
