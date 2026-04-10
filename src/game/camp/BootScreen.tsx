/**
 * BootScreen — toy-soldier silhouette + game name + 1-second hold + crossfade.
 *
 * Sprint 1, Subsystem 4. Not a spinner. Not a "Loading..." string.
 * Shows for exactly 1 second, then crossfades into the diorama.
 */
import { useState, useEffect } from 'react'

interface BootScreenProps {
  onDone: () => void
}

export function BootScreen({ onDone }: BootScreenProps) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    // Hold for 1 second, then fade out over 0.5s
    const holdTimer = setTimeout(() => {
      setOpacity(0)
    }, 1000)

    const doneTimer = setTimeout(() => {
      onDone()
    }, 1500)

    return () => {
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
      background: '#0c1408',
      transition: 'opacity 0.5s ease-out',
      opacity,
      pointerEvents: opacity > 0 ? 'all' : 'none',
    }}>
      {/* Toy soldier silhouette — simple CSS shape */}
      <div style={{
        width: 60,
        height: 80,
        marginBottom: 24,
        position: 'relative',
      }}>
        {/* Helmet */}
        <div style={{
          width: 28,
          height: 18,
          borderRadius: '50% 50% 40% 40%',
          background: '#3a5a2a',
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
        }} />
        {/* Body */}
        <div style={{
          width: 22,
          height: 30,
          background: '#3a5a2a',
          borderRadius: '4px 4px 2px 2px',
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
        }} />
        {/* Base/stand */}
        <div style={{
          width: 32,
          height: 8,
          background: '#2a4a1a',
          borderRadius: '50%',
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
        }} />
      </div>

      {/* Game name */}
      <h1 style={{
        fontFamily: "'Black Ops One', cursive",
        color: '#D4AA40',
        fontSize: '1.8rem',
        letterSpacing: 3,
        margin: 0,
        textTransform: 'uppercase',
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
    </div>
  )
}
