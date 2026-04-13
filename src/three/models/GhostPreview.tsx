import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFENSE_GHOST } from '@config/defenseRendering'
import type { DefenseType } from '@config/defenses'

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2(9999, 9999)
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const intersectPoint = new THREE.Vector3()

// Track mouse position globally
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  })
}

const SOLDIER_GHOST = {
  geo: new THREE.CylinderGeometry(0.2, 0.25, 0.7, 12),
  yOffset: 0.35,
}

const ghostMatValid = new THREE.MeshBasicMaterial({
  color: 0x4CAF50,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
})

const ghostMatInvalid = new THREE.MeshBasicMaterial({
  color: 0xFF4444,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
})

interface GhostPreviewProps {
  selectedType: string | null // 'soldier' or defense type
  placementRotation: number
}

export function GhostPreview({ selectedType, placementRotation }: GhostPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current) return
    if (!selectedType) {
      meshRef.current.visible = false
      return
    }

    // Raycast mouse -> ground plane
    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(groundPlane, intersectPoint)

    if (!intersectPoint) {
      meshRef.current.visible = false
      return
    }

    // Snap to 0.5 grid
    const snappedX = Math.round(intersectPoint.x * 2) / 2
    const snappedZ = Math.round(intersectPoint.z * 2) / 2
    const valid = snappedX <= 2

    // Determine ghost type (soldier from roster or defense type)
    const isSoldier = selectedType.startsWith('soldier')
    const config = isSoldier
      ? SOLDIER_GHOST
      : DEFENSE_GHOST[selectedType as DefenseType]
    if (!config) {
      meshRef.current.visible = false
      return
    }

    meshRef.current.visible = true
    meshRef.current.geometry = config.geo
    meshRef.current.material = valid ? ghostMatValid : ghostMatInvalid
    meshRef.current.position.set(snappedX, config.yOffset, snappedZ)
    meshRef.current.rotation.y = placementRotation
  })

  return <mesh ref={meshRef} />
}
