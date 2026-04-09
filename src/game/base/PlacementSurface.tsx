/**
 * PlacementSurface — an invisible plane that captures commit taps.
 *
 * Rendered only in BUILD mode with an active brush. On pointerUp it uses
 * R3F's event.point (world-space intersection, no manual raycasting) to
 * call the store's `placeBuilding` or `placeWall` action. The store runs
 * the same validation the ghost uses, so whatever looked valid-green
 * commits successfully; whatever looked invalid-red does nothing.
 *
 * The brush stays selected after a successful commit so the player can
 * drop several walls in a row without re-selecting the brush.
 */
import { useBaseStore } from '@game/stores/baseStore'

interface PlacementSurfaceProps {
  tableBounds: { halfWidth: number; halfDepth: number }
}

export function PlacementSurface({ tableBounds }: PlacementSurfaceProps) {
  const handlePointerUp = (e: { point: { x: number; y: number; z: number }; stopPropagation: () => void }) => {
    e.stopPropagation()
    const state = useBaseStore.getState()
    const brush = state.brush
    if (brush === null) return

    const pos: [number, number, number] = [e.point.x, 0, e.point.z]
    if (brush.kind === 'building') {
      state.placeBuilding(brush.buildingKind, pos, brush.rotation, tableBounds)
    } else {
      state.placeWall(pos, brush.rotation, tableBounds)
    }
  }

  // Sized generously — a little bigger than the 16×12 table so taps near
  // the edge still register. The mesh is completely transparent but
  // captures pointer events because R3F sees the geometry.
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.01, 0]}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={[tableBounds.halfWidth * 2 + 2, tableBounds.halfDepth * 2 + 2]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
