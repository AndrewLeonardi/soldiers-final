/**
 * tutorialSteps.ts — Camp tutorial step definitions.
 *
 * Sprint E (v5). Simplified 8-step onboarding:
 *   welcome → claim tokens → recruit → wait → train (auto) →
 *   watch training → unlock-weapons → complete
 *
 * No gold references. Recruiting is free. Training auto-commits
 * during tutorial (rifle, 15s, 30 tokens).
 */

export interface TutorialStepDef {
  id: string
  type: 'modal' | 'hint' | 'wait'
  title: string
  body: string
  /** Button text for modal steps */
  buttonText?: string
  /** How this step advances: 'click' = button tap, 'action' = auto on store change */
  advanceOn: 'click' | 'action'
  /** Hint position — defaults to 'bottom' */
  hintPosition?: 'top' | 'bottom'
  /** Visual variant for the modal card */
  variant?: 'default' | 'tokens'
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // ── Step 0: Welcome ──
  {
    id: 'welcome',
    type: 'modal',
    title: 'WELCOME, COMMANDER',
    body: 'Your mission: recruit soldiers, train their AI brains, and lead them into battle.',
    buttonText: 'BEGIN',
    advanceOn: 'click',
  },

  // ── Step 1: Claim tokens (daily reward / starter chest) ──
  {
    id: 'claim-tokens',
    type: 'modal',
    variant: 'tokens',
    title: 'YOUR TOKENS',
    body: 'Tokens power everything — training, upgrades, unlocks. Claim your daily tokens to get started.',
    buttonText: 'CLAIM TOKENS',
    advanceOn: 'click',
  },

  // ── Step 2: Recruit prompt ──
  {
    id: 'recruit',
    type: 'modal',
    title: 'RECRUIT YOUR FIRST SOLDIER',
    body: 'Open your roster and pick a soldier to join your squad.',
    buttonText: 'OPEN ROSTER',
    advanceOn: 'click',
    // Side effect: opens RosterSheet (handled in TutorialGuide)
  },

  // ── Step 3: Wait for recruitment (silent — no tooltip) ──
  {
    id: 'recruit-wait',
    type: 'wait',
    title: '',
    body: '',
    advanceOn: 'action',
    // Auto-advances when soldiers.length >= 1
  },

  // ── Step 4: Train intro (auto-commits training on button tap) ──
  {
    id: 'train-intro',
    type: 'modal',
    variant: 'tokens',
    title: 'TRAIN THEIR BRAIN',
    body: "Your soldier starts with an empty neural network. Training costs tokens to evolve a real AI brain.\n\nLet's start a quick 15-second rifle drill.",
    buttonText: 'START TRAINING — 30 TOKENS',
    advanceOn: 'click',
    // Side effect: auto-commits training (rifle, 15s, 30 tokens) in TutorialGuide
  },

  // ── Step 5: Watching training (during observation) ──
  {
    id: 'training-active',
    type: 'hint',
    title: 'EVOLVING...',
    body: 'Your soldier is running hundreds of simulations right now. Each generation, the best brains survive and evolve.',
    advanceOn: 'action',
    hintPosition: 'bottom',
    // Auto-advances when observingSlotIndex goes back to null
  },

  // ── Step 6: Training complete — progression hook ──
  {
    id: 'unlock-weapons',
    type: 'modal',
    title: 'TRAINING COMPLETE!',
    body: "Your soldier has a brain now! Win battles to unlock new weapons — machine guns, rockets, grenades — and train your soldiers in each one.",
    buttonText: 'GOT IT',
    advanceOn: 'click',
  },

  // ── Step 7: Complete ──
  {
    id: 'complete',
    type: 'modal',
    title: 'GOOD LUCK, COMMANDER',
    body: "Every soldier's brain is unique — trained by real AI, not scripted.",
    buttonText: "LET'S GO",
    advanceOn: 'click',
  },
]
