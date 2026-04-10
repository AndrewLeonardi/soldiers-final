/**
 * BattleEntities — renders all battle units, projectiles, and explosions.
 *
 * Sprint 4, Phase 3b. Driven by campBattleStore arrays.
 * Renders SoldierUnit for players (green) and enemies (tan),
 * ProjectileMesh for bullets/rockets/grenades, and simple
 * explosion effects.
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { ProjectileMesh } from '@three/models/ProjectileMesh'

export function BattleEntities() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const playerUnits = useCampBattleStore((s) => s.playerUnits)
  const enemyUnits = useCampBattleStore((s) => s.enemyUnits)
  const projectiles = useCampBattleStore((s) => s.projectiles)
  const explosions = useCampBattleStore((s) => s.explosions)

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
