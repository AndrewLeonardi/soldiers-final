import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGameStore } from '@stores/gameStore'

interface CameraRigProps {
  /** Ref that is set to true while the user is orbiting the camera */
  orbitingRef: React.MutableRefObject<boolean>
}

export function CameraRig({ orbitingRef }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const phase = useGameStore((s) => s.phase)

  const handleStart = useCallback(() => {
    orbitingRef.current = true
  }, [orbitingRef])

  const handleEnd = useCallback(() => {
    // Small delay so the pointerup event can check the flag
    setTimeout(() => {
      orbitingRef.current = false
    }, 50)
  }, [orbitingRef])

  // Auto-rotate during result phase
  useFrame(() => {
    if (!controlsRef.current) return
    controlsRef.current.autoRotate = phase === 'result'
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={20}
      maxPolarAngle={Math.PI * 0.45}
      minPolarAngle={Math.PI * 0.1}
      autoRotateSpeed={0.5}
      target={[0, 0, 0]}
      onStart={handleStart}
      onEnd={handleEnd}
    />
  )
}
