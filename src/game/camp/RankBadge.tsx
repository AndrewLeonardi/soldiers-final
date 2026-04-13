/**
 * RankBadge — reusable inline rank display.
 *
 * Sprint C. Shows colored badge text (chevrons/stars) based on soldier XP.
 * Derives rank internally — caller only passes `xp`.
 */
import { getRank } from '@config/ranks'

interface RankBadgeProps {
  xp: number
  size?: 'sm' | 'md'
  showName?: boolean
}

export function RankBadge({ xp, size = 'sm', showName = false }: RankBadgeProps) {
  const rank = getRank(xp)

  const fontSize = size === 'sm' ? 10 : 13
  const nameSize = size === 'sm' ? 8 : 10

  return (
    <span
      className="rank-badge"
      style={{
        color: rank.color,
        fontSize,
        fontFamily: "'Black Ops One', cursive",
        letterSpacing: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {rank.badge || '—'}
      {showName && (
        <span
          style={{
            marginLeft: 4,
            fontSize: nameSize,
            letterSpacing: 2,
            opacity: 0.8,
          }}
        >
          {rank.name.toUpperCase()}
        </span>
      )}
    </span>
  )
}
