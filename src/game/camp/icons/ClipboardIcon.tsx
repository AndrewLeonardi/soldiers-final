interface Props { size?: number; className?: string }

export function ClipboardIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Board */}
      <rect x="3" y="3" width="10" height="12" rx="1.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.2" />
      {/* Clip */}
      <path d="M6 3V2C6 1.4 6.4 1 7 1H9C9.6 1 10 1.4 10 2V3" stroke="currentColor" strokeWidth="1.2" />
      {/* Lines */}
      <line x1="5.5" y1="6.5" x2="10.5" y2="6.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="5.5" y1="9" x2="10.5" y2="9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="5.5" y1="11.5" x2="8.5" y2="11.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  )
}
