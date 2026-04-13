/**
 * PlacementOverlay — drag soldiers onto the battlefield before fighting.
 *
 * Sprint 4, Phase 2. Shows a tray of available soldiers at bottom.
 * Tap a soldier card → selected for placement.
 * Tap on the 3D ground → place that soldier at the clicked position.
 * Already-placed soldiers show as green dots on the field.
 * "START BATTLE" button requires at least 1 placed soldier.
 */
import { useCallback, useState } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import type { SoldierRecord } from '@stores/campStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import type { PlacedSoldier } from '@stores/campBattleStore'
import { WeaponPicker } from './WeaponPicker'
import { RankBadge } from './RankBadge'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

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
  const reset = useCampBattleStore((s) => s.reset)

  const handleWeaponPick = useCallback((weapon: WeaponType) => {
    if (!pendingPlacement) return
    const { soldier: sol, position } = pendingPlacement
    const placed: PlacedSoldier = {
      soldierId: sol.id,
      name: sol.name,
      weapon,
      position,
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
      // Tap already-placed soldier → remove from field
      removePlacedSoldier(soldierId)
      return
    }
    selectForPlacement(soldierId)
  }, [placedSoldiers, selectForPlacement, removePlacedSoldier])

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

  return (
    <div className="placement-overlay">
      {/* Top info bar */}
      <div className="placement-top-bar">
        <button className="placement-cancel-btn" onClick={handleCancel}>CANCEL</button>
        <span className="placement-title">{battleConfig.name}</span>
        <span className="placement-count">{placedSoldiers.length}/{maxSoldiers}</span>
      </div>

      {/* Bottom soldier tray */}
      <div className="placement-tray">
        <div className="placement-tray-scroll">
          {soldiers.filter(s => !s.injuredUntil || s.injuredUntil <= Date.now()).map((sol) => {
            const isPlaced = placedIds.has(sol.id)
            const isSelected = selectedPlacementId === sol.id
            const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []
            const hasBrain = trainedWeapons.length > 0
            // Display the weapon they'll deploy with (last trained, or "NONE")
            const deployWeapon = hasBrain ? trainedWeapons[trainedWeapons.length - 1]!.toUpperCase() : null

            return (
              <button
                key={sol.id}
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
 * Mounts inside CampScene (R3F context).
 */
export function PlacementGroundHandler() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)
  const placeSoldier = useCampBattleStore((s) => s.placeSoldier)
  const selectForPlacement = useCampBattleStore((s) => s.selectForPlacement)
  const soldiers = useCampStore((s) => s.soldiers)

  const handleGroundClick = useCallback((e: any) => {
    if (battlePhase !== 'placing' || !selectedPlacementId) return
    e.stopPropagation()

    const point = e.point
    // Clamp within camp bounds
    const x = Math.max(-11, Math.min(11, point.x))
    const z = Math.max(-8, Math.min(8, point.z))

    const sol = soldiers.find(s => s.id === selectedPlacementId)
    if (!sol) return

    const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []

    // Multi-brain soldier → store pending placement for weapon picker
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
    }

    placeSoldier(placed)
    selectForPlacement(null)
    sfx.buttonTap()
  }, [battlePhase, selectedPlacementId, soldiers, placeSoldier, selectForPlacement])

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
