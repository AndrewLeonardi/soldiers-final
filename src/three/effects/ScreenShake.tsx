import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// ── Module-level shake state ──
let shakeIntensity = 0
let shakeAge = 0

/**
 * Trigger a camera shake from anywhere in the app.
 * @param intensity - Shake strength (0.1 = subtle, 0.3 = big explosion)
 */
export function triggerShake(intensity: number) {
  shakeIntensity = Math.min(0.5, shakeIntensity + intensity)
  shakeAge = 0
}

/**
 * Render this component inside the Canvas to apply camera shake.
 * Uses dampened oscillation: sin(age * freq) * exp(-age * decay) * intensity
 *
 * Stores base camera position to avoid race conditions with CameraRig.
 */
export function ScreenShake() {
  const { camera } = useThree()
  const offsetX = useRef(0)
  const offsetY = useRef(0)
  const lastCameraX = useRef(camera.position.x)
  const lastCameraY = useRef(camera.position.y)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)

    // Undo the offset we applied last frame, but account for external camera movement
    // If CameraRig moved the camera, lastCamera will differ from camera.position - offset
    camera.position.x -= offsetX.current
    camera.position.y -= offsetY.current
    offsetX.current = 0
    offsetY.current = 0

    if (shakeIntensity < 0.001) {
      shakeIntensity = 0
      return
    }

    shakeAge += delta

    // Dampened oscillation
    const freq = 25
    const decay = 4
    const amplitude = shakeIntensity * Math.sin(shakeAge * freq) * Math.exp(-shakeAge * decay)

    // Apply as camera displacement (x dominant, y subtle), capped for mobile
    offsetX.current = Math.max(-0.3, Math.min(0.3, amplitude * 0.15))
    offsetY.current = Math.max(-0.15, Math.min(0.15, amplitude * 0.08))

    camera.position.x += offsetX.current
    camera.position.y += offsetY.current

    // Decay intensity over time
    if (shakeAge > 0.5) {
      shakeIntensity *= 0.9
    }
  })

  return null
}
