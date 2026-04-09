/**
 * BaseCameraRig — orbit camera for viewing the player's base.
 *
 * Deliberately simpler than `src/three/camera/CameraRig.tsx` because it has
 * no battle-state coupling — no auto-rotate on victory, no result-phase
 * behavior, no game store reads. Just an OrbitControls configured for
 * base-viewing angles on a ~16×12 kitchen table.
 *
 * Panning is disabled to keep the player anchored on their base; the
 * player should always see what they're defending.
 *
 * When `brushActive` is true, rotation and zoom are disabled so the
 * player's drag-to-place input isn't competing with camera orbit. The
 * player can still look around freely in view mode or in build mode
 * without a brush selected.
 */
import { OrbitControls } from '@react-three/drei'

interface BaseCameraRigProps {
  brushActive: boolean
}

export function BaseCameraRig({ brushActive }: BaseCameraRigProps) {
  return (
    <OrbitControls
      makeDefault
      target={[0, 0.5, 0]}
      enablePan={false}
      enableRotate={!brushActive}
      enableZoom={!brushActive}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={28}
      minPolarAngle={Math.PI / 6}     // ~30° — can't look straight down
      maxPolarAngle={Math.PI / 2.3}   // ~78° — can't dip below the table plane
    />
  )
}
