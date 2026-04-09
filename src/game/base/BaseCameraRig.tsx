/**
 * BaseCameraRig — orbit camera for viewing the player's base, with an
 * optional observation mode that lerps the camera to a close cinematic
 * shot of a specific building.
 *
 * Deliberately simpler than `src/three/camera/CameraRig.tsx` because it has
 * no battle-state coupling — no auto-rotate on victory, no result-phase
 * behavior, no game store reads. Just an OrbitControls configured for
 * base-viewing angles on a ~16×12 kitchen table, plus a smooth lerp to
 * the training observation view when `observingTarget` is non-null.
 *
 * Panning is disabled to keep the player anchored on their base; the
 * player should always see what they're defending.
 *
 * When `brushActive` is true, rotation and zoom are disabled so the
 * player's drag-to-place input isn't competing with camera orbit. The
 * player can still look around freely in view mode or in build mode
 * without a brush selected.
 *
 * When `observingTarget` is non-null, the camera smoothly lerps its
 * `target` vector, min/max zoom distances, and current distance toward
 * the observation settings over ~700ms. Rotation stays enabled (the
 * player can circle the training arena) but zoom is clamped to the
 * close observation range. When `observingTarget` transitions back to
 * null, the camera lerps back to the default base view parameters.
 *
 * The lerp happens in a `useFrame` reading from a ref so we never
 * rebuild the OrbitControls instance when the target changes — that
 * would snap the camera and kill the cinematic feel. Instead we write
 * directly to `controls.current.target` and to the `min/maxDistance`
 * on each frame until the values converge.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

/** Camera parameters for an observation shot on a specific building. */
export interface ObservingTarget {
  /** World-space point the camera should orbit around. */
  position: [number, number, number]
  /** Minimum allowed zoom distance while observing. */
  minDistance: number
  /** Maximum allowed zoom distance while observing. */
  maxDistance: number
}

interface BaseCameraRigProps {
  brushActive: boolean
  observingTarget?: ObservingTarget | null
}

// Default parameters — the "looking at the whole base" view.
const DEFAULT_TARGET: readonly [number, number, number] = [0, 0.5, 0]
const DEFAULT_MIN_DISTANCE = 8
const DEFAULT_MAX_DISTANCE = 28

// Lerp speed factor — approximately 1 - exp(-k * dt) per frame, where
// higher k = faster convergence. Tuned so the camera completes ~95% of
// the transition in ~0.7s at 60fps.
const LERP_SPEED = 4.5

export function BaseCameraRig({ brushActive, observingTarget = null }: BaseCameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  // Scratch vectors reused across frames (no per-frame allocations).
  const scratchTarget = useRef(new THREE.Vector3())
  const desiredCamPos = useRef(new THREE.Vector3())

  // When observation starts, seed the camera with a short initial
  // approach vector so the lerp has a clean starting point. We do this
  // once on transition (via useEffect) rather than every frame.
  useEffect(() => {
    if (!observingTarget || !controlsRef.current) return
    // Preserve the current camera direction but clamp to the new
    // min/max distance range. This avoids a "snap-in" when the player
    // was already zoomed in, while still forcing a zoom from the
    // default wide view.
    const ctrl = controlsRef.current
    const dir = new THREE.Vector3().subVectors(camera.position, ctrl.target).normalize()
    const midDistance = (observingTarget.minDistance + observingTarget.maxDistance) / 2
    desiredCamPos.current.copy(
      scratchTarget.current
        .set(...observingTarget.position)
        .clone()
        .add(dir.multiplyScalar(midDistance)),
    )
  }, [observingTarget, camera])

  useFrame((_, dt) => {
    const ctrl = controlsRef.current
    if (!ctrl) return

    const alpha = Math.min(1, 1 - Math.exp(-LERP_SPEED * dt))

    // Target position: observingTarget.position or the default base
    // center. Lerp in place on the controls' target vector.
    const targetGoal = observingTarget
      ? scratchTarget.current.set(...observingTarget.position)
      : scratchTarget.current.set(...DEFAULT_TARGET)
    ctrl.target.lerp(targetGoal, alpha)

    // Distance clamps. When observing, also lerp the camera's position
    // toward the observation mid-distance so the player visibly zooms
    // in rather than stays at the wide shot.
    const goalMin = observingTarget ? observingTarget.minDistance : DEFAULT_MIN_DISTANCE
    const goalMax = observingTarget ? observingTarget.maxDistance : DEFAULT_MAX_DISTANCE
    ctrl.minDistance = THREE.MathUtils.lerp(ctrl.minDistance, goalMin, alpha)
    ctrl.maxDistance = THREE.MathUtils.lerp(ctrl.maxDistance, goalMax, alpha)

    if (observingTarget) {
      const midDistance = (observingTarget.minDistance + observingTarget.maxDistance) / 2
      const dir = desiredCamPos.current
        .subVectors(camera.position, ctrl.target)
        .normalize()
      const currentDistance = camera.position.distanceTo(ctrl.target)
      const nextDistance = THREE.MathUtils.lerp(currentDistance, midDistance, alpha)
      camera.position.copy(ctrl.target).add(dir.multiplyScalar(nextDistance))
    }

    ctrl.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[DEFAULT_TARGET[0], DEFAULT_TARGET[1], DEFAULT_TARGET[2]]}
      enablePan={false}
      enableRotate={!brushActive}
      enableZoom={!brushActive}
      enableDamping
      dampingFactor={0.08}
      minDistance={DEFAULT_MIN_DISTANCE}
      maxDistance={DEFAULT_MAX_DISTANCE}
      minPolarAngle={Math.PI / 6}     // ~30° — can't look straight down
      maxPolarAngle={Math.PI / 2.3}   // ~78° — can't dip below the table plane
    />
  )
}
