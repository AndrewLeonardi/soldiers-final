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
  const result = useGameStore((s) => s.result)
  const { camera, gl } = useThree()
  const sweepAge = useRef(0)
  const prevPhase = useRef(phase)

  // Set initial camera for battlefield view
  useEffect(() => {
    camera.position.set(0, 14, 16)
    camera.lookAt(0, 0, 0)
  }, [camera])

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

  // Auto-rotate + victory sweep during result phase
  useFrame((_, rawDelta) => {
    if (!controlsRef.current) return
    const delta = Math.min(rawDelta, 0.05)

    // Reset sweep timer on phase transition
    if (phase !== prevPhase.current) {
      sweepAge.current = 0
      prevPhase.current = phase
    }

    if (phase === 'result') {
      controlsRef.current.autoRotate = true
      sweepAge.current += delta

      if (result === 'victory') {
        // Victory sweep: fast orbit + subtle zoom
        const t = sweepAge.current
        const rampUp = Math.min(1, t / 1.5) // 0→1 over 1.5s
        const easeDown = t > 3 ? Math.max(0, 1 - (t - 3) / 2) : 1 // ease down after 3s
        controlsRef.current.autoRotateSpeed = 0.5 + 2.0 * rampUp * easeDown

        // Subtle zoom: pull minDistance closer during sweep
        controlsRef.current.minDistance = 8 - 2 * rampUp * easeDown
      } else {
        // Defeat: gentle orbit
        controlsRef.current.autoRotateSpeed = 0.5
        controlsRef.current.minDistance = 8
      }
    } else {
      controlsRef.current.autoRotate = false
      controlsRef.current.autoRotateSpeed = 0.5
      controlsRef.current.minDistance = 8
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={28}
      maxPolarAngle={Math.PI / 2.3}
      minPolarAngle={Math.PI / 6}
      autoRotateSpeed={0.5}
      target={[0, 0, 0]}
    />
  )
}
