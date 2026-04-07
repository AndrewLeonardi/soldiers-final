import { useEffect, useRef, useState, useCallback } from 'react'
import { useTutorialStore } from '@stores/tutorialStore'
import type { TutorialStep } from '@stores/tutorialStore'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { useTrainingStore } from '@stores/trainingStore'
import * as sfx from '@audio/sfx'
import { GoldCoinIcon, MicrochipIcon, StarIcon } from './ToyIcons'
import '@styles/tutorial.css'

// ── Step config ─────────────────────────────────────
interface SpotlightConfig {
  selector: string
  bubble: string
  bubblePosition: 'above' | 'below'
}

const SPOTLIGHT_STEPS: Partial<Record<TutorialStep, SpotlightConfig>> = {
  recruit: {
    selector: '.barracks-recruit-btn',
    bubble: 'Recruit your first soldier!',
    bubblePosition: 'above',
  },
  'tap-rocket': {
    selector: '.wpn-card.locked',
    bubble: 'This weapon is locked. Tap it!',
    bubblePosition: 'above',
  },
  'begin-training': {
    selector: '.training-cta-btn',
    bubble: 'Spend compute to train their brain!',
    bubblePosition: 'above',
  },
  'save-training': {
    selector: '.graduation-btn',
    bubble: 'Your soldier learned a new skill!',
    bubblePosition: 'above',
  },
  deploy: {
    selector: '.barracks-deploy',
    bubble: 'Time to fight! Deploy your army.',
    bubblePosition: 'above',
  },
  fight: {
    selector: '.battle-btn',
    bubble: 'Send them in!',
    bubblePosition: 'above',
  },
}

// ── Spotlight component ─────────────────────────────
function Spotlight({ config }: { config: SpotlightConfig }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const rafRef = useRef(0)

  const updateRect = useCallback(() => {
    const el = document.querySelector(config.selector)
    if (el) {
      const r = el.getBoundingClientRect()
      // Only update if element is actually visible (has dimensions)
      if (r.width > 0 && r.height > 0) {
        setRect(r)
      } else {
        setRect(null)
      }
    } else {
      setRect(null)
    }
    rafRef.current = requestAnimationFrame(updateRect)
  }, [config.selector])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateRect)
    return () => cancelAnimationFrame(rafRef.current)
  }, [updateRect])

  // If target element not found/visible, show as hint instead of spotlight
  if (!rect) {
    return (
      <div className="tutorial-hint top">
        {config.bubble}
      </div>
    )
  }

  const pad = 10
  const x = rect.left - pad
  const y = rect.top - pad
  const w = rect.width + pad * 2
  const h = rect.height + pad * 2
  const vw = window.innerWidth
  const vh = window.innerHeight

  // 4 mask divs around the hole
  const maskStyle: React.CSSProperties = {
    position: 'fixed',
    background: 'rgba(0, 0, 0, 0.78)',
    pointerEvents: 'auto',
  }

  // Calculate bubble position — clamp to screen edges
  const targetCenterX = x + w / 2
  const bubbleMaxWidth = 300
  const screenPad = 16

  // Clamp bubble center so it doesn't overflow screen
  const clampedLeft = Math.max(
    screenPad + bubbleMaxWidth / 2,
    Math.min(targetCenterX, vw - screenPad - bubbleMaxWidth / 2)
  )

  // Arrow offset: how far the arrow needs to shift from bubble center to point at target
  const arrowOffset = targetCenterX - clampedLeft

  const bubbleStyle: React.CSSProperties = config.bubblePosition === 'above'
    ? {
        bottom: `${vh - y + 16}px`,
        left: `${clampedLeft}px`,
        transform: 'translateX(-50%)',
        maxWidth: `${bubbleMaxWidth}px`,
      }
    : {
        top: `${y + h + 16}px`,
        left: `${clampedLeft}px`,
        transform: 'translateX(-50%)',
        maxWidth: `${bubbleMaxWidth}px`,
      }

  // Arrow position via CSS custom property
  const arrowStyle = { '--arrow-offset': `${arrowOffset}px` } as React.CSSProperties

  return (
    <>
      {/* Top mask */}
      <div style={{ ...maskStyle, top: 0, left: 0, right: 0, height: Math.max(0, y) }} />
      {/* Bottom mask */}
      <div style={{ ...maskStyle, top: y + h, left: 0, right: 0, bottom: 0 }} />
      {/* Left mask */}
      <div style={{ ...maskStyle, top: y, left: 0, width: Math.max(0, x), height: h }} />
      {/* Right mask */}
      <div style={{ ...maskStyle, top: y, left: x + w, right: 0, height: h }} />
      <div
        className="tutorial-ring"
        style={{ left: x, top: y, width: w, height: h }}
      />
      <div
        className={`tutorial-bubble ${config.bubblePosition}`}
        style={{ ...bubbleStyle, ...arrowStyle }}
      >
        <div className="tutorial-bubble-text">{config.bubble}</div>
      </div>
    </>
  )
}

// ── Animated counter ────────────────────────────────
function AnimatedCounter({ target, className }: { target: number; className: string }) {
  const [value, setValue] = useState(0)
  const startTime = useRef(0)

  useEffect(() => {
    startTime.current = performance.now()
    const duration = 800
    function tick() {
      const elapsed = performance.now() - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])

  return <div className={`tutorial-counter ${className}`}>{value}</div>
}

// ── Main overlay ────────────────────────────────────
export function TutorialOverlay() {
  const step = useTutorialStore((s) => s.step)
  const active = useTutorialStore((s) => s.active)
  const advanceTo = useTutorialStore((s) => s.advanceTo)
  const completeTutorial = useTutorialStore((s) => s.completeTutorial)

  // Watch for passive transitions
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)
  const trainingStatus = useTrainingStore((s) => s.status)
  const phase = useGameStore((s) => s.phase)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const result = useGameStore((s) => s.result)

  // tap-soldier: detect when player opens detail
  useEffect(() => {
    if (active && step === 'tap-soldier' && detailSoldierId) {
      advanceTo('tap-rocket')
    }
  }, [active, step, detailSoldierId, advanceTo])

  // watch-training: detect graduation
  useEffect(() => {
    if (active && step === 'watch-training' && trainingStatus === 'graduated') {
      advanceTo('save-training')
    }
  }, [active, step, trainingStatus, advanceTo])

  // Auto-set training speed to 10x during tutorial
  useEffect(() => {
    if (active && step === 'watch-training') {
      useTrainingStore.setState({ simSpeed: 10 })
    }
  }, [active, step])

  // deploy: wait until detail is closed AND we're on the barracks,
  // then show spotlight. Detect transition to placement → show Intel explanation.
  useEffect(() => {
    if (active && step === 'deploy' && phase === 'placement') {
      advanceTo('explain-intel')
    }
  }, [active, step, phase, advanceTo])

  // explain-intel: after player reads the modal, advance to place-soldier
  // (handled by the Continue button in the modal below)

  // place-soldier: detect unit placed
  useEffect(() => {
    if (active && step === 'place-soldier' && playerUnits.length > 0) {
      advanceTo('fight')
    }
  }, [active, step, playerUnits.length, advanceTo])

  // Detect victory → show completion
  useEffect(() => {
    if (active && phase === 'result' && result === 'victory') {
      advanceTo('complete')
    }
  }, [active, phase, result, advanceTo])

  // Play sounds on step transitions
  useEffect(() => {
    if (!active) return
    if (step === 'welcome-gold' || step === 'welcome-compute') {
      sfx.modalAppear()
    } else if (step === 'complete') {
      sfx.completionFanfare()
    } else {
      sfx.stepAdvance()
    }
  }, [active, step])

  if (!active) return null

  // ── Modal steps ─────────────────────────────────
  if (step === 'welcome-gold') {
    return (
      <div className="tutorial-overlay blocking">
        <div className="tutorial-backdrop" />
        <div className="tutorial-card">
          <div className="tutorial-icon gold-icon">
            <GoldCoinIcon size={44} />
          </div>
          <div className="tutorial-title">Welcome, Commander</div>
          <div className="tutorial-body">
            This is <strong>Gold</strong>. It recruits soldiers
            and builds defenses for the battlefield.
          </div>
          <AnimatedCounter target={500} className="gold-counter" />
          <button
            className="tutorial-continue-btn"
            onPointerDown={() => {
              useGameStore.setState({ gold: 500 })
              advanceTo('welcome-compute')
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (step === 'welcome-compute') {
    return (
      <div className="tutorial-overlay blocking">
        <div className="tutorial-backdrop" />
        <div className="tutorial-card compute-reveal">
          <div className="tutorial-icon compute-icon">
            <MicrochipIcon size={44} color="white" />
          </div>
          <div className="tutorial-title">This is Compute</div>
          <div className="tutorial-body">
            Compute trains your soldiers' <strong>brains</strong>.
            It's rare. It's powerful. Use it wisely.
          </div>
          <AnimatedCounter target={200} className="compute-counter" />
          <button
            className="tutorial-continue-btn"
            onPointerDown={() => {
              useGameStore.setState({ compute: 200 })
              advanceTo('recruit')
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (step === 'explain-intel') {
    return (
      <div className="tutorial-overlay blocking">
        <div className="tutorial-backdrop" />
        <div className="tutorial-card">
          <div className="tutorial-icon" style={{ fontSize: '44px' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="4" rx="1" fill="#b8922e" />
              <rect x="3" y="7" width="18" height="12" rx="2" fill="#d4aa40" stroke="#b8922e" strokeWidth="1.5" />
              <path d="M3 9h18" stroke="#b8922e" strokeWidth="0.8" />
              <circle cx="12" cy="14" r="2" fill="#b8922e" />
              <rect x="11.5" y="14" width="1" height="2" fill="#b8922e" />
            </svg>
          </div>
          <div className="tutorial-title">Defend the Intelligence!</div>
          <div className="tutorial-body">
            The enemy is marching toward your <strong>intelligence briefcase</strong>.
            If they reach it, you lose! Place soldiers and defenses to stop them.
          </div>
          <button
            className="tutorial-continue-btn"
            onPointerDown={() => advanceTo('place-soldier')}
          >
            Got it!
          </button>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="tutorial-overlay blocking">
        <div className="tutorial-backdrop" />
        <div className="tutorial-card complete-card">
          <div className="tutorial-stars">
            <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
            <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
            <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
          </div>
          <div className="tutorial-title">You're Ready, Commander</div>
          <div className="tutorial-body">
            Build your army. Train their brains. Conquer the battlefield.
          </div>
          <button
            className="tutorial-continue-btn"
            onPointerDown={() => {
              completeTutorial()
              // Keep the soldiers the player recruited during the tutorial
              // Give them proper starting resources for campaign
              useGameStore.setState({ compute: 500 })
              useGameStore.getState().goToWorldSelect()
            }}
          >
            Let's Go!
          </button>
        </div>
      </div>
    )
  }

  // ── Hint-only steps (no spotlight, no mask) ─────
  if (step === 'tap-soldier') {
    return (
      <div className="tutorial-overlay">
        <div className="tutorial-hint above-tray">
          Tap your soldier to see their loadout
        </div>
      </div>
    )
  }

  // ── Spotlight steps ─────────────────────────────
  const spotlightConfig = SPOTLIGHT_STEPS[step]
  if (spotlightConfig) {
    // deploy step: if detail screen is still open, show as hint instead
    // (the deploy button only exists on the barracks screen)
    if (step === 'deploy' && detailSoldierId) {
      return (
        <div className="tutorial-overlay">
          <div className="tutorial-hint top">
            Go back to the barracks first
          </div>
        </div>
      )
    }

    return (
      <div className="tutorial-overlay">
        <Spotlight config={spotlightConfig} />
      </div>
    )
  }

  // ── Other hint steps (no mask) ─────────────────
  if (step === 'watch-training') {
    return (
      <div className="tutorial-overlay">
        <div className="tutorial-hint top">
          Watch your soldier learn...
        </div>
      </div>
    )
  }

  if (step === 'place-soldier') {
    return (
      <div className="tutorial-overlay">
        <div className="tutorial-hint middle">
          Select your soldier's card, then tap the battlefield
        </div>
      </div>
    )
  }

  return null
}
