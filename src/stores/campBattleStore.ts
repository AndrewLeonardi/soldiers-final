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
import type { WeaponType, ActionVerb } from '@config/types'
import { DEFENSE_COSTS } from '@config/defenses'
import type { DefenseType } from '@config/defenses'

// Re-export for consumers that were importing from this file
export { DEFENSE_COSTS }
export type { DefenseType }

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
  actionVerb?: ActionVerb  // pre-battle tactical order
  elevated?: boolean       // on a tower — lands at Y=1.5

  // Enemy-only
  enemyType?: 'infantry' | 'jeep' | 'tank'
  spawnPosition?: [number, number, number]  // anchor point for defend-position AI

  // Combat movement state (enemy AI)
  _combatTimer?: number
  _strafeDir?: number
  _advanceRetreat?: number
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
  actionVerb: ActionVerb
  elevated?: boolean  // on a tower — Y=1.5, range bonus
}

// ── Placed defense (during placement phase) ──

export interface PlacedDefense {
  id: string
  type: DefenseType
  position: [number, number, number]
  rotation: number
}

// ── State ──

interface CampBattleState {
  // Config
  battleConfig: CampBattleConfig | null

  // Placement — soldiers
  placedSoldiers: PlacedSoldier[]
  selectedPlacementId: string | null  // which soldier is being placed

  // Placement — defenses
  placedDefenses: PlacedDefense[]
  selectedDefenseType: DefenseType | null
  defenseRotation: number  // radians, increments by π/2

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

  // Kill tracking (ephemeral, cleared on reset)
  soldierKills: Record<string, number>
  // XP earned per soldier (computed at battle end, consumed by ResultOverlay)
  soldierXPEarned: Record<string, { xp: number; newRankName: string | null }>

  // Actions — soldiers
  initBattle: (config: CampBattleConfig) => void
  placeSoldier: (soldier: PlacedSoldier) => void
  removePlacedSoldier: (soldierId: string) => void
  selectForPlacement: (soldierId: string | null) => void

  // Actions — action verbs
  setActionVerb: (soldierId: string, verb: ActionVerb) => void

  // Actions — defenses (legacy — player no longer places defenses in new battles)
  placeDefense: (defense: PlacedDefense) => void
  removeDefense: (defenseId: string) => void
  selectDefenseType: (type: DefenseType | null) => void
  rotateDefense: () => void

  // Actions — battle
  setResult: (result: 'victory' | 'defeat', stars: number) => void
  setWeaponUnlocked: (weapon: string | null) => void
  recordKill: (soldierId: string) => void
  setSoldierXPEarned: (data: Record<string, { xp: number; newRankName: string | null }>) => void
  reset: () => void
}

export const useCampBattleStore = create<CampBattleState>()((set, get) => ({
  battleConfig: null,
  placedSoldiers: [],
  selectedPlacementId: null,
  placedDefenses: [],
  selectedDefenseType: null,
  defenseRotation: 0,
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
  soldierKills: {},
  soldierXPEarned: {},

  initBattle: (config) => {
    set({
      battleConfig: config,
      placedSoldiers: [],
      selectedPlacementId: null,
      placedDefenses: [],
      selectedDefenseType: null,
      defenseRotation: 0,
      playerUnits: [],
      enemyUnits: [],
      projectiles: [],
      explosions: [],
      battleTime: 0,
      currentWave: 0,
      wavesSpawned: new Array(config.waves?.length ?? 0).fill(false),
      result: null,
      starsEarned: 0,
      weaponUnlocked: null,
      soldierKills: {},
      soldierXPEarned: {},
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
    set({ selectedPlacementId: soldierId, selectedDefenseType: null })
  },

  setActionVerb: (soldierId, verb) => {
    set((s) => ({
      placedSoldiers: s.placedSoldiers.map((p) =>
        p.soldierId === soldierId ? { ...p, actionVerb: verb } : p
      ),
    }))
  },

  placeDefense: (defense) => {
    set((s) => ({
      placedDefenses: [...s.placedDefenses, defense],
      selectedDefenseType: null, // deselect after placing
    }))
  },

  removeDefense: (defenseId) => {
    set((s) => ({
      placedDefenses: s.placedDefenses.filter(d => d.id !== defenseId),
    }))
  },

  selectDefenseType: (type) => {
    set({ selectedDefenseType: type, selectedPlacementId: null })
  },

  rotateDefense: () => {
    set((s) => ({ defenseRotation: s.defenseRotation + Math.PI / 2 }))
  },

  setResult: (result, stars) => {
    set({ result, starsEarned: stars })
  },

  setWeaponUnlocked: (weapon) => {
    set({ weaponUnlocked: weapon })
  },

  recordKill: (soldierId) => {
    const kills = { ...get().soldierKills }
    kills[soldierId] = (kills[soldierId] ?? 0) + 1
    set({ soldierKills: kills })
  },

  setSoldierXPEarned: (data) => {
    set({ soldierXPEarned: data })
  },

  reset: () => {
    set({
      battleConfig: null,
      placedSoldiers: [],
      selectedPlacementId: null,
      placedDefenses: [],
      selectedDefenseType: null,
      defenseRotation: 0,
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
      soldierKills: {},
      soldierXPEarned: {},
    })
  },
}))
