/**
 * BattleEntities — renders all battle units, projectiles, explosions,
 * enemy defenses, Intel objective, and force field during fighting.
 *
 * Sprint 5 (battle rework). Enemy defenses sourced from battleConfig,
 * Intel briefcase rendered at objective position, force field shows
 * while enemies are alive.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { ProjectileMesh } from '@three/models/ProjectileMesh'
import { Intel } from '@three/models/Intel'
import type { WallBlock } from '@three/models/Defenses'
import { DEFENSE_COMPONENTS } from '@config/defenseRendering'
import { TABLE_BOUNDS } from './campConstants'
import { INTEL_CAPTURE_RADIUS } from '@engine/physics/battlePhysics'
import React from 'react'

interface BattleEntitiesProps {
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
}

export function BattleEntities({ wallBlocksRef }: BattleEntitiesProps) {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const playerUnits = useCampBattleStore((s) => s.playerUnits)
  const enemyUnits = useCampBattleStore((s) => s.enemyUnits)
  const projectiles = useCampBattleStore((s) => s.projectiles)
  const explosions = useCampBattleStore((s) => s.explosions)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)

  if (battlePhase !== 'fighting' && battlePhase !== 'result') return null

  const enemyDefenses = battleConfig?.enemyDefenses ?? []
  const intelPos = battleConfig?.intelPosition
  const livingEnemies = enemyUnits.filter(e => e.status !== 'dead').length

  return (
    <>
      {/* Player soldiers (green team) */}
      {playerUnits.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}

      {/* Enemy soldiers (tan team) */}
      {enemyUnits.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}

      {/* Projectiles */}
      {projectiles.map((p) => (
        <ProjectileMesh key={p.id} projectile={p} />
      ))}

      {/* Explosions */}
      {explosions.map((exp) => (
        <ExplosionBall key={exp.id} position={exp.position} scale={exp.scale} />
      ))}

      {/* Intel briefcase — the objective */}
      {intelPos && <Intel position={intelPos} />}

      {/* Force field around Intel — visible while enemies alive */}
      {intelPos && livingEnemies > 0 && (
        <mesh position={[intelPos[0], 0.8, intelPos[2]]}>
          <sphereGeometry args={[INTEL_CAPTURE_RADIUS, 16, 16]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.12} wireframe />
        </mesh>
      )}

      {/* Enemy defenses — destructible walls/sandbags/towers from config */}
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
    </>
  )
}

/** Simple explosion visual — bright expanding sphere that fades */
function ExplosionBall({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[scale * 0.5, 8, 6]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
    </mesh>
  )
}
