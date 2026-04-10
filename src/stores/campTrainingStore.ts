/**
 * campTrainingStore — multi-slot training lifecycle for base camp.
 *
 * Sprint 2→3. Manages up to 3 parallel training slots, each with its
 * own commit→train→graduate flow:
 *   1. Player picks a slot, commits a soldier + weapon + compute tier
 *   2. GA population spawns, sim ticks every frame
 *   3. Timer counts down, milestones fire, fitness climbs
 *   4. Graduation: best weights written to campStore soldier record
 *
 * Sprint 3 refactor: single-slot state → `slots: TrainingSlot[]`.
 * All actions take a slotIndex. `tick(dt)` iterates all active slots.
 */

import { create } from 'zustand'
import { NeuralNet } from '@engine/ml/neuralNet'
import { GeneticAlgorithm } from '@engine/ml/geneticAlgorithm'
import { initSim, simTick, scoreFitness } from '@engine/ml/simulationRunner'
import type { SimState, SimConfig } from '@engine/ml/simulationRunner'
import { useCampStore } from './campStore'
import {
  COMPUTE_TIERS,
  TRAINING_BASE_COST,
  TRAINING_BASE_DURATION,
  TRAINING_POP_SIZE,
  TRAINING_ELITE_COUNT,
  TRAINING_SIM_DURATION,
  BREAKTHROUGH_THRESHOLD,
} from '@game/camp/trainingConstants'
import { getWeaponShape } from '@game/training/weaponShapes'

const MAX_SLOTS = 3

// GA instance for training — shared across slots (stateless)
const ga = new GeneticAlgorithm(TRAINING_POP_SIZE, TRAINING_ELITE_COUNT, 0.2, 0.6, 0.35)

// ── Types ──

export type TrainingPhase =
  | 'empty'           // No soldier committed
  | 'selecting'       // Training sheet is open, picking soldier/weapon/tier
  | 'ceremony-start'  // Brief start ceremony (<2s)
  | 'running'         // GA is running, spectacle is live
  | 'graduated'       // Timer done or breakthrough, awaiting ceremony
  | 'ceremony-end'    // Graduation ceremony (<2s)

export type MilestoneType = 'FIRST_HIT' | 'FIRST_KILL' | 'STREAK_10'

export interface MilestoneEvent {
  type: MilestoneType
  label: string
  generation: number
  timestamp: number
}

/** Snapshot of a single individual's sim state for rendering ghosts */
export interface GhostSnapshot {
  x: number
  z: number
  rotation: number
  justFired: boolean
}

/** All per-slot state */
export interface TrainingSlot {
  trainingPhase: TrainingPhase
  slotSoldierId: string | null
  slotSoldierName: string | null
  slotWeapon: string | null
  computeTier: number

  generation: number
  bestFitness: number
  bestWeights: number[]
  fitnessHistory: number[]

  timerTotal: number
  timerElapsed: number

  milestones: MilestoneEvent[]
  totalHits: number
  totalKills: number
  bestStreak: number
  activeMilestone: MilestoneEvent | null

  ghostSnapshots: GhostSnapshot[]
  championIndex: number

  // Internal (not rendered directly)
  population: number[][]
  fitnesses: number[]
  simStates: SimState[]
  nns: NeuralNet[]
  simConfig: SimConfig | null
  tickCounter: number
}

function createEmptySlot(): TrainingSlot {
  return {
    trainingPhase: 'empty',
    slotSoldierId: null,
    slotSoldierName: null,
    slotWeapon: null,
    computeTier: 1,
    generation: 0,
    bestFitness: 0,
    bestWeights: [],
    fitnessHistory: [],
    timerTotal: TRAINING_BASE_DURATION,
    timerElapsed: 0,
    milestones: [],
    totalHits: 0,
    totalKills: 0,
    bestStreak: 0,
    activeMilestone: null,
    ghostSnapshots: [],
    championIndex: 0,
    population: [],
    fitnesses: [],
    simStates: [],
    nns: [],
    simConfig: null,
    tickCounter: 0,
  }
}

// ── State ──

interface CampTrainingState {
  slots: TrainingSlot[]

  // Global active milestone (for the callout system — shows latest from any slot)
  activeMilestone: MilestoneEvent | null

  // Actions
  commitToTrain: (slotIndex: number, soldierId: string, soldierName: string, weapon: string, tier: number) => boolean
  tick: (dt: number) => void
  startCeremonyDone: (slotIndex: number) => void
  graduate: (slotIndex: number) => void
  endCeremonyDone: (slotIndex: number) => void
  resetSlot: (slotIndex: number) => void

  // Convenience — check if a soldier is already in any slot
  isSoldierInTraining: (soldierId: string) => boolean

  // Legacy compat selectors (read from slot 0 for single-slot consumers)
  // These are computed getters, not stored state
  trainingPhase: TrainingPhase
  slotSoldierId: string | null
  slotSoldierName: string | null
  slotWeapon: string | null
  computeTier: number
  generation: number
  bestFitness: number
  bestWeights: number[]
  fitnessHistory: number[]
  timerTotal: number
  timerElapsed: number
  milestones: MilestoneEvent[]
  totalHits: number
  totalKills: number
  bestStreak: number
  ghostSnapshots: GhostSnapshot[]
  championIndex: number
  tickCounter: number

  // Legacy compat actions (operate on slot 0)
  openTrainingSheet: () => void
  closeTrainingSheet: () => void
  reset: () => void
}

export const useCampTrainingStore = create<CampTrainingState>()((set, get) => {
  // Helper to update a specific slot immutably
  const updateSlot = (index: number, updates: Partial<TrainingSlot>) => {
    const { slots } = get()
    const newSlots = slots.map((slot, i) =>
      i === index ? { ...slot, ...updates } : slot,
    )
    // Also sync legacy compat fields from slot 0
    const slot0 = index === 0 ? { ...slots[0]!, ...updates } : newSlots[0]!
    set({
      slots: newSlots,
      // Legacy compat — mirror slot 0
      trainingPhase: slot0.trainingPhase,
      slotSoldierId: slot0.slotSoldierId,
      slotSoldierName: slot0.slotSoldierName,
      slotWeapon: slot0.slotWeapon,
      computeTier: slot0.computeTier,
      generation: slot0.generation,
      bestFitness: slot0.bestFitness,
      bestWeights: slot0.bestWeights,
      fitnessHistory: slot0.fitnessHistory,
      timerTotal: slot0.timerTotal,
      timerElapsed: slot0.timerElapsed,
      milestones: slot0.milestones,
      totalHits: slot0.totalHits,
      totalKills: slot0.totalKills,
      bestStreak: slot0.bestStreak,
      ghostSnapshots: slot0.ghostSnapshots,
      championIndex: slot0.championIndex,
      tickCounter: slot0.tickCounter,
    })
  }

  const emptySlot0 = createEmptySlot()

  return {
    slots: [createEmptySlot()],

    activeMilestone: null,

    // Legacy compat — initial values from slot 0
    trainingPhase: 'empty',
    slotSoldierId: null,
    slotSoldierName: null,
    slotWeapon: null,
    computeTier: 1,
    generation: 0,
    bestFitness: 0,
    bestWeights: [],
    fitnessHistory: [],
    timerTotal: TRAINING_BASE_DURATION,
    timerElapsed: 0,
    milestones: [],
    totalHits: 0,
    totalKills: 0,
    bestStreak: 0,
    ghostSnapshots: [],
    championIndex: 0,
    tickCounter: 0,

    // ── Actions ──

    isSoldierInTraining: (soldierId) => {
      return get().slots.some(slot =>
        slot.slotSoldierId === soldierId &&
        slot.trainingPhase !== 'empty',
      )
    },

    commitToTrain: (slotIndex, soldierId, soldierName, weapon, tier) => {
      const state = get()
      const slot = state.slots[slotIndex]
      if (!slot) return false
      if (slot.trainingPhase !== 'empty' && slot.trainingPhase !== 'selecting') return false

      // Prevent same soldier in multiple slots
      if (state.slots.some((s, i) => i !== slotIndex && s.slotSoldierId === soldierId && s.trainingPhase !== 'empty')) {
        return false
      }

      const tierConfig = COMPUTE_TIERS[tier - 1]
      if (!tierConfig) return false

      const cost = TRAINING_BASE_COST * tierConfig.costMultiplier
      const spent = useCampStore.getState().spendCompute(cost)
      if (!spent) return false

      // Use per-weapon NN shape
      const shape = getWeaponShape(weapon)
      const weightCount = NeuralNet.weightCount(shape.input, shape.hidden, shape.output)

      // Init GA population — seed from existing brain if available
      const existingSoldier = useCampStore.getState().soldiers.find(s => s.id === soldierId)
      const existingWeights = existingSoldier?.trainedBrains?.[weapon]
        ?? existingSoldier?.weights  // fallback for pre-v3 data

      const population = (existingWeights && existingWeights.length === weightCount)
        ? ga.initSeededPopulation(weightCount, existingWeights)
        : ga.initPopulation(weightCount)

      // Create NNs and sim states for all individuals
      const simConfig: SimConfig = {
        weaponType: weapon,
        simDuration: TRAINING_SIM_DURATION,
      }

      const nns: NeuralNet[] = []
      const simStates: SimState[] = []
      for (let i = 0; i < TRAINING_POP_SIZE; i++) {
        const nn = new NeuralNet(shape.input, shape.hidden, shape.output)
        nn.setWeights(population[i] ?? [])
        nns.push(nn)
        simStates.push(initSim(simConfig))
      }

      const timerTotal = TRAINING_BASE_DURATION / tierConfig.multiplier

      updateSlot(slotIndex, {
        trainingPhase: 'ceremony-start',
        slotSoldierId: soldierId,
        slotSoldierName: soldierName,
        slotWeapon: weapon,
        computeTier: tier,
        generation: 0,
        bestFitness: 0,
        bestWeights: [],
        fitnessHistory: [],
        timerTotal,
        timerElapsed: 0,
        milestones: [],
        totalHits: 0,
        totalKills: 0,
        bestStreak: 0,
        activeMilestone: null,
        ghostSnapshots: [],
        championIndex: 0,
        population,
        fitnesses: new Array(TRAINING_POP_SIZE).fill(0),
        simStates,
        nns,
        simConfig,
        tickCounter: 0,
      })

      return true
    },

    startCeremonyDone: (slotIndex) => {
      updateSlot(slotIndex, { trainingPhase: 'running' })
    },

    tick: (dt) => {
      const state = get()
      const SIM_DT = 1 / 60
      let globalMilestone: MilestoneEvent | null = null

      const newSlots = state.slots.map((slot, slotIndex) => {
        if (slot.trainingPhase !== 'running') return slot
        if (!slot.simConfig) return slot

        const tierConfig = COMPUTE_TIERS[slot.computeTier - 1]
        if (!tierConfig) return slot

        // Advance wall-clock timer
        const newElapsed = slot.timerElapsed + dt
        if (newElapsed >= slot.timerTotal) {
          return { ...slot, timerElapsed: slot.timerTotal, trainingPhase: 'graduated' as const }
        }

        // Run sim ticks
        const stepsPerFrame = Math.max(1, Math.ceil(tierConfig.multiplier * 0.5))

        let { population, fitnesses, generation, bestFitness, bestWeights, fitnessHistory,
          simStates, nns, totalHits, totalKills, bestStreak, milestones, activeMilestone } = slot
        const config = slot.simConfig

        fitnesses = [...fitnesses]
        milestones = [...milestones]

        for (let step = 0; step < stepsPerFrame; step++) {
          for (let i = 0; i < TRAINING_POP_SIZE; i++) {
            const sim = simStates[i]
            const nn = nns[i]
            if (!sim || !nn) continue

            if (sim.elapsed < config.simDuration) {
              simTick(sim, nn, SIM_DT, config)

              if ('lastHit' in sim && (sim as any).lastHit) {
                totalHits++
                if (totalHits === 1) {
                  const m: MilestoneEvent = { type: 'FIRST_HIT', label: 'FIRST HIT', generation, timestamp: newElapsed }
                  milestones.push(m)
                  activeMilestone = m
                  globalMilestone = m
                }
              }

              if ('targets' in sim) {
                const targets = (sim as any).targets as Array<{ alive: boolean }>
                const killed = targets.filter((t: any) => !t.alive).length
                if (killed > totalKills) {
                  totalKills = killed
                  if (totalKills === 1 && !milestones.find(m => m.type === 'FIRST_KILL')) {
                    const m: MilestoneEvent = { type: 'FIRST_KILL', label: 'FIRST KILL', generation, timestamp: newElapsed }
                    milestones.push(m)
                    activeMilestone = m
                    globalMilestone = m
                  }
                }
              }

              if ('bestStreak' in sim) {
                const streak = (sim as any).bestStreak as number
                if (streak > bestStreak) {
                  bestStreak = streak
                  if (bestStreak >= 10 && !milestones.find(m => m.type === 'STREAK_10')) {
                    const m: MilestoneEvent = { type: 'STREAK_10', label: '10 IN A ROW', generation, timestamp: newElapsed }
                    milestones.push(m)
                    activeMilestone = m
                    globalMilestone = m
                  }
                }
              }
            }
          }

          // Check if generation done
          const allDone = simStates.every(s => s && s.elapsed >= config.simDuration)
          if (allDone) {
            for (let i = 0; i < TRAINING_POP_SIZE; i++) {
              const sim = simStates[i]
              if (sim) fitnesses[i] = scoreFitness(sim, config)
            }

            const genBest = Math.max(...fitnesses)
            if (genBest > bestFitness) {
              bestFitness = genBest
              const bestIdx = fitnesses.indexOf(genBest)
              const bestPop = population[bestIdx]
              if (bestPop) bestWeights = [...bestPop]
            }

            fitnessHistory = [...fitnessHistory, genBest].slice(-30)
            population = ga.evolve(population, fitnesses, generation)
            generation++
            fitnesses = new Array(TRAINING_POP_SIZE).fill(0)

            const newSimStates: SimState[] = []
            for (let i = 0; i < TRAINING_POP_SIZE; i++) {
              const nn = nns[i]
              if (nn) nn.setWeights(population[i] ?? [])
              newSimStates.push(initSim(config))
            }
            simStates = newSimStates

            if (bestFitness >= BREAKTHROUGH_THRESHOLD && generation >= 3) {
              return {
                ...slot,
                trainingPhase: 'graduated' as const,
                timerElapsed: newElapsed,
                generation, population, fitnesses, bestFitness, bestWeights,
                fitnessHistory, simStates, totalHits, totalKills, bestStreak,
                milestones, activeMilestone,
                ghostSnapshots: slot.ghostSnapshots,
                tickCounter: slot.tickCounter + 1,
              }
            }
          }
        }

        // Build ghost snapshots
        const ghostSnapshots: GhostSnapshot[] = simStates.map(sim => ({
          x: 'soldierX' in sim ? (sim as any).soldierX : 0,
          z: 'soldierZ' in sim ? (sim as any).soldierZ : 0,
          rotation: 'soldierRotation' in sim ? (sim as any).soldierRotation : 0,
          justFired: 'justFired' in sim ? (sim as any).justFired : false,
        }))

        let championIndex = 0
        let highestFit = -1
        for (let i = 0; i < fitnesses.length; i++) {
          if ((fitnesses[i] ?? 0) > highestFit) {
            highestFit = fitnesses[i] ?? 0
            championIndex = i
          }
        }

        return {
          ...slot,
          timerElapsed: newElapsed,
          generation, population, fitnesses, bestFitness, bestWeights,
          fitnessHistory, simStates, totalHits, totalKills, bestStreak,
          milestones, activeMilestone, ghostSnapshots, championIndex,
          tickCounter: slot.tickCounter + 1,
        }
      })

      // Sync legacy compat from slot 0
      const slot0 = newSlots[0]!
      set({
        slots: newSlots,
        activeMilestone: globalMilestone ?? state.activeMilestone,
        trainingPhase: slot0.trainingPhase,
        slotSoldierId: slot0.slotSoldierId,
        slotSoldierName: slot0.slotSoldierName,
        slotWeapon: slot0.slotWeapon,
        computeTier: slot0.computeTier,
        generation: slot0.generation,
        bestFitness: slot0.bestFitness,
        bestWeights: slot0.bestWeights,
        fitnessHistory: slot0.fitnessHistory,
        timerTotal: slot0.timerTotal,
        timerElapsed: slot0.timerElapsed,
        milestones: slot0.milestones,
        totalHits: slot0.totalHits,
        totalKills: slot0.totalKills,
        bestStreak: slot0.bestStreak,
        ghostSnapshots: slot0.ghostSnapshots,
        championIndex: slot0.championIndex,
        tickCounter: slot0.tickCounter,
      })
    },

    graduate: (slotIndex) => {
      const slot = get().slots[slotIndex]
      if (!slot) return
      const { slotSoldierId, slotWeapon, bestWeights, bestFitness, generation } = slot
      if (!slotSoldierId || !slotWeapon || bestWeights.length === 0) return

      useCampStore.getState().updateSoldierBrain(
        slotSoldierId,
        slotWeapon,
        bestWeights,
        bestFitness,
        generation,
      )

      updateSlot(slotIndex, { trainingPhase: 'ceremony-end' })
    },

    endCeremonyDone: (slotIndex) => {
      get().resetSlot(slotIndex)
    },

    resetSlot: (slotIndex) => {
      updateSlot(slotIndex, createEmptySlot())
    },

    // Legacy compat actions (operate on slot 0)
    openTrainingSheet: () => {
      const slot = get().slots[0]
      if (slot && slot.trainingPhase === 'empty') {
        updateSlot(0, { trainingPhase: 'selecting' })
      }
    },

    closeTrainingSheet: () => {
      const slot = get().slots[0]
      if (slot && slot.trainingPhase === 'selecting') {
        updateSlot(0, { trainingPhase: 'empty' })
      }
    },

    reset: () => {
      updateSlot(0, createEmptySlot())
    },
  }
})
