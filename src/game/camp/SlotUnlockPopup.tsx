/**
 * SlotUnlockPopup — celebration popup when a battle unlocks a new soldier slot.
 *
 * Full-screen overlay with centered card, gold/brass military theme.
 * Auto-dismisses after 4 seconds.
 */
import { useEffect } from 'react'
import { useCampStore, getMaxSoldierSlots } from '@stores/campStore'

interface SlotUnlockPopupProps {
  maxSlots: number
  onDismiss: () => void
}

export function SlotUnlockPopup({ maxSlots, onDismiss }: SlotUnlockPopupProps) {
  const soldiers = useCampStore((s) => s.soldiers)
  const filledCount = soldiers.length

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="slot-unlock-popup" onClick={onDismiss}>
      <div className="slot-unlock-card" onClick={(e) => e.stopPropagation()}>
        {/* Decorative top accent */}
        <div className="slot-unlock-accent" />

        {/* Title */}
        <div className="slot-unlock-title">NEW SLOT UNLOCKED!</div>

        {/* Subtitle */}
        <div className="slot-unlock-subtitle">
          YOU CAN NOW RECRUIT {maxSlots} SOLDIERS
        </div>

        {/* Slot grid visualization */}
        <div className="slot-unlock-grid">
          {Array.from({ length: maxSlots }, (_, i) => (
            <div
              key={i}
              className={`slot-unlock-slot ${i < filledCount ? 'slot-unlock-slot--filled' : 'slot-unlock-slot--empty'}`}
            >
              {i < filledCount ? (
                <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-1.5 5C9.7 7 9 7.7 9 8.5V13l-2.5 5.5a1 1 0 0 0 .9 1.5h1.2l1.4-4h4l1.4 4h1.2a1 1 0 0 0 .9-1.5L15 13V8.5C15 7.7 14.3 7 13.5 7h-3z" />
                </svg>
              ) : (
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Dismiss button */}
        <button className="game-btn slot-unlock-btn" onClick={onDismiss}>
          AWESOME!
        </button>
      </div>
    </div>
  )
}
