import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGameStore } from '@stores/gameStore'

interface CameraRigProps {
  orbitingRef: React.MutableRefObject<boolean>
}

export function CameraRig({ orbitingRef }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const phase = useGameStore((s) => s.phase)
  const { gl } = useThree()

  // Track pointer movement distance to distinguish click from orbit
  useEffect(() => {
    const canvas = gl.domElement
    let startX = 0
    let startY = 0

    const onDown = (e: PointerEvent) => {
      startX = e.clientX
      startY = e.clientY
      orbitingRef.current = false
    }

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 6) {
        orbitingRef.current = true
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
    }
  }, [gl, orbitingRef])

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
    />
  )
}
