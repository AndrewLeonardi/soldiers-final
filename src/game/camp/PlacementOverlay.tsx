/**
 * PlacementOverlay — drag soldiers AND defenses onto the battlefield.
 *
 * Sprint 4, Phase 2 (v2 — defense placement).
 *
 * Bottom tray shows:
 *   - Soldier cards (tap to select, tap ground to place)
 *   - Divider
 *   - Defense cards with count limits (X/Y remaining)
 *   - Rotate button (when a defense is selected)
 *   - START BATTLE button (requires ≥1 placed soldier)
 *
 * Defenses are count-limited. Soldiers are free to place.
 */
import { useCallback, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import type { SoldierRecord } from '@stores/campStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import type { PlacedSoldier } from '@stores/campBattleStore'
import { DEFENSE_OPTIONS } from '@config/defenses'
import type { DefenseType } from '@config/defenses'
import { DEFENSE_GHOST } from '@config/defenseRendering'
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
  const selectedDefenseType = useCampBattleStore((s) => s.selectedDefenseType)
  const selectDefenseType = useCampBattleStore((s) => s.selectDefenseType)
  const rotateDefense = useCampBattleStore((s) => s.rotateDefense)
  const placedDefenses = useCampBattleStore((s) => s.placedDefenses)
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

  const handleSelectDefense = useCallback((type: DefenseType) => {
    sfx.buttonTap()
    // Toggle: tap same defense again to deselect
    if (selectedDefenseType === type) {
      selectDefenseType(null)
    } else {
      selectDefenseType(type)
    }
  }, [selectedDefenseType, selectDefenseType])

  const handleRotate = useCallback(() => {
    sfx.buttonTap()
    rotateDefense()
  }, [rotateDefense])

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
  const isDefenseSelected = selectedDefenseType !== null

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

      {/* Bottom soldier + defense tray */}
      <div className="placement-tray">
        <div className="placement-tray-scroll">
          {/* ── Soldier cards ── */}
          {soldiers.filter(s => !s.injuredUntil || s.injuredUntil <= Date.now()).map((sol) => {
            const isPlaced = placedIds.has(sol.id)
            const isSelected = selectedPlacementId === sol.id
            const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []
            const hasBrain = trainedWeapons.length > 0
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

          {/* ── Divider ── */}
          <div className="placement-divider" />

          {/* ── Defense cards ── */}
          {DEFENSE_OPTIONS.map((def) => {
            const placedCount = placedDefenses.filter(d => d.type === def.type).length
            const maxCount = def.maxCount ?? 5
            const hasRemaining = placedCount < maxCount
            const isSelected = selectedDefenseType === def.type
            return (
              <button
                key={def.type}
                className={`placement-card defense-card ${isSelected ? 'selected' : ''} ${!hasRemaining ? 'disabled' : ''}`}
                onClick={() => hasRemaining && handleSelectDefense(def.type)}
                disabled={!hasRemaining}
              >
                <span className="placement-card-icon defense-icon">{def.icon}</span>
                <span className="placement-card-name">{def.label}</span>
                <span className="placement-card-cost">
                  <span>{placedCount}/{maxCount}</span>
                </span>
              </button>
            )
          })}

          {/* ── Rotate button (visible when defense selected) ── */}
          {isDefenseSelected && (
            <button className="placement-rotate-btn" onClick={handleRotate}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          )}
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
 * Handles BOTH soldier and defense placement.
 * Shows a translucent ghost preview of the selected defense at pointer position.
 * Mounts inside CampScene (R3F context).
 */
const ghostMat = new THREE.MeshBasicMaterial({
  color: 0x4CAF50,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
})

// Track pointer globally for raycasting (same pattern as /play)
const _mouse = new THREE.Vector2(9999, 9999)
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _intersect = new THREE.Vector3()
const _raycaster = new THREE.Raycaster()

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    _mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  })
}

/** Ghost preview mesh — shows translucent defense shape at cursor position. */
function PlacementGhost() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()
  const selectedDefenseType = useCampBattleStore((s) => s.selectedDefenseType)
  const defenseRotation = useCampBattleStore((s) => s.defenseRotation)

  useFrame(() => {
    if (!meshRef.current) return
    if (!selectedDefenseType) {
      meshRef.current.visible = false
      return
    }

    const config = DEFENSE_GHOST[selectedDefenseType]
    if (!config) {
      meshRef.current.visible = false
      return
    }

    // Raycast from pointer → ground plane
    _raycaster.setFromCamera(_mouse, camera)
    _raycaster.ray.intersectPlane(_groundPlane, _intersect)

    if (!_intersect) {
      meshRef.current.visible = false
      return
    }

    // Clamp within arena bounds
    const x = Math.max(-11, Math.min(11, _intersect.x))
    const z = Math.max(-8, Math.min(8, _intersect.z))

    meshRef.current.visible = true
    meshRef.current.geometry = config.geo
    meshRef.current.material = ghostMat
    meshRef.current.position.set(x, config.yOffset, z)
    meshRef.current.rotation.y = defenseRotation
  })

  return <mesh ref={meshRef} />
}

export function PlacementGroundHandler() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)
  const selectedDefenseType = useCampBattleStore((s) => s.selectedDefenseType)
  const defenseRotation = useCampBattleStore((s) => s.defenseRotation)
  const placeSoldier = useCampBattleStore((s) => s.placeSoldier)
  const placeDefense = useCampBattleStore((s) => s.placeDefense)
  const selectForPlacement = useCampBattleStore((s) => s.selectForPlacement)
  const selectDefenseType = useCampBattleStore((s) => s.selectDefenseType)
  const soldiers = useCampStore((s) => s.soldiers)

  const handleGroundClick = useCallback((e: any) => {
    if (battlePhase !== 'placing') return
    e.stopPropagation()

    const point = e.point
    // Clamp within arena bounds
    const x = Math.max(-11, Math.min(11, point.x))
    const z = Math.max(-8, Math.min(8, point.z))

    // ── Defense placement ──
    if (selectedDefenseType) {
      const defense = {
        id: `defense-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: selectedDefenseType,
        position: [x, 0, z] as [number, number, number],
        rotation: defenseRotation,
      }
      placeDefense(defense)
      sfx.buttonTap()
      return
    }

    // ── Soldier placement ──
    if (!selectedPlacementId) return

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
  }, [battlePhase, selectedPlacementId, selectedDefenseType, defenseRotation, soldiers, placeSoldier, placeDefense, selectForPlacement, selectDefenseType])

  if (battlePhase !== 'placing') return null

  return (
    <>
      {/* Invisible ground plane for click detection */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerUp={handleGroundClick}
      >
        <planeGeometry args={[28, 22]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Ghost preview — translucent defense shape following cursor */}
      <PlacementGhost />
    </>
  )
}
