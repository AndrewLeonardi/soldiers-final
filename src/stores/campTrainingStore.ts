/**
 * campTrainingStore — the training lifecycle for base camp.
 *
 * Sprint 2. Manages the full commit→train→graduate flow:
 *   1. Player commits a soldier + weapon + compute tier
 *   2. GA population spawns, sim ticks every frame
 *   3. Timer counts down, milestones fire, fitness climbs
 *   4. Graduation: best weights written to campStore soldier record
 *
 * Adapted from trainingStore.ts but uses campStore for compute/roster,
 * runs a fixed-duration timer instead of fitness-gated graduation,
 * and tracks milestones for the spectacle callout system.
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
import { NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE } from '@game/training/nullBrain'

const WEIGHT_COUNT = NeuralNet.weightCount(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)

// GA instance for training — 25 pop, 5 elite, 0.2 mutation rate, 0.6 strength, 0.35 crossover
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

// ── State ──

interface CampTrainingState {
  // Training slot
  trainingPhase: TrainingPhase
  slotSoldierId: string | null
  slotSoldierName: string | null
  slotWeapon: string | null
  computeTier: number  // 1-4

  // GA progress
  generation: number
  bestFitness: number
  bestWeights: number[]
  fitnessHistory: number[]
  currentIndividual: number

  // Timer
  timerTotal: number
  timerElapsed: number

  // Milestones
  milestones: MilestoneEvent[]
  totalHits: number
  totalKills: number
  bestStreak: number
  activeMilestone: MilestoneEvent | null

  // Ghost snapshot — positions of all individuals in current generation
  ghostSnapshots: GhostSnapshot[]
  championIndex: number

  // Internal (not rendered directly)
  population: number[][]
  fitnesses: number[]
  simStates: SimState[]     // One per individual
  nns: NeuralNet[]           // One per individual
  simConfig: SimConfig | null
  tickCounter: number

  // Actions
  openTrainingSheet: () => void
  closeTrainingSheet: () => void
  commitToTrain: (soldierId: string, soldierName: string, weapon: string, tier: number) => boolean
  tick: (dt: number) => void
  startCeremonyDone: () => void
  graduate: () => void
  endCeremonyDone: () => void
  reset: () => void
}

export const useCampTrainingStore = create<CampTrainingState>()((set, get) => ({
  // Training slot
  trainingPhase: 'empty',
  slotSoldierId: null,
  slotSoldierName: null,
  slotWeapon: null,
  computeTier: 1,

  // GA progress
  generation: 0,
  bestFitness: 0,
  bestWeights: [],
  fitnessHistory: [],
  currentIndividual: 0,

  // Timer
  timerTotal: TRAINING_BASE_DURATION,
  timerElapsed: 0,

  // Milestones
  milestones: [],
  totalHits: 0,
  totalKills: 0,
  bestStreak: 0,
  activeMilestone: null,

  // Ghosts
  ghostSnapshots: [],
  championIndex: 0,

  // Internal
  population: [],
  fitnesses: [],
  simStates: [],
  nns: [],
  simConfig: null,
  tickCounter: 0,

  // ── Actions ──

  openTrainingSheet: () => {
    const state = get()
    if (state.trainingPhase === 'empty') {
      set({ trainingPhase: 'selecting' })
    }
  },

  closeTrainingSheet: () => {
    const state = get()
    if (state.trainingPhase === 'selecting') {
      set({ trainingPhase: 'empty' })
    }
  },

  commitToTrain: (soldierId, soldierName, weapon, tier) => {
    const tierConfig = COMPUTE_TIERS[tier - 1]
    if (!tierConfig) return false

    const cost = TRAINING_BASE_COST * tierConfig.costMultiplier
    const spent = useCampStore.getState().spendCompute(cost)
    if (!spent) return false

    // Init GA population
    const existingSoldier = useCampStore.getState().soldiers.find(s => s.id === soldierId)
    const existingWeights = existingSoldier?.weights

    const population = existingWeights
      ? ga.initSeededPopulation(WEIGHT_COUNT, existingWeights)
      : ga.initPopulation(WEIGHT_COUNT)

    // Create NNs and sim states for all individuals
    const simConfig: SimConfig = {
      weaponType: weapon,
      simDuration: TRAINING_SIM_DURATION,
    }

    const nns: NeuralNet[] = []
    const simStates: SimState[] = []
    for (let i = 0; i < TRAINING_POP_SIZE; i++) {
      const nn = new NeuralNet(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)
      nn.setWeights(population[i] ?? [])
      nns.push(nn)
      simStates.push(initSim(simConfig))
    }

    const timerTotal = TRAINING_BASE_DURATION / tierConfig.multiplier

    set({
      trainingPhase: 'ceremony-start',
      slotSoldierId: soldierId,
      slotSoldierName: soldierName,
      slotWeapon: weapon,
      computeTier: tier,
      generation: 0,
      bestFitness: 0,
      bestWeights: [],
      fitnessHistory: [],
      currentIndividual: 0,
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

  startCeremonyDone: () => {
    set({ trainingPhase: 'running' })
  },

  tick: (dt) => {
    const state = get()
    if (state.trainingPhase !== 'running') return
    if (!state.simConfig) return

    const tierConfig = COMPUTE_TIERS[state.computeTier - 1]
    if (!tierConfig) return

    // Advance wall-clock timer
    const newElapsed = state.timerElapsed + dt
    if (newElapsed >= state.timerTotal) {
      // Time's up — graduate
      set({ timerElapsed: state.timerTotal, trainingPhase: 'graduated' })
      return
    }

    // Run sim ticks — more ticks per frame at higher tiers
    const SIM_DT = 1 / 60
    const stepsPerFrame = Math.max(1, Math.ceil(tierConfig.multiplier * 0.5))

    let { population, fitnesses, generation, bestFitness, bestWeights, fitnessHistory,
      currentIndividual, simStates, nns, totalHits, totalKills, bestStreak, milestones,
      activeMilestone } = state
    const config = state.simConfig

    // Make mutable copies
    fitnesses = [...fitnesses]
    milestones = [...milestones]

    for (let step = 0; step < stepsPerFrame; step++) {
      // Tick all individuals simultaneously (parallel eval for ghost rendering)
      for (let i = 0; i < TRAINING_POP_SIZE; i++) {
        const sim = simStates[i]
        const nn = nns[i]
        if (!sim || !nn) continue

        if (sim.elapsed < config.simDuration) {
          simTick(sim, nn, SIM_DT, config)

          // Track milestone stats from individual sims
          if ('lastHit' in sim && (sim as any).lastHit) {
            totalHits++
            if (totalHits === 1) {
              const m: MilestoneEvent = {
                type: 'FIRST_HIT',
                label: 'FIRST HIT',
                generation,
                timestamp: newElapsed,
              }
              milestones.push(m)
              activeMilestone = m
            }
          }

          if ('targets' in sim) {
            const targets = (sim as any).targets as Array<{ alive: boolean }>
            const killed = targets.filter((t: any) => !t.alive).length
            if (killed > totalKills) {
              const newKills = killed - totalKills
              totalKills = killed
              if (newKills > 0 && totalKills === 1) {
                const existing = milestones.find(m => m.type === 'FIRST_KILL')
                if (!existing) {
                  const m: MilestoneEvent = {
                    type: 'FIRST_KILL',
                    label: 'FIRST KILL',
                    generation,
                    timestamp: newElapsed,
                  }
                  milestones.push(m)
                  activeMilestone = m
                }
              }
            }
          }

          if ('bestStreak' in sim) {
            const streak = (sim as any).bestStreak as number
            if (streak > bestStreak) {
              bestStreak = streak
              if (bestStreak >= 10) {
                const existing = milestones.find(m => m.type === 'STREAK_10')
                if (!existing) {
                  const m: MilestoneEvent = {
                    type: 'STREAK_10',
                    label: '10 IN A ROW',
                    generation,
                    timestamp: newElapsed,
                  }
                  milestones.push(m)
                  activeMilestone = m
                }
              }
            }
          }
        }
      }

      // Check if all individuals in this generation are done
      const allDone = simStates.every(s => s && s.elapsed >= config.simDuration)
      if (allDone) {
        // Score all individuals
        for (let i = 0; i < TRAINING_POP_SIZE; i++) {
          const sim = simStates[i]
          if (sim) {
            fitnesses[i] = scoreFitness(sim, config)
          }
        }

        // Find best in generation
        const genBest = Math.max(...fitnesses)
        if (genBest > bestFitness) {
          bestFitness = genBest
          const bestIdx = fitnesses.indexOf(genBest)
          const bestPop = population[bestIdx]
          if (bestPop) {
            bestWeights = [...bestPop]
          }
        }

        // Record history
        fitnessHistory = [...fitnessHistory, genBest].slice(-30)

        // Evolve
        population = ga.evolve(population, fitnesses, generation)
        generation++
        fitnesses = new Array(TRAINING_POP_SIZE).fill(0)

        // Reset sims and load new weights
        const newSimStates: SimState[] = []
        for (let i = 0; i < TRAINING_POP_SIZE; i++) {
          const nn = nns[i]
          if (nn) {
            nn.setWeights(population[i] ?? [])
          }
          newSimStates.push(initSim(config))
        }
        simStates = newSimStates

        // Check breakthrough
        if (bestFitness >= BREAKTHROUGH_THRESHOLD && generation >= 3) {
          set({
            timerElapsed: newElapsed,
            trainingPhase: 'graduated',
            generation, population, fitnesses, bestFitness, bestWeights,
            fitnessHistory, simStates, totalHits, totalKills, bestStreak,
            milestones, activeMilestone,
            tickCounter: state.tickCounter + 1,
          })
          return
        }
      }
    }

    // Build ghost snapshots for rendering
    const ghostSnapshots: GhostSnapshot[] = simStates.map(sim => ({
      x: 'soldierX' in sim ? (sim as any).soldierX : 0,
      z: 'soldierZ' in sim ? (sim as any).soldierZ : 0,
      rotation: 'soldierRotation' in sim ? (sim as any).soldierRotation : 0,
      justFired: 'justFired' in sim ? (sim as any).justFired : false,
    }))

    // Champion = individual with highest current fitness so far (or best weight holder)
    let championIndex = 0
    let highestFit = -1
    for (let i = 0; i < fitnesses.length; i++) {
      if ((fitnesses[i] ?? 0) > highestFit) {
        highestFit = fitnesses[i] ?? 0
        championIndex = i
      }
    }

    set({
      timerElapsed: newElapsed,
      generation, population, fitnesses, bestFitness, bestWeights,
      fitnessHistory, currentIndividual: 0, simStates,
      totalHits, totalKills, bestStreak, milestones, activeMilestone,
      ghostSnapshots, championIndex,
      tickCounter: state.tickCounter + 1,
    })
  },

  graduate: () => {
    const { slotSoldierId, bestWeights, bestFitness, generation } = get()
    if (!slotSoldierId || bestWeights.length === 0) return

    // Write trained weights to campStore
    useCampStore.getState().updateSoldier(slotSoldierId, {
      trained: true,
      weights: bestWeights,
      fitnessScore: bestFitness,
      generationsTrained: generation,
    })

    set({ trainingPhase: 'ceremony-end' })
  },

  endCeremonyDone: () => {
    get().reset()
  },

  reset: () => {
    set({
      trainingPhase: 'empty',
      slotSoldierId: null,
      slotSoldierName: null,
      slotWeapon: null,
      computeTier: 1,
      generation: 0,
      bestFitness: 0,
      bestWeights: [],
      fitnessHistory: [],
      currentIndividual: 0,
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
    })
  },
}))
