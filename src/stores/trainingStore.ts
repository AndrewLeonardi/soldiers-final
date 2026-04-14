/**
 * Training Store — bridges the pure ML engine to React UI.
 *
 * Manages the full training lifecycle:
 * 1. Start training (spend tokens, init GA population)
 * 2. Tick loop (run sim, evaluate fitness, evolve)
 * 3. Graduation (save brain weights, unlock weapon)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { NeuralNet } from '@engine/ml/neuralNet'
import { GeneticAlgorithm } from '@engine/ml/geneticAlgorithm'
import { initSim, simTick, scoreFitness } from '@engine/ml/simulationRunner'
import type { SimState, SimConfig, TrainingBounds } from '@engine/ml/simulationRunner'
import type { WeaponType } from '@config/types'
import { WEAPON_TRAINING } from '@config/roster'
import { useGameStore } from './gameStore'
import { useRosterStore } from './rosterStore'
import { worldRegistry } from '@config/worlds'
import { getWorldBounds } from '@engine/physics/battlePhysics'

const INPUT_SIZE = 6
const HIDDEN_SIZE = 12
const OUTPUT_SIZE = 4
const WEIGHT_COUNT = NeuralNet.weightCount(INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE)

const ga = new GeneticAlgorithm(30, 6, 0.2, 0.6, 0.35)

type TrainingStatus = 'idle' | 'running' | 'paused' | 'graduated'

interface TrainingState {
  status: TrainingStatus
  soldierId: string | null
  weapon: WeaponType | null

  generation: number
  population: number[][]
  currentIndividual: number
  fitnesses: number[]
  bestFitness: number
  bestWeights: number[]
  fitnessHistory: number[]

  simState: SimState | null
  simConfig: SimConfig | null
  nn: NeuralNet | null

  simSpeed: number
  graduated: boolean
  tickCounter: number  // increments each frame to force re-renders

  startTraining: (soldierId: string, weapon: WeaponType) => boolean
  tick: (dt: number) => void
  setSpeed: (speed: number) => void
  pause: () => void
  resume: () => void
  graduate: () => void
  stopTraining: () => void
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
  status: 'idle',
  soldierId: null,
  weapon: null,
  generation: 0,
  population: [],
  currentIndividual: 0,
  fitnesses: [],
  bestFitness: 0,
  bestWeights: [],
  fitnessHistory: [],
  simState: null,
  simConfig: null,
  nn: null,
  simSpeed: 10,
  graduated: false,
  tickCounter: 0,

  startTraining: (soldierId, weapon) => {
    const config = WEAPON_TRAINING[weapon]
    if (!config) return false

    const spent = useGameStore.getState().spendTokens(config.tokenCost)
    if (!spent) return false

    const soldier = useRosterStore.getState().soldiers.find(s => s.id === soldierId)
    const existingBrain = soldier?.trainedBrains?.[weapon]

    const population = existingBrain
      ? ga.initSeededPopulation(WEIGHT_COUNT, existingBrain)
      : ga.initPopulation(WEIGHT_COUNT)

    const nn = new NeuralNet(INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE)
    nn.setWeights(population[0])

    // Derive training bounds from current world so targets stay on the table
    const currentWorldId = useGameStore.getState().currentWorldId
    const worldConfig = currentWorldId ? worldRegistry.getWorld(currentWorldId) : worldRegistry.getWorld('kitchen')
    const groundSize = worldConfig?.ground.size ?? [16, 12] as [number, number]
    const wb = getWorldBounds(groundSize)
    const bounds: TrainingBounds = {
      minX: 2,
      maxX: wb.tableEdgeRight - 0.5,
      minZ: -(wb.tableEdgeZ - 0.5),
      maxZ: wb.tableEdgeZ - 0.5,
    }

    const simConfig: SimConfig = {
      weaponType: weapon,
      simDuration: config.simDuration,
      bounds,
    }
    const simState = initSim(simConfig)

    set({
      status: 'running',
      soldierId,
      weapon,
      generation: 0,
      population,
      currentIndividual: 0,
      fitnesses: new Array(ga.populationSize).fill(0),
      bestFitness: 0,
      bestWeights: [],
      fitnessHistory: [],
      simState,
      simConfig,
      nn,
      simSpeed: 10,
      graduated: false,
      tickCounter: 0,
    })

    return true
  },

  tick: (_dt) => {
    const state = get()
    if (state.status !== 'running') return
    if (!state.simState || !state.simConfig || !state.nn) return

    const SIM_DT = 1 / 60
    const stepsPerFrame = state.simSpeed
    let s = state.simState
    const config = state.simConfig
    let nn = state.nn
    let currentIndividual = state.currentIndividual
    let fitnesses = state.fitnesses
    let generation = state.generation
    let population = state.population
    let bestFitness = state.bestFitness
    let bestWeights = state.bestWeights
    let fitnessHistory = state.fitnessHistory
    let graduated = false

    for (let step = 0; step < stepsPerFrame; step++) {
      simTick(s, nn, SIM_DT, config)

      if (s.elapsed >= config.simDuration) {
        const fitness = scoreFitness(s, config)
        fitnesses = [...fitnesses]
        fitnesses[currentIndividual] = fitness

        const nextIndividual = currentIndividual + 1

        if (nextIndividual >= ga.populationSize) {
          // Generation complete — evolve
          const genBest = Math.max(...fitnesses)
          bestFitness = Math.max(bestFitness, genBest)
          if (genBest >= bestFitness) {
            const bestIdx = fitnesses.indexOf(genBest)
            bestWeights = [...population[bestIdx]]
          }

          population = ga.evolve(population, fitnesses, generation)
          fitnessHistory = [...fitnessHistory, genBest].slice(-30)
          generation++
          fitnesses = new Array(ga.populationSize).fill(0)
          currentIndividual = 0

          // Check graduation
          const threshold = WEAPON_TRAINING[state.weapon!]?.fitnessThreshold ?? 0.6
          if (bestFitness >= threshold && generation >= 5) {
            graduated = true
          }
        } else {
          currentIndividual = nextIndividual
        }

        // Load next individual's weights and create fresh sim
        nn.setWeights(population[currentIndividual])
        s = initSim(config)

        if (graduated) break
      }
    }

    set({
      simState: s,
      nn,
      currentIndividual,
      fitnesses,
      generation,
      population,
      bestFitness,
      bestWeights,
      fitnessHistory,
      graduated,
      status: graduated ? 'graduated' : 'running',
      tickCounter: state.tickCounter + 1,
    })
  },

  setSpeed: (speed) => set({ simSpeed: speed }),

  pause: () => {
    if (get().status === 'running') set({ status: 'paused' })
  },

  resume: () => {
    if (get().status === 'paused') set({ status: 'running' })
  },

  graduate: () => {
    const { soldierId, weapon, bestWeights } = get()
    if (!soldierId || !weapon || bestWeights.length === 0) return

    const store = useRosterStore.getState()
    const soldiers = store.soldiers.map(s => {
      if (s.id !== soldierId) return s
      const brains = { ...s.trainedBrains, [weapon]: bestWeights }
      const unlocked = s.unlockedWeapons.includes(weapon)
        ? s.unlockedWeapons
        : [...s.unlockedWeapons, weapon]
      return { ...s, trainedBrains: brains, unlockedWeapons: unlocked, equippedWeapon: weapon }
    })
    useRosterStore.setState({ soldiers })

    set({
      status: 'idle',
      soldierId: null,
      weapon: null,
      simState: null,
      simConfig: null,
      nn: null,
      graduated: false,
    })
  },

  stopTraining: () => {
    set({
      status: 'idle',
      soldierId: null,
      weapon: null,
      simState: null,
      simConfig: null,
      nn: null,
      graduated: false,
      generation: 0,
      population: [],
      fitnesses: [],
      bestFitness: 0,
      bestWeights: [],
      fitnessHistory: [],
    })
  },
}),
    {
      name: 'toy-soldiers-training',
      partialize: (state) => ({
        status: state.status === 'running' ? 'paused' : state.status,
        soldierId: state.soldierId,
        weapon: state.weapon,
        generation: state.generation,
        population: state.population,
        currentIndividual: state.currentIndividual,
        bestFitness: state.bestFitness,
        bestWeights: state.bestWeights,
        fitnessHistory: state.fitnessHistory,
        // Don't persist: simState, simConfig, nn, fitnesses (reconstructed on resume)
      }),
    },
  ),
)

// Dev testing helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as any).__trainingStore = useTrainingStore
  ;(window as any).__gameStore = useGameStore
  ;(window as any).__rosterStore = useRosterStore
}
