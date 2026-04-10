/**
 * ComputeCounter — beveled chip showing the persisted compute value.
 *
 * Sprint 1, Subsystem 5. Uses an animated tween — when the value changes,
 * it lerps over ~300ms instead of snapping. Even though nothing changes
 * the value yet in sprint 1, the animation pattern is locked for sprint 2.
 */
import { useRef, useEffect, useState } from 'react'
import { useCampStore } from '@stores/campStore'
import '@styles/camp-ui.css'

export function ComputeCounter() {
  const compute = useCampStore((s) => s.compute)
  const [displayValue, setDisplayValue] = useState(compute)
  const animRef = useRef<number | null>(null)
  const startRef = useRef(compute)
  const targetRef = useRef(compute)
  const startTimeRef = useRef(0)

  useEffect(() => {
    // Animate from current display value to new compute value
    startRef.current = displayValue
    targetRef.current = compute
    startTimeRef.current = performance.now()

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const DURATION = 300 // ms

    function tick() {
      const elapsed = performance.now() - startTimeRef.current
      const t = Math.min(elapsed / DURATION, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const value = Math.round(startRef.current + (targetRef.current - startRef.current) * eased)
      setDisplayValue(value)

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        animRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [compute]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="compute-counter">
      <svg className="compute-counter-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Chip body */}
        <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1"/>
        {/* Side pins — left */}
        <line x1="1" y1="5.5" x2="3" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="1" y1="10.5" x2="3" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        {/* Side pins — right */}
        <line x1="13" y1="5.5" x2="15" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="13" y1="10.5" x2="15" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        {/* Side pins — top */}
        <line x1="5.5" y1="1" x2="5.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="10.5" y1="1" x2="10.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        {/* Side pins — bottom */}
        <line x1="5.5" y1="13" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="10.5" y1="13" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        {/* Center lightning bolt */}
        <path d="M9 5.5L7.2 8.3H8.8L7 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="compute-counter-value">{displayValue}</span>
    </div>
  )
}
