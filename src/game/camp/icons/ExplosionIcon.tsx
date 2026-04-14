interface Props { size?: number; className?: string }

export function ExplosionIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Starburst */}
      <path
        d="M8 1L9.2 5.5L13.5 3.5L10.5 7L15 8L10.5 9L13.5 12.5L9.2 10.5L8 15L6.8 10.5L2.5 12.5L5.5 9L1 8L5.5 7L2.5 3.5L6.8 5.5Z"
        fill="currentColor"
        opacity="0.25"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
