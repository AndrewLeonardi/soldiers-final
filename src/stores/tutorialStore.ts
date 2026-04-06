import { create } from 'zustand'
import { useRosterStore } from './rosterStore'
import { useGameStore } from './gameStore'

export type TutorialStep =
  | 'welcome-gold'
  | 'welcome-compute'
  | 'recruit'
  | 'tap-soldier'
  | 'tap-rocket'
  | 'begin-training'
  | 'watch-training'
  | 'save-training'
  | 'deploy'
  | 'place-soldier'
  | 'fight'
  | 'complete'

const STORAGE_KEY = 'toy_soldiers_tutorial_completed'

function isCompleted(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

interface TutorialState {
  step: TutorialStep
  active: boolean
  completed: boolean

  startTutorial: () => void
  advanceTo: (step: TutorialStep) => void
  completeTutorial: () => void
  isStep: (step: TutorialStep) => boolean
  isTutorialBattle: () => boolean
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  step: 'welcome-gold',
  active: false,
  completed: isCompleted(),

  startTutorial: () => {
    // Always start fresh — tutorial is short enough to restart
    useRosterStore.setState({ soldiers: [], selectedSoldierId: '', detailSoldierId: null })
    useGameStore.setState({ gold: 0, compute: 0 })

    set({ step: 'welcome-gold', active: true })
  },

  advanceTo: (step) => {
    set({ step })
  },

  completeTutorial: () => {
    set({ active: false, completed: true })
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch {}
  },

  isStep: (step) => {
    const state = get()
    return state.active && state.step === step
  },

  isTutorialBattle: () => {
    const state = get()
    return state.active && !state.completed
  },
}))

// Dev testing helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as any).__tutorialStore = useTutorialStore
}
