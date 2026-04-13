/**
 * BattleEntities — renders all battle units, projectiles, explosions,
 * AND player-placed defenses during fighting.
 *
 * Sprint 4, Phase 3b (v2 — defense placement).
 * Driven by campBattleStore arrays.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { ProjectileMesh } from '@three/models/ProjectileMesh'
import type { WallBlock } from '@three/models/Defenses'
import { DEFENSE_COMPONENTS } from '@config/defenseRendering'
import { TABLE_BOUNDS } from './campConstants'
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
  const placedDefenses = useCampBattleStore((s) => s.placedDefenses)

  if (battlePhase !== 'fighting' && battlePhase !== 'result') return null

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

      {/* Explosions — simple expanding sphere */}
      {explosions.map((exp) => (
        <ExplosionBall key={exp.id} position={exp.position} scale={exp.scale} />
      ))}

      {/* Player-placed defenses — destructible walls/sandbags/towers */}
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
