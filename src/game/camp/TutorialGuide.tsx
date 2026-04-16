/**
 * TutorialGuide — camp tutorial overlay system (v5 — simplified onboarding).
 *
 * Sprint E. 8-step flow:
 *   welcome → claim tokens → recruit → recruit-wait → train (auto) →
 *   training-active → unlock-weapons → complete
 *
 * Key changes from v4:
 *   - No gold references anywhere
 *   - Token chest modal before training (claim daily reward)
 *   - Training auto-commits (rifle, 15s, 30 tokens) — no config required
 *   - Unlock-weapons modal explains progression hook
 *   - 4x GA speed boost during training observation
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { TUTORIAL_STEPS } from '@config/tutorialSteps'
import type { TutorialStepDef } from '@config/tutorialSteps'
import { StarIcon } from './icons/StarIcon'
import { track } from '@analytics/events'
import { TokenChip } from './TokenChip'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// ── Auto-advance watcher (for 'action' steps) ──
function useAutoAdvance(step: TutorialStepDef | undefined) {
  const tutorialStep = useSceneStore((s) => s.tutorialStep)
  const setTutorialStep = useSceneStore((s) => s.setTutorialStep)

  const soldierCount = useCampStore((s) => s.soldiers.length)
  const observingSlotIndex = useSceneStore((s) => s.observingSlotIndex)

  useEffect(() => {
    if (!step || step.advanceOn !== 'action') return

    let shouldAdvance = false
    switch (step.id) {
      case 'recruit-wait':
        shouldAdvance = soldierCount >= 1
        break
      case 'training-active':
        shouldAdvance = observingSlotIndex === null
        break
    }

    if (shouldAdvance) {
      const timer = setTimeout(() => {
        setTutorialStep(tutorialStep + 1)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [step, soldierCount, observingSlotIndex, tutorialStep, setTutorialStep])
}

// ── Step-entry sound effects ──
function useStepSounds(step: TutorialStepDef | undefined) {
  useEffect(() => {
    if (!step) return
    if (step.type === 'wait') return

    if (step.id === 'complete') {
      sfx.completionFanfare()
    } else if (step.id === 'recruit-wait') {
      sfx.recruitChime()
    } else if (step.id === 'training-active') {
      sfx.stepAdvance()
    } else if (step.id === 'unlock-weapons') {
      sfx.graduationFanfare()
    } else {
      sfx.stepAdvance()
    }
  }, [step])
}

// ── Training speed boost during tutorial ──
function useTutorialSpeedBoost(step: TutorialStepDef | undefined) {
  useEffect(() => {
    if (step?.id === 'training-active') {
      useCampTrainingStore.getState().setTutorialSpeedBoost(4)
      return () => {
        useCampTrainingStore.getState().setTutorialSpeedBoost(1)
      }
    }
  }, [step?.id])
}

// ── Animated counter ──
function AnimatedCounter({ target }: { target: number }) {
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

  return (
    <div className="tutorial-counter tutorial-counter-tokens">
      <TokenChip size={20} /> {value}
    </div>
  )
}

// ── Token chip icon (inline SVG) ──
function TokenChipIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="0.5" opacity="0.4" />
      <circle cx="10.5" cy="10.5" r="0.8" opacity="0.6" />
      <rect x="3" y="8" width="3" height="1.5" rx="0.5" />
      <rect x="3" y="11.25" width="3" height="1.5" rx="0.5" />
      <rect x="3" y="14.5" width="3" height="1.5" rx="0.5" />
      <rect x="18" y="8" width="3" height="1.5" rx="0.5" />
      <rect x="18" y="11.25" width="3" height="1.5" rx="0.5" />
      <rect x="18" y="14.5" width="3" height="1.5" rx="0.5" />
      <rect x="8" y="3" width="1.5" height="3" rx="0.5" />
      <rect x="11.25" y="3" width="1.5" height="3" rx="0.5" />
      <rect x="14.5" y="3" width="1.5" height="3" rx="0.5" />
      <rect x="8" y="18" width="1.5" height="3" rx="0.5" />
      <rect x="11.25" y="18" width="1.5" height="3" rx="0.5" />
      <rect x="14.5" y="18" width="1.5" height="3" rx="0.5" />
    </svg>
  )
}

// ── Token chest modal — claim daily tokens ──
function TokenChestModal({ onNext }: { onNext: () => void }) {
  const tokens = useCampStore((s) => s.tokens)

  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card tutorial-card-compute" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-icon tutorial-icon-compute">
          <TokenChipIcon size={44} />
        </div>
        <div className="tutorial-card-title tutorial-title-compute">YOUR TOKENS</div>
        <div className="tutorial-card-body">
          <p><strong className="tutorial-strong-compute">Tokens</strong> power everything — training, upgrades, unlocks.</p>
          <p>Claim your daily tokens to get started.</p>
        </div>
        <AnimatedCounter target={tokens} />
        <button className="tutorial-card-btn tutorial-btn-compute" onClick={onNext}>
          CLAIM TOKENS
        </button>
      </div>
    </div>
  )
}

// ── Unlock weapons modal — progression hook ──
function UnlockWeaponsModal({ step, onNext }: { step: TutorialStepDef; onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card tutorial-card-complete" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-stars">
          <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
          <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
          <span className="tutorial-star"><StarIcon size={48} color="#FFD700" /></span>
        </div>
        <div className="tutorial-card-title">{step.title}</div>
        <div className="tutorial-card-body">
          {step.body.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
        <button className="tutorial-card-btn" onClick={onNext}>
          {step.buttonText ?? 'CONTINUE'}
        </button>
      </div>
    </div>
  )
}

// ── Completion modal (3 spinning stars) ──
function CompletionModal({ step, onNext }: { step: TutorialStepDef; onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-card-title">{step.title}</div>
        <div className="tutorial-card-body">
          {step.body.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
        <button className="tutorial-card-btn" onClick={onNext}>
          {step.buttonText ?? 'CONTINUE'}
        </button>
      </div>
    </div>
  )
}

// ── Generic modal ──
function TutorialModal({ step, onNext }: { step: TutorialStepDef; onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-card-title">{step.title}</div>
        <div className="tutorial-card-body">
          {step.body.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
        <button className="tutorial-card-btn" onClick={onNext}>
          {step.buttonText ?? 'CONTINUE'}
        </button>
      </div>
    </div>
  )
}

// ── Hint (positioned top or bottom) ──
function TutorialHint({ step }: { step: TutorialStepDef }) {
  const pos = step.hintPosition ?? 'bottom'
  return (
    <div className={`tutorial-hint tutorial-hint-${pos}`}>
      <div className="tutorial-hint-title">{step.title}</div>
      <div className="tutorial-hint-body">{step.body}</div>
    </div>
  )
}

// ── Main TutorialGuide ──
export function TutorialGuide() {
  const tutorialStep = useSceneStore((s) => s.tutorialStep)
  const setTutorialStep = useSceneStore((s) => s.setTutorialStep)
  const endTutorial = useSceneStore((s) => s.endTutorial)
  const completeTutorial = useCampStore((s) => s.completeTutorial)

  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setObservingSlotIndex = useSceneStore((s) => s.setObservingSlotIndex)
  const commitToTrain = useCampTrainingStore((s) => s.commitToTrain)

  const step = TUTORIAL_STEPS[tutorialStep]

  useAutoAdvance(step)
  useStepSounds(step)
  useTutorialSpeedBoost(step)

  const handleNext = useCallback(() => {
    const currentStep = TUTORIAL_STEPS[tutorialStep]
    const nextIdx = tutorialStep + 1

    // Side effects based on which step we're leaving
    if (currentStep?.id === 'recruit') {
      setRosterSheetOpen(true)
    }

    if (currentStep?.id === 'train-intro') {
      // Auto-commit training: rifle, 15s tutorial package, 1x speed, slot 0
      setRecruitSheetOpen(false)
      setRosterSheetOpen(false)
      const soldiers = useCampStore.getState().soldiers
      const soldier = soldiers[0]
      if (soldier) {
        const success = commitToTrain(0, soldier.id, soldier.name, 'rifle', 'tutorial', 1)
        if (success) {
          setObservingSlotIndex(0)
        }
      }
    }

    if (nextIdx >= TUTORIAL_STEPS.length) {
      // Completion reward
      useCampStore.getState().addTokens(100, { reason: 'tutorial-complete' })
      completeTutorial()
      endTutorial()
      track('tutorial_complete', {})
    } else {
      setTutorialStep(nextIdx)
    }
  }, [tutorialStep, setTutorialStep, completeTutorial, endTutorial, setRecruitSheetOpen, setRosterSheetOpen, commitToTrain, setObservingSlotIndex])

  // Close recruit/roster sheets when moving to training step
  useEffect(() => {
    if (step?.id === 'train-intro') {
      setRecruitSheetOpen(false)
      setRosterSheetOpen(false)
    }
  }, [step?.id, setRecruitSheetOpen, setRosterSheetOpen])

  if (!step) return null
  if (step.type === 'wait') return null

  // Variant-specific modals
  if (step.id === 'claim-tokens') {
    return <TokenChestModal onNext={handleNext} />
  }
  if (step.id === 'unlock-weapons') {
    return <UnlockWeaponsModal step={step} onNext={handleNext} />
  }
  if (step.id === 'complete') {
    return <CompletionModal step={step} onNext={handleNext} />
  }

  return (
    <>
      {step.type === 'modal' && (
        <TutorialModal step={step} onNext={handleNext} />
      )}
      {step.type === 'hint' && (
        <TutorialHint step={step} />
      )}
    </>
  )
}
