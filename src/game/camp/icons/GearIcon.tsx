interface Props { size?: number; className?: string }

export function GearIcon({ size = 16, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {/* Outer gear shape with 6 teeth */}
      <path
        d="M7 1H9L9.4 3.1C9.9 3.3 10.3 3.5 10.7 3.8L12.7 3.1L13.7 4.8L12.1 6.2C12.2 6.5 12.2 6.8 12.2 7.1V8.9C12.2 9.2 12.2 9.5 12.1 9.8L13.7 11.2L12.7 12.9L10.7 12.2C10.3 12.5 9.9 12.7 9.4 12.9L9 15H7L6.6 12.9C6.1 12.7 5.7 12.5 5.3 12.2L3.3 12.9L2.3 11.2L3.9 9.8C3.8 9.5 3.8 9.2 3.8 8.9V7.1C3.8 6.8 3.8 6.5 3.9 6.2L2.3 4.8L3.3 3.1L5.3 3.8C5.7 3.5 6.1 3.3 6.6 3.1L7 1Z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Center circle */}
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
