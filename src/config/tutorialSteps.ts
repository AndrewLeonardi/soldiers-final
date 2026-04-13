/**
 * tutorialSteps.ts — Camp tutorial step definitions.
 *
 * Sprint D (v4). Modeled on /play's proven flow:
 *   - Separate gold & compute modals with icons + animated counters
 *   - Action-modal pattern: button opens real UI, wait step watches for completion
 *   - Bottom-positioned hints that don't cover sheet content
 *
 * 11 steps: welcome → gold → compute → recruit → wait → train → start →
 *           watching → done → mission → complete
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
  variant?: 'default' | 'gold' | 'compute'
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // ── Step 0: Welcome ──
  {
    id: 'welcome',
    type: 'modal',
    title: 'WELCOME, COMMANDER',
    body: 'Your mission: recruit soldiers, train their neural network brains, and lead them into battle.\n\nEvery soldier runs a real AI — no scripts, no faking it.',
    buttonText: 'BEGIN',
    advanceOn: 'click',
  },

  // ── Step 1: Explain gold ──
  {
    id: 'explain-gold',
    type: 'modal',
    variant: 'gold',
    title: 'THIS IS GOLD',
    body: 'Gold recruits soldiers for your squad. Each soldier costs 200 gold.',
    buttonText: 'CONTINUE',
    advanceOn: 'click',
  },

  // ── Step 2: Explain compute ──
  {
    id: 'explain-compute',
    type: 'modal',
    variant: 'compute',
    title: 'THIS IS COMPUTE',
    body: "Compute trains your soldiers' brains. It powers real neural network evolution. It's rare — use it wisely.",
    buttonText: 'CONTINUE',
    advanceOn: 'click',
  },

  // ── Step 3: Recruit prompt ──
  {
    id: 'recruit',
    type: 'modal',
    title: 'RECRUIT YOUR FIRST SOLDIER',
    body: 'Open your roster and recruit a soldier. Each recruit costs 200 gold.',
    buttonText: 'OPEN ROSTER',
    advanceOn: 'click',
    // Side effect: opens RosterSheet (handled in TutorialGuide)
  },

  // ── Step 4: Guide during recruitment ──
  {
    id: 'recruit-wait',
    type: 'hint',
    title: 'RECRUIT A SOLDIER',
    body: 'Tap "+ RECRUIT NEW SOLDIER" then pick a name.',
    advanceOn: 'action',
    hintPosition: 'top',
    // Auto-advances when soldiers.length >= 1
  },

  // ── Step 5: Train prompt ──
  {
    id: 'train-intro',
    type: 'modal',
    title: 'TRAIN THEIR BRAIN',
    body: 'Your soldier starts with an empty neural network. Training uses compute to evolve a real AI brain through genetic algorithms.\n\nThis is the heart of the game.',
    buttonText: 'OPEN TRAINING',
    advanceOn: 'click',
    // Side effect: opens TrainingSheet (handled in TutorialGuide)
  },

  // ── Step 6: Guide through training setup ──
  {
    id: 'start-training',
    type: 'hint',
    title: 'START TRAINING',
    body: 'Select your soldier, pick a weapon, and hit START.',
    advanceOn: 'action',
    hintPosition: 'top',
    // Auto-advances when observingSlotIndex !== null
  },

  // ── Step 7: Watching training (during observation) ──
  {
    id: 'watching-training',
    type: 'hint',
    title: 'WATCH & LEARN',
    body: 'Your soldier is evolving a real neural network brain. Watch it learn to aim and fire!',
    advanceOn: 'action',
    hintPosition: 'bottom',
    // Auto-advances when observingSlotIndex goes back to null (user exits observation)
  },

  // ── Step 8: Training done (back at camp) ──
  {
    id: 'training-done',
    type: 'hint',
    title: 'TRAINING COMPLETE!',
    body: 'Your soldier has a brain now! Tap the ATTACK button to start a battle.',
    advanceOn: 'action',
    hintPosition: 'top',
    // Auto-advances when battlePhase === 'picking'
  },

  // ── Step 9: Mission briefing (intelligence) ──
  {
    id: 'mission-briefing',
    type: 'modal',
    title: 'YOUR MISSION',
    body: "Your soldiers will raid the enemy base. Place them strategically, then build walls and defenses to protect their advance.\n\nDefenses cost gold — place them wisely. Walls, sandbags, and towers are all destructible.\n\nDestroy the enemy forces to earn stars and rewards!",
    buttonText: 'UNDERSTOOD',
    advanceOn: 'click',
  },

  // ── Step 10: Complete ──
  {
    id: 'complete',
    type: 'modal',
    title: "YOU'RE READY, COMMANDER",
    body: "Recruit more soldiers, train different weapons, and rank up through battles.\n\nEvery soldier's brain is unique — trained by real AI, not scripted.\n\nGood luck, Commander.",
    buttonText: "LET'S GO",
    advanceOn: 'click',
  },
]
