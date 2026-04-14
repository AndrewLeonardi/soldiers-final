/**
 * PlacementOverlay — place soldiers onto the battlefield with action verbs.
 *
 * Sprint 5 (battle rework). Player places soldiers in spawn zone and assigns
 * pre-battle tactical orders (CHARGE / ADVANCE / FLANK / HOLD).
 * Defense placement removed — defenses belong to the enemy now.
 *
 * Bottom tray shows:
 *   - Soldier cards (tap to select, tap ground to place)
 *   - Action verb selector for placed soldiers
 *   - START BATTLE button (requires ≥1 placed soldier)
 */
import { useCallback, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import type { PlacedSoldier } from '@stores/campBattleStore'
import { WeaponPicker } from './WeaponPicker'
import { RankBadge } from './RankBadge'
import type { WeaponType, ActionVerb } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const ACTION_VERBS: { verb: ActionVerb; label: string; color: string }[] = [
  { verb: 'charge', label: 'CHARGE', color: '#e74c3c' },
  { verb: 'advance', label: 'ADVANCE', color: '#4caf50' },
  { verb: 'flank', label: 'FLANK', color: '#2196f3' },
  { verb: 'hold', label: 'HOLD', color: '#ffc107' },
]

export function PlacementOverlay() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const pendingPlacement = useSceneStore((s) => s.pendingPlacement)
  const setPendingPlacement = useSceneStore((s) => s.setPendingPlacement)
  const soldiers = useCampStore((s) => s.soldiers)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const placedSoldiers = useCampBattleStore((s) => s.placedSoldiers)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)
  const selectForPlacement = useCampBattleStore((s) => s.selectForPlacement)
  const placeSoldier = useCampBattleStore((s) => s.placeSoldier)
  const removePlacedSoldier = useCampBattleStore((s) => s.removePlacedSoldier)
  const setActionVerb = useCampBattleStore((s) => s.setActionVerb)
  const reset = useCampBattleStore((s) => s.reset)

  const handleWeaponPick = useCallback((weapon: WeaponType) => {
    if (!pendingPlacement) return
    const { soldier: sol, position } = pendingPlacement
    const placed: PlacedSoldier = {
      soldierId: sol.id,
      name: sol.name,
      weapon,
      position,
      actionVerb: 'advance',
    }
    placeSoldier(placed)
    setPendingPlacement(null)
  }, [pendingPlacement, placeSoldier, setPendingPlacement])

  const handleWeaponCancel = useCallback(() => {
    setPendingPlacement(null)
  }, [setPendingPlacement])

  const handleSelectSoldier = useCallback((soldierId: string) => {
    sfx.buttonTap()
    const alreadyPlaced = placedSoldiers.some(p => p.soldierId === soldierId)
    if (alreadyPlaced) {
      removePlacedSoldier(soldierId)
      return
    }
    selectForPlacement(soldierId)
  }, [placedSoldiers, selectForPlacement, removePlacedSoldier])

  const handleVerbSelect = useCallback((soldierId: string, verb: ActionVerb) => {
    sfx.buttonTap()
    setActionVerb(soldierId, verb)
  }, [setActionVerb])

  const handleCancel = useCallback(() => {
    sfx.buttonTap()
    reset()
    setBattlePhase('idle')
  }, [reset, setBattlePhase])

  const handleStartBattle = useCallback(() => {
    if (placedSoldiers.length === 0) return
    sfx.buttonTap()
    setBattlePhase('loading')
  }, [placedSoldiers.length, setBattlePhase])

  if (battlePhase !== 'placing' || !battleConfig) return null

  const maxSoldiers = battleConfig.maxSoldiers
  const placedIds = new Set(placedSoldiers.map(p => p.soldierId))
  const placedMap = new Map(placedSoldiers.map(p => [p.soldierId, p]))

  return (
    <div className="placement-overlay">
      {/* Top info bar */}
      <div className="placement-top-bar">
        <button className="placement-cancel-btn" onClick={handleCancel}>CANCEL</button>
        <span className="placement-title">{battleConfig.name}</span>
        <div className="placement-top-right">
          <span className="placement-count">{placedSoldiers.length}/{maxSoldiers}</span>
        </div>
      </div>

      {/* Bottom soldier tray */}
      <div className="placement-tray">
        <div className="placement-tray-scroll">
          {soldiers.filter(s => !s.injuredUntil || s.injuredUntil <= Date.now()).map((sol) => {
            const isPlaced = placedIds.has(sol.id)
            const isSelected = selectedPlacementId === sol.id
            const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []
            const hasBrain = trainedWeapons.length > 0
            const deployWeapon = hasBrain ? trainedWeapons[trainedWeapons.length - 1]!.toUpperCase() : null
            const placedData = placedMap.get(sol.id)
            const currentVerb = placedData?.actionVerb ?? 'advance'

            return (
              <div key={sol.id} className="placement-card-wrapper">
                <button
                  className={`placement-card ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''} ${!hasBrain ? 'untrained' : ''}`}
                  onClick={() => handleSelectSoldier(sol.id)}
                >
                  <span className="placement-card-rank"><RankBadge xp={sol.xp ?? 0} size="sm" /></span>
                  <span className="placement-card-name">{sol.name}</span>
                  {hasBrain ? (
                    <span className="placement-card-weapon">
                      {trainedWeapons.length > 1
                        ? `${trainedWeapons.length} WEAPONS`
                        : deployWeapon}
                    </span>
                  ) : (
                    <span className="placement-card-weapon untrained">UNTRAINED</span>
                  )}
                  {hasBrain && <span className="placement-card-trained">TRAINED</span>}
                  {!hasBrain && <span className="placement-card-warning">WON'T FIRE</span>}
                  {isPlaced && <span className="placement-card-check">✓</span>}
                </button>

                {/* Action verb selector — only visible for placed soldiers */}
                {isPlaced && (
                  <div className="placement-verb-row">
                    {ACTION_VERBS.map((av) => (
                      <button
                        key={av.verb}
                        className={`placement-verb-pill ${currentVerb === av.verb ? 'active' : ''}`}
                        style={{
                          borderColor: currentVerb === av.verb ? av.color : 'transparent',
                          color: currentVerb === av.verb ? av.color : '#7a8a7a',
                        }}
                        onClick={(e) => { e.stopPropagation(); handleVerbSelect(sol.id, av.verb) }}
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Start battle button */}
        <button
          className={`placement-start-btn ${placedSoldiers.length === 0 ? 'disabled' : ''}`}
          onClick={handleStartBattle}
          disabled={placedSoldiers.length === 0}
        >
          START BATTLE
        </button>
      </div>

      {/* Weapon picker for multi-brain soldiers */}
      {pendingPlacement && (
        <WeaponPicker
          soldier={pendingPlacement.soldier}
          onPick={handleWeaponPick}
          onCancel={handleWeaponCancel}
        />
      )}
    </div>
  )
}

/**
 * PlacementGroundHandler — invisible 3D plane for ground clicks during placement.
 * Constrains soldier placement to the playerSpawnZone from battle config.
 * Mounts inside CampScene (R3F context).
 */
export function PlacementGroundHandler() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)
  const placeSoldier = useCampBattleStore((s) => s.placeSoldier)
  const selectForPlacement = useCampBattleStore((s) => s.selectForPlacement)
  const soldiers = useCampStore((s) => s.soldiers)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)

  const handleGroundClick = useCallback((e: any) => {
    if (battlePhase !== 'placing') return
    e.stopPropagation()

    // Only soldier placement — no defense placement
    if (!selectedPlacementId) return

    const sol = soldiers.find(s => s.id === selectedPlacementId)
    if (!sol) return

    const point = e.point

    // Constrain to spawn zone if defined, otherwise full arena
    const zone = battleConfig?.playerSpawnZone
    const x = zone
      ? Math.max(zone.minX, Math.min(zone.maxX, point.x))
      : Math.max(-11, Math.min(11, point.x))
    const z = zone
      ? Math.max(zone.minZ, Math.min(zone.maxZ, point.z))
      : Math.max(-8, Math.min(8, point.z))

    const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []

    // Multi-brain soldier → weapon picker
    if (trainedWeapons.length >= 2) {
      useSceneStore.getState().setPendingPlacement({ soldier: sol, position: [x, 0, z] })
      selectForPlacement(null)
      return
    }

    // Single brain or untrained — deploy immediately
    const deployWeapon = trainedWeapons.length > 0
      ? trainedWeapons[trainedWeapons.length - 1]!
      : 'rifle'

    const placed: PlacedSoldier = {
      soldierId: sol.id,
      name: sol.name,
      weapon: deployWeapon as any,
      position: [x, 0, z],
      actionVerb: 'advance',
    }

    placeSoldier(placed)
    selectForPlacement(null)
    sfx.buttonTap()
  }, [battlePhase, selectedPlacementId, soldiers, battleConfig, placeSoldier, selectForPlacement])

  if (battlePhase !== 'placing') return null

  return (
    <mesh
      position={[0, 0.01, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerUp={handleGroundClick}
    >
      <planeGeometry args={[28, 22]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
