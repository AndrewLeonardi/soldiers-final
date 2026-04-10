/**
 * BaseTrainingZone — the permanent training range on the right half of the
 * 24×16 toy soldier base.
 *
 * This replaces the old TrainingGroundsInterior "parade strip" that used to
 * render adjacent to the Training Grounds building. Training is now a
 * first-class zone on the map — always visible, always readable as "this is
 * where soldiers train," regardless of whether training is currently running.
 *
 * ─ Layout ─
 *
 * The zone group is anchored at world position [+5, 0, 0] in BaseScene,
 * which places it squarely in the right half of the base (x: +2 to +12).
 * All child positions below are in zone-local space.
 *
 * Permanent elements (always rendered):
 *   - Sandy ground patch — immediately signals "different territory"
 *   - 3 wooden target stands at zone-local [+3, 0, z] for z = -2, 0, +2
 *   - Sandbag firing line at zone-local [-2, 0, z] — the shooter's position
 *   - Barbed wire corner decorations
 *
 * Active elements (rendered per active training slot):
 *   - TraineeSoldier + TargetCan nested inside a sub-group at zone-local
 *     [-2, 0, laneZ]. The sub-group origin puts the trainee at zone-local
 *     [-2, 0, laneZ] and the TargetCan at [-2 + DEFAULT_TARGET_OFFSET, 0, laneZ]
 *     = roughly [+3.5, 0, laneZ], which visually lands at the target stands.
 *
 * ─ TargetCan / TraineeSoldier coordinate contract ─
 *
 * TraineeSoldier roots itself at (0,0,0) relative to its wrapper group.
 * TargetCan uses SIM_TO_LOCAL_X_OFFSET=2.2 internally, which means it
 * adds 2.2 to all sim-space x positions before rendering. With the
 * wrapper group at zone-local [-2, 0, laneZ], the trainee sits at
 * zone-local x = -2 and a sim-space target at x=3.3 renders at
 * zone-local x = -2 + (3.3 + 2.2) = +3.5. That lands right at the
 * target stand position. The contract holds without touching either child.
 *
 * ─ Multi-slot layout ─
 *
 * Up to 3 simultaneous training slots are supported. Lane z-offsets:
 *   slot-1 → laneZ = 0
 *   slot-2 → laneZ = -2
 *   slot-3 → laneZ = +2
 * When only 1 slot is active it uses the center lane (laneZ=0), so
 * single-slot runs look perfectly centered without any special casing.
 */

import * as THREE from 'three'
import { TraineeSoldier } from './TraineeSoldier'
import { TargetCan } from './TargetCan'
import type { WeaponType } from '@config/types'
import type { TrainingPhase } from '@game/stores/trainingStore'

// ── Types ─────────────────────────────────────────────────

export interface ActiveSlot {
  slotId: string
  phase: TrainingPhase
  weapon: WeaponType
}

interface BaseTrainingZoneProps {
  /** All training slots that are not idle. BaseScene passes them here. */
  slots: ActiveSlot[]
}

// ── Lane assignment ───────────────────────────────────────

/** Z-offsets for up to 3 simultaneous training lanes. Center lane first. */
const LANE_Z_OFFSETS = [0, -2.2, 2.2]

/** X position of trainee within the zone (firing line). */
const TRAINEE_ZONE_X = -2

/** X position of target stands within the zone. */
const TARGET_STAND_ZONE_X = 3.5

// ── Shared materials ──────────────────────────────────────

const matSand     = new THREE.MeshLambertMaterial({ color: 0xc4a056 })
const matWood     = new THREE.MeshLambertMaterial({ color: 0x9a7040 })
const matTarget   = new THREE.MeshLambertMaterial({ color: 0xcc2222 })
const matSandbag  = new THREE.MeshLambertMaterial({ color: 0xc4a86a })
const matWire     = new THREE.MeshLambertMaterial({ color: 0x444444 })

// ── Sub-components ────────────────────────────────────────

/** One wooden target stand: post + backing board + red face. */
function TargetStand({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh material={matWood} castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.07, 0.85, 0.07]} />
      </mesh>
      {/* Backing board */}
      <mesh material={matWood} castShadow position={[0, 0.70, 0]}>
        <boxGeometry args={[0.08, 0.55, 0.38]} />
      </mesh>
      {/* Target face — slightly proud of the backing */}
      <mesh material={matTarget} castShadow position={[0.045, 0.70, 0]}>
        <boxGeometry args={[0.03, 0.48, 0.30]} />
      </mesh>
    </group>
  )
}

/** A rounded sandbag (squashed box). */
function Sandbag({ position }: { position: [number, number, number] }) {
  return (
    <mesh material={matSandbag} castShadow position={position}>
      <boxGeometry args={[0.45, 0.18, 0.22]} />
    </mesh>
  )
}

/** Thin barbed-wire coil at a corner of the zone boundary. */
function WireCoil({ position }: { position: [number, number, number] }) {
  return (
    <mesh material={matWire} position={position}>
      <torusGeometry args={[0.22, 0.025, 6, 12]} />
    </mesh>
  )
}

// ── Main component ────────────────────────────────────────

export function BaseTrainingZone({ slots }: BaseTrainingZoneProps) {
  return (
    <group name="base-training-zone" position={[5, 0, 0]}>

      {/* ── Sandy ground patch (always present) ── */}
      <mesh
        material={matSand}
        receiveShadow
        position={[0, -0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[11, 9]} />
      </mesh>

      {/* ── Target stands — right end of the zone ── */}
      <TargetStand position={[TARGET_STAND_ZONE_X, 0,  2.2]} />
      <TargetStand position={[TARGET_STAND_ZONE_X, 0,  0.0]} />
      <TargetStand position={[TARGET_STAND_ZONE_X, 0, -2.2]} />

      {/* ── Sandbag firing line — left end, one per lane ── */}
      {/* Center lane */}
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09,  0.4]} />
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09, -0.4]} />
      {/* Left lane */}
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09,  2.6]} />
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09,  1.8]} />
      {/* Right lane */}
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09, -1.8]} />
      <Sandbag position={[TRAINEE_ZONE_X - 0.5, 0.09, -2.6]} />

      {/* ── Barbed wire corner decorations ── */}
      <WireCoil position={[-5.0, 0.22, -4.2]} />
      <WireCoil position={[-5.0, 0.22,  4.2]} />
      <WireCoil position={[ 5.0, 0.22, -4.2]} />
      <WireCoil position={[ 5.0, 0.22,  4.2]} />

      {/* ── Active training slots ── */}
      {slots.map((slot, idx) => {
        const laneZ = LANE_Z_OFFSETS[idx] ?? 0
        const isActive = slot.phase === 'running' || slot.phase === 'observing' || slot.phase === 'graduated'
        if (!isActive) return null
        return (
          <group
            key={slot.slotId}
            position={[TRAINEE_ZONE_X, 0, laneZ]}
            name={`training-lane-${slot.slotId}`}
          >
            <TraineeSoldier slotId={slot.slotId} weapon={slot.weapon} />
            <TargetCan slotId={slot.slotId} />
          </group>
        )
      })}

    </group>
  )
}
