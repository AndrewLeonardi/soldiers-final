/**
 * CurrencyPill — generic reusable currency display pill.
 *
 * Sprint A. Extracted tween animation pattern from ComputeCounter.
 * Shows: icon + animated number + optional green "+" button.
 *
 * Used by both ComputeCounter and GoldCounter.
 */
import { useRef, useEffect, useState, type ReactNode } from 'react'
import '@styles/camp-ui.css'

interface CurrencyPillProps {
  icon: ReactNode
  value: number
  color: string       // accent color (border glow, text)
  onPlusClick?: () => void
  className?: string
}

export function CurrencyPill({ icon, value, color, onPlusClick, className }: CurrencyPillProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const animRef = useRef<number | null>(null)
  const startRef = useRef(value)
  const targetRef = useRef(value)
  const startTimeRef = useRef(0)

  useEffect(() => {
    startRef.current = displayValue
    targetRef.current = value
    startTimeRef.current = performance.now()

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const DURATION = 300

    function tick() {
      const elapsed = performance.now() - startTimeRef.current
      const t = Math.min(elapsed / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(startRef.current + (targetRef.current - startRef.current) * eased)
      setDisplayValue(v)

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
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`currency-pill ${className ?? ''}`}
      style={{ '--pill-color': color } as React.CSSProperties}
    >
      <span className="currency-pill-icon">{icon}</span>
      <span className="currency-pill-value">{displayValue}</span>
      {onPlusClick && (
        <button className="currency-pill-plus" onClick={onPlusClick} aria-label="Add more">
          +
        </button>
      )}
    </div>
  )
}
