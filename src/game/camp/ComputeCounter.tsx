/**
 * ComputeCounter — beveled chip showing the persisted compute value.
 *
 * Sprint 1, Subsystem 5. Uses an animated tween — when the value changes,
 * it lerps over ~300ms instead of snapping. Even though nothing changes
 * the value yet in sprint 1, the animation pattern is locked for sprint 2.
 */
import { useRef, useEffect, useState } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { ComputeIcon } from './ComputeIcon'
import '@styles/camp-ui.css'

export function ComputeCounter() {
  const compute = useCampStore((s) => s.compute)
  const setStoreSheetOpen = useSceneStore((s) => s.setStoreSheetOpen)
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
    <div className="compute-counter" onClick={() => setStoreSheetOpen(true)} style={{ cursor: 'pointer' }}>
      <ComputeIcon size={16} className="compute-counter-icon" />
      <span className="compute-counter-value">{displayValue}</span>
    </div>
  )
}
