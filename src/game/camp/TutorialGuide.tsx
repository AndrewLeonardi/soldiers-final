/**
 * TutorialGuide — camp tutorial overlay system (v4 — polish pass).
 *
 * Sprint D. Modeled on /play's proven TutorialOverlay:
 *   - Separate gold & compute modals with icon circles + animated counters
 *   - Action-modal pattern: button opens real UI, wait step watches for completion
 *   - Hints positioned to avoid covering sheet content
 *   - Sound design: modalAppear, stepAdvance, completionFanfare
 *   - Completion celebration: 3 spinning gold stars
 *   - Training speed boost: 4x GA during tutorial observation
 *   - Completion reward: bonus gold + compute
 *
 * 9 steps: welcome → gold → compute → recruit → recruit-wait → train → start → done → complete
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { TUTORIAL_STEPS } from '@config/tutorialSteps'
import type { TutorialStepDef } from '@config/tutorialSteps'
import { GoldCoinIcon } from './GoldCoinIcon'
import { StarIcon } from '@ui/ToyIcons'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

// ── Auto-advance watcher (for 'action' steps) ──
function useAutoAdvance(step: TutorialStepDef | undefined) {
  const tutorialStep = useSceneStore((s) => s.tutorialStep)
  const setTutorialStep = useSceneStore((s) => s.setTutorialStep)

  const soldierCount = useCampStore((s) => s.soldiers.length)
  const observingSlotIndex = useSceneStore((s) => s.observingSlotIndex)
  const battlePhase = useSceneStore((s) => s.battlePhase)

  useEffect(() => {
    if (!step || step.advanceOn !== 'action') return

    let shouldAdvance = false
    switch (step.id) {
      case 'recruit-wait':
        shouldAdvance = soldierCount >= 1
        break
      case 'start-training':
        shouldAdvance = observingSlotIndex !== null
        break
      case 'watching-training':
        // Advance when user exits observation (back to camp view)
        shouldAdvance = observingSlotIndex === null
        break
      case 'training-done':
        shouldAdvance = battlePhase === 'picking'
        break
    }

    if (shouldAdvance) {
      const timer = setTimeout(() => {
        setTutorialStep(tutorialStep + 1)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [step, soldierCount, observingSlotIndex, battlePhase, tutorialStep, setTutorialStep])
}

// ── Step-entry sound effect (matches /play's sound integration) ──
function useStepSounds(step: TutorialStepDef | undefined) {
  useEffect(() => {
    if (!step) return
    if (step.type === 'wait') return

    if (step.id === 'explain-gold' || step.id === 'explain-compute') {
      sfx.modalAppear()
    } else if (step.id === 'complete') {
      sfx.completionFanfare()
    } else if (step.id === 'recruit-wait') {
      // Roster just opened — play recruit chime
      sfx.recruitChime()
    } else if (step.id === 'watching-training') {
      // Entered observation — subtle step sound
      sfx.stepAdvance()
    } else if (step.id === 'training-done') {
      // Back at camp after training — play graduation sound
      sfx.graduationFanfare()
    } else if (step.id === 'mission-briefing') {
      // Battle mission briefing — play deploy horn
      sfx.deployHorn()
    } else {
      sfx.stepAdvance()
    }
  }, [step])
}

// ── Training speed boost during tutorial ──
function useTutorialSpeedBoost(step: TutorialStepDef | undefined) {
  useEffect(() => {
    if (step?.id === 'start-training' || step?.id === 'watching-training') {
      useCampTrainingStore.getState().setTutorialSpeedBoost(4)
      return () => {
        useCampTrainingStore.getState().setTutorialSpeedBoost(1)
      }
    }
  }, [step?.id])
}

// ── Animated counter (matches /play's AnimatedCounter) ──
function AnimatedCounter({ target, variant }: { target: number; variant: 'gold' | 'compute' }) {
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
    <div className={`tutorial-counter tutorial-counter-${variant}`}>
      {value}
    </div>
  )
}

// ── Compute chip icon (inline SVG, matches /play's MicrochipIcon) ──
function ComputeChipIcon({ size = 44 }: { size?: number }) {
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

// ── Gold modal ──
function GoldModal({ onNext }: { onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card tutorial-card-gold" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-icon tutorial-icon-gold">
          <GoldCoinIcon size={44} />
        </div>
        <div className="tutorial-card-title tutorial-title-gold">This is Gold</div>
        <div className="tutorial-card-body">
          <p><strong className="tutorial-strong-gold">Gold</strong> recruits soldiers for your squad.</p>
          <p>Each soldier costs 200 gold.</p>
        </div>
        <AnimatedCounter target={600} variant="gold" />
        <button className="tutorial-card-btn tutorial-btn-gold" onClick={onNext}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}

// ── Compute modal ──
function ComputeModal({ onNext }: { onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card tutorial-card-compute" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-icon tutorial-icon-compute">
          <ComputeChipIcon size={44} />
        </div>
        <div className="tutorial-card-title tutorial-title-compute">This is Compute</div>
        <div className="tutorial-card-body">
          <p><strong className="tutorial-strong-compute">Compute</strong> trains your soldiers' brains.</p>
          <p>It powers real neural network evolution. It's rare — use it wisely.</p>
        </div>
        <AnimatedCounter target={500} variant="compute" />
        <button className="tutorial-card-btn tutorial-btn-compute" onClick={onNext}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}

// ── Mission briefing modal (briefcase icon + battle explanation) ──
function MissionBriefingModal({ step, onNext }: { step: TutorialStepDef; onNext: () => void }) {
  return (
    <div className="tutorial-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="tutorial-card tutorial-card-mission" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-icon tutorial-icon-mission">
          <svg width={44} height={44} viewBox="0 0 24 24" fill="#FFD700">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <rect x="8" y="4" width="8" height="5" rx="1" fill="none" stroke="#FFD700" strokeWidth="2" />
            <circle cx="12" cy="14" r="2" fill="#1a1a2e" />
          </svg>
        </div>
        <div className="tutorial-card-title tutorial-title-mission">{step.title}</div>
        <div className="tutorial-card-body">
          {step.body.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
        <button className="tutorial-card-btn tutorial-btn-mission" onClick={onNext}>
          {step.buttonText ?? 'CONTINUE'}
        </button>
      </div>
    </div>
  )
}

// ── Completion modal (3 spinning stars + enhanced glow) ──
function CompletionModal({ step, onNext }: { step: TutorialStepDef; onNext: () => void }) {
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
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)

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
      setRosterSheetOpen(false)
      setRecruitSheetOpen(false)
      setTrainingSheetOpen(true)
    }

    if (nextIdx >= TUTORIAL_STEPS.length) {
      // Completion reward
      useCampStore.getState().addGold(200)
      useCampStore.getState().addCompute(100)
      completeTutorial()
      endTutorial()
    } else {
      setTutorialStep(nextIdx)
    }
  }, [tutorialStep, setTutorialStep, completeTutorial, endTutorial, setRecruitSheetOpen, setRosterSheetOpen, setTrainingSheetOpen])

  // Close recruit/roster sheets when moving to training step
  useEffect(() => {
    if (step?.id === 'train-intro') {
      setRecruitSheetOpen(false)
      setRosterSheetOpen(false)
    }
  }, [step?.id, setRecruitSheetOpen, setRosterSheetOpen])

  // Close training sheet when training is done (so ATTACK button is visible)
  useEffect(() => {
    if (step?.id === 'training-done') {
      setTrainingSheetOpen(false)
    }
  }, [step?.id, setTrainingSheetOpen])

  if (!step) return null
  if (step.type === 'wait') return null

  // Variant-specific modals
  if (step.id === 'explain-gold') {
    return <GoldModal onNext={handleNext} />
  }
  if (step.id === 'explain-compute') {
    return <ComputeModal onNext={handleNext} />
  }
  if (step.id === 'mission-briefing') {
    return <MissionBriefingModal step={step} onNext={handleNext} />
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
