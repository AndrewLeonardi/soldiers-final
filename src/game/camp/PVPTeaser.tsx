/**
 * PVPTeaser — locked PVP arena banner that creates aspiration for level 5.
 *
 * Shows progress toward unlocking PVP. When level >= 5,
 * switches to a "COMING SOON" state with brighter styling.
 */
import { useCampStore } from '@stores/campStore'
import { LockIcon } from './icons/LockIcon'

const PVP_UNLOCK_LEVEL = 5

export function PVPTeaser() {
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const level = Object.keys(battlesCompleted).length + 1
  const unlocked = level >= PVP_UNLOCK_LEVEL
  const progress = Math.min(level / PVP_UNLOCK_LEVEL, 1)

  return (
    <div className={`pvp-teaser ${unlocked ? 'pvp-teaser--unlocked' : ''}`}>
      {/* Left icon area */}
      <div className="pvp-teaser-icon">
        {unlocked ? (
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
            <path
              d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
              fill="#ffd966"
              stroke="#b8942a"
              strokeWidth="1"
            />
          </svg>
        ) : (
          <div className="pvp-teaser-lock-glow">
            <LockIcon size={24} />
          </div>
        )}
      </div>

      {/* Center text */}
      <div className="pvp-teaser-center">
        <div className="pvp-teaser-title">PVP ARENA</div>
        <div className="pvp-teaser-subtitle">
          {unlocked ? 'COMING SOON' : 'REQUIRES LEVEL 5'}
        </div>
        {/* Progress bar */}
        {!unlocked && (
          <div className="pvp-teaser-bar">
            <div
              className="pvp-teaser-bar-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Right level indicator */}
      <div className="pvp-teaser-level">
        {unlocked ? (
          <span className="pvp-teaser-level-ready">READY</span>
        ) : (
          <span className="pvp-teaser-level-count">
            LVL {level}<span className="pvp-teaser-level-sep">/</span>5
          </span>
        )}
      </div>
    </div>
  )
}
