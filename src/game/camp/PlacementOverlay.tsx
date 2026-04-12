/**
 * PlacementOverlay — drag soldiers onto the battlefield before fighting.
 *
 * Sprint 4, Phase 2. Shows a tray of available soldiers at bottom.
 * Tap a soldier card → selected for placement.
 * Tap on the 3D ground → place that soldier at the clicked position.
 * Already-placed soldiers show as green dots on the field.
 * "START BATTLE" button requires at least 1 placed soldier.
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import type { PlacedSoldier } from '@stores/campBattleStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function PlacementOverlay() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const soldiers = useCampStore((s) => s.soldiers)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const placedSoldiers = useCampBattleStore((s) => s.placedSoldiers)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)
  const selectForPlacement = useCampBattleStore((s) => s.selectForPlacement)
  const placeSoldier = useCampBattleStore((s) => s.placeSoldier)
  const removePlacedSoldier = useCampBattleStore((s) => s.removePlacedSoldier)
  const reset = useCampBattleStore((s) => s.reset)

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
            const hasBrain = sol.trainedBrains && Object.keys(sol.trainedBrains).length > 0

            return (
              <button
                key={sol.id}
                className={`placement-card ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectSoldier(sol.id)}
              >
                <span className="placement-card-name">{sol.name}</span>
                <span className="placement-card-weapon">{sol.weapon.toUpperCase()}</span>
                {hasBrain && <span className="placement-card-trained">TRAINED</span>}
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

    const placed: PlacedSoldier = {
      soldierId: sol.id,
      name: sol.name,
      weapon: sol.weapon as any,
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
