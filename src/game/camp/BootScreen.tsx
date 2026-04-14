/**
 * BootScreen — military-themed deployment screen with progress bar.
 *
 * Sprint 4 polish. Scanline overlay, progress bar, "DEPLOYING TO CAMP..."
 * subtitle, vignette effect. Holds for 1.8s then crossfades.
 */
import { useState, useEffect } from 'react'

interface BootScreenProps {
  onDone: () => void
}

export function BootScreen({ onDone }: BootScreenProps) {
  const [opacity, setOpacity] = useState(1)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate progress bar
    const start = performance.now()
    const duration = 1600
    let raf: number

    const tick = () => {
      const elapsed = performance.now() - start
      const t = Math.min(elapsed / duration, 1)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Hold for 1.8 seconds, then fade out over 0.5s
    const holdTimer = setTimeout(() => {
      setOpacity(0)
    }, 1800)

    const doneTimer = setTimeout(() => {
      onDone()
    }, 2300)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0c1408 0%, #1a2a12 50%, #0c1408 100%)',
      transition: 'opacity 0.5s ease-out',
      opacity,
      pointerEvents: opacity > 0 ? 'all' : 'none',
      boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6)',
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Game name */}
      <h1 style={{
        fontFamily: "'Black Ops One', cursive",
        color: '#D4AA40',
        fontSize: '1.8rem',
        letterSpacing: 3,
        margin: 0,
        textTransform: 'uppercase',
        textShadow: '0 0 20px rgba(212, 170, 64, 0.3)',
      }}>
        TOY SOLDIERS
      </h1>

      <p style={{
        fontFamily: "'Black Ops One', cursive",
        color: 'rgba(212, 170, 64, 0.4)',
        fontSize: '0.7rem',
        letterSpacing: 4,
        marginTop: 8,
        textTransform: 'uppercase',
      }}>
        TRAINING EDITION
      </p>

      {/* Progress bar */}
      <div style={{
        width: '60%',
        maxWidth: 240,
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        marginTop: 28,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress * 100}%`,
          height: '100%',
          borderRadius: 2,
          background: 'linear-gradient(90deg, #3a5a2a, #5a9a4a)',
          transition: 'width 0.05s linear',
        }} />
      </div>

      {/* Deploying text */}
      <p style={{
        fontFamily: "'Black Ops One', cursive",
        color: 'rgba(255, 255, 255, 0.25)',
        fontSize: '0.55rem',
        letterSpacing: 4,
        marginTop: 12,
        textTransform: 'uppercase',
      }}>
        DEPLOYING TO CAMP...
      </p>
    </div>
  )
}
