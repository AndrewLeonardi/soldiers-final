/**
 * PlacementMarkers — placed soldier previews + hover ring during placement.
 *
 * Sprint 4, Phase 2. Renders actual SoldierUnit models at placed positions
 * with floating name tags. Shows a green pulse ring at pointer position
 * when a soldier is selected for placement (the "cursor").
 */
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { Html } from '@react-three/drei'
import type { WeaponType } from '@config/types'

export function PlacementMarkers() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const placedSoldiers = useCampBattleStore((s) => s.placedSoldiers)
  const selectedPlacementId = useCampBattleStore((s) => s.selectedPlacementId)

  if (battlePhase !== 'placing') return null

  return (
    <>
      {/* Placed soldiers — real SoldierUnit models */}
      {placedSoldiers.map((sol) => {
        const groundPos: [number, number, number] = [sol.position[0], 0, sol.position[2]]
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
            {/* Name tag */}
            <Html
              position={[groundPos[0], 1.8, groundPos[2]]}
              center
              style={{
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {sol.name}
            </Html>
          </group>
        )
      })}

      {/* Selection ring — pulses when a soldier is selected for placement */}
      {selectedPlacementId && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.5, 24]} />
          <meshBasicMaterial color="#4caf50" transparent opacity={0.5} />
        </mesh>
      )}
    </>
  )
}
