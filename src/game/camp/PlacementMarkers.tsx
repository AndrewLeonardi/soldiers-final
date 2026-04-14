/**
 * PlacementMarkers — placement-phase 3D preview.
 *
 * Sprint 5 (battle rework). Renders during placement:
 *   - Player placed soldiers with name + verb tags
 *   - Enemy soldier preview (semi-transparent tan units)
 *   - Enemy defense preview (walls/sandbags/towers)
 *   - Intel briefcase at objective position
 *   - Spawn zone indicator (green translucent rectangle)
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { Intel } from '@three/models/Intel'
import type { WallBlock } from '@three/models/Defenses'
import { DEFENSE_COMPONENTS } from '@config/defenseRendering'
import { TABLE_BOUNDS } from './campConstants'
import { Html } from '@react-three/drei'
import type { WeaponType } from '@config/types'
import React from 'react'

const VERB_COLORS: Record<string, string> = {
  charge: '#e74c3c',
  advance: '#4caf50',
  flank: '#2196f3',
  hold: '#ffc107',
}

interface PlacementMarkersProps {
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
}

export function PlacementMarkers({ wallBlocksRef }: PlacementMarkersProps) {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const placedSoldiers = useCampBattleStore((s) => s.placedSoldiers)
  const placedDefenses = useCampBattleStore((s) => s.placedDefenses)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)

  if (battlePhase !== 'placing' || !battleConfig) return null

  const spawnZone = battleConfig.playerSpawnZone
  const enemySoldiers = battleConfig.enemySoldiers ?? []
  const enemyDefenses = battleConfig.enemyDefenses ?? []
  const intelPos = battleConfig.intelPosition

  return (
    <>
      {/* ── Spawn zone indicator ── */}
      {spawnZone && (
        <mesh
          position={[
            (spawnZone.minX + spawnZone.maxX) / 2,
            0.02,
            (spawnZone.minZ + spawnZone.maxZ) / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[
            spawnZone.maxX - spawnZone.minX,
            spawnZone.maxZ - spawnZone.minZ,
          ]} />
          <meshBasicMaterial color="#4caf50" transparent opacity={0.08} />
        </mesh>
      )}

      {/* ── Intel briefcase ── */}
      {intelPos && <Intel position={intelPos} />}

      {/* ── Enemy soldiers (preview — semi-transparent) ── */}
      {enemySoldiers.map((es, i) => (
        <group key={`enemy-preview-${i}`}>
          <SoldierUnit
            unit={{
              id: `enemy-preview-${i}`,
              team: 'tan',
              position: es.position,
              rotation: es.facingAngle ?? Math.PI,
              status: 'idle',
              weapon: es.weapon,
            }}
          />
          {/* Subtle label */}
          <Html
            position={[es.position[0], 1.8, es.position[2]]}
            center
            zIndexRange={[5, 0]}
            style={{
              color: '#ff6b6b',
              fontSize: '9px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              opacity: 0.7,
            }}
          >
            {es.weapon.toUpperCase()}
          </Html>
        </group>
      ))}

      {/* ── Enemy defenses (preview) ── */}
      {enemyDefenses.map((def, i) => {
        const DefComp = DEFENSE_COMPONENTS[def.type]
        if (!DefComp) return null
        return (
          <DefComp
            key={`enemy-def-${i}`}
            position={def.position}
            rotation={def.rotation}
            wallBlocksRef={wallBlocksRef}
            wallId={`enemy-def-${i}`}
            tableBounds={TABLE_BOUNDS}
          />
        )
      })}

      {/* ── Player placed defenses ── */}
      {placedDefenses.map((def) => {
        const DefComp = DEFENSE_COMPONENTS[def.type]
        if (!DefComp) return null
        return (
          <DefComp
            key={def.id}
            position={def.position}
            rotation={def.rotation}
            wallBlocksRef={wallBlocksRef}
            wallId={def.id}
            tableBounds={TABLE_BOUNDS}
          />
        )
      })}

      {/* ── Player placed soldiers ── */}
      {placedSoldiers.map((sol) => {
        const groundPos: [number, number, number] = [sol.position[0], 0, sol.position[2]]
        const verbColor = VERB_COLORS[sol.actionVerb] ?? '#4caf50'
        return (
          <group key={sol.soldierId}>
            <SoldierUnit
              unit={{
                id: sol.soldierId,
                team: 'green',
                position: groundPos,
                rotation: 0,
                status: 'idle',
                weapon: sol.weapon as WeaponType,
              }}
            />
            {/* Name + verb tag */}
            <Html
              position={[groundPos[0], 1.8, groundPos[2]]}
              center
              zIndexRange={[5, 0]}
              style={{
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                textAlign: 'center',
              }}
            >
              <div>{sol.name}</div>
              <div style={{ color: verbColor, fontSize: '8px', marginTop: '2px' }}>
                {sol.actionVerb.toUpperCase()}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}
