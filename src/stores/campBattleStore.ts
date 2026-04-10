/**
 * campBattleStore — ephemeral battle state for the /camp route.
 *
 * Sprint 4, Phase 0b. Transient state for the battle lifecycle:
 * picking → placing → fighting → result. Not persisted.
 *
 * Pattern matches campTrainingStore: tick logic lives in the scene
 * component (CampBattleLoop), this store holds the data.
 */
import { create } from 'zustand'
import type { CampBattleConfig } from '@config/campBattles'
import type { WeaponType } from '@config/types'

// ── Battle unit (mutable during fight) ──

export interface BattleUnit {
  id: string
  name: string
  team: 'green' | 'tan'
  weapon: WeaponType
  position: [number, number, number]
  rotation: number
  health: number
  maxHealth: number
  status: 'idle' | 'walking' | 'firing' | 'hit' | 'dead'
  lastFireTime: number
  fireRate: number
  range: number
  damage: number
  speed: number
  facingAngle: number
  velocity: [number, number, number]
  stateAge: number
  spinSpeed: number
  hitRecoveryAt?: number

  // Player-only
  soldierId?: string       // campStore soldier ID
  isTrained: boolean
  brainWeights?: number[]  // NN weights if trained

  // Enemy-only
  enemyType?: 'infantry' | 'jeep' | 'tank'
}

export interface BattleProjectile {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  type: 'bullet' | 'rocket' | 'grenade'
  damage: number
  ownerId: string
  team: 'green' | 'tan'
  age: number
  fuseTime?: number
}

export interface BattleExplosion {
  id: string
  position: [number, number, number]
  scale: number
  time: number  // creation time
}

// ── Placed soldier (during placement phase) ──

export interface PlacedSoldier {
  soldierId: string
  name: string
  weapon: WeaponType
  position: [number, number, number]
}

// ── State ──

interface CampBattleState {
  // Config
  battleConfig: CampBattleConfig | null

  // Placement
  placedSoldiers: PlacedSoldier[]
  selectedPlacementId: string | null  // which soldier is being placed

  // Battle
  playerUnits: BattleUnit[]
  enemyUnits: BattleUnit[]
  projectiles: BattleProjectile[]
  explosions: BattleExplosion[]

  // Progress
  battleTime: number
  currentWave: number
  wavesSpawned: boolean[]  // track which waves have been triggered

  // Result
  result: 'victory' | 'defeat' | null
  starsEarned: number
  weaponUnlocked: string | null  // weapon unlocked on this victory

  // Actions
  initBattle: (config: CampBattleConfig) => void
  placeSoldier: (soldier: PlacedSoldier) => void
  removePlacedSoldier: (soldierId: string) => void
  selectForPlacement: (soldierId: string | null) => void
  setResult: (result: 'victory' | 'defeat', stars: number) => void
  setWeaponUnlocked: (weapon: string | null) => void
  reset: () => void
}

export const useCampBattleStore = create<CampBattleState>()((set, get) => ({
  battleConfig: null,
  placedSoldiers: [],
  selectedPlacementId: null,
  playerUnits: [],
  enemyUnits: [],
  projectiles: [],
  explosions: [],
  battleTime: 0,
  currentWave: 0,
  wavesSpawned: [],
  result: null,
  starsEarned: 0,
  weaponUnlocked: null,

  initBattle: (config) => {
    set({
      battleConfig: config,
      placedSoldiers: [],
      selectedPlacementId: null,
      playerUnits: [],
      enemyUnits: [],
      projectiles: [],
      explosions: [],
      battleTime: 0,
      currentWave: 0,
      wavesSpawned: new Array(config.waves.length).fill(false),
      result: null,
      starsEarned: 0,
      weaponUnlocked: null,
    })
  },

  placeSoldier: (soldier) => {
    const state = get()
    const config = state.battleConfig
    if (!config) return
    // Enforce max soldiers
    if (state.placedSoldiers.length >= config.maxSoldiers) return
    // Don't place same soldier twice
    if (state.placedSoldiers.some(s => s.soldierId === soldier.soldierId)) return
    set({ placedSoldiers: [...state.placedSoldiers, soldier] })
  },

  removePlacedSoldier: (soldierId) => {
    set((s) => ({
      placedSoldiers: s.placedSoldiers.filter(p => p.soldierId !== soldierId),
    }))
  },

  selectForPlacement: (soldierId) => {
    set({ selectedPlacementId: soldierId })
  },

  setResult: (result, stars) => {
    set({ result, starsEarned: stars })
  },

  setWeaponUnlocked: (weapon) => {
    set({ weaponUnlocked: weapon })
  },

  reset: () => {
    set({
      battleConfig: null,
      placedSoldiers: [],
      selectedPlacementId: null,
      playerUnits: [],
      enemyUnits: [],
      projectiles: [],
      explosions: [],
      battleTime: 0,
      currentWave: 0,
      wavesSpawned: [],
      result: null,
      starsEarned: 0,
      weaponUnlocked: null,
    })
  },
}))
