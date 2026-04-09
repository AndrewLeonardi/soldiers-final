/**
 * GhostPlacement — translucent preview of the brush at the pointer.
 *
 * Mirrors the pattern from `src/three/models/GhostPreview.tsx`:
 *   - Module-level raycaster, mouse vec, ground plane, intersect vec
 *   - Module-level window listener to update the mouse normalized coords
 *   - Module-level pre-built valid/invalid materials
 *   - A single useFrame that raycasts, snaps, validates, and moves a mesh
 *
 * For Phase 2a the ghost is a colored box sized to each brush's footprint
 * — enough to show "where it lands + whether it fits" without the cost of
 * instantiating a full DestructibleDefense for every pointer move.
 */
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BUILDING_FOOTPRINTS } from '@three/models/Defenses'
import { useBaseStore, type Brush } from '@game/stores/baseStore'
import { isValidPlacement, snapToGrid } from './footprints'

// ── Module-level pointer tracking ──
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2(9999, 9999)
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const intersectPoint = new THREE.Vector3()

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  })
}

// ── Shared materials ──
const matValid = new THREE.MeshBasicMaterial({
  color: 0x4ade80, // matches global --green
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
})
const matInvalid = new THREE.MeshBasicMaterial({
  color: 0xef4444, // matches global --red
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
})

// ── Geometry cache (one box per brush, reused across frames) ──
const geoCache = new Map<string, THREE.BoxGeometry>()
function getBrushGeometry(brush: Brush): THREE.BoxGeometry | null {
  if (brush === null) return null
  let key: string
  let halfW: number
  let halfD: number
  let halfH: number
  if (brush.kind === 'building') {
    key = `b-${brush.buildingKind}`
    const fp = BUILDING_FOOTPRINTS[brush.buildingKind]
    halfW = fp.halfW
    halfD = fp.halfD
    // Heights are approximate, just enough to show "there's something there"
    halfH = brush.buildingKind === 'trainingGrounds' ? 0.6 : brush.buildingKind === 'vault' ? 0.45 : 0.35
  } else {
    key = 'b-wall'
    const fp = BUILDING_FOOTPRINTS.wall
    halfW = fp.halfW
    halfD = fp.halfD
    halfH = 0.525
  }
  let g = geoCache.get(key)
  if (!g) {
    g = new THREE.BoxGeometry(halfW * 2, halfH * 2, halfD * 2)
    geoCache.set(key, g)
  }
  return g
}

function brushBoxCenterY(brush: Brush): number {
  if (brush === null) return 0
  if (brush.kind === 'building') {
    if (brush.buildingKind === 'trainingGrounds') return 0.6
    if (brush.buildingKind === 'vault') return 0.45
    return 0.35
  }
  return 0.525
}

interface GhostPlacementProps {
  tableBounds: { halfWidth: number; halfDepth: number }
}

export function GhostPlacement({ tableBounds }: GhostPlacementProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current) return

    const brush = useBaseStore.getState().brush
    if (brush === null) {
      meshRef.current.visible = false
      return
    }

    // Raycast mouse → ground plane
    raycaster.setFromCamera(mouse, camera)
    const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint)
    if (!hit) {
      meshRef.current.visible = false
      return
    }

    const snapped = snapToGrid([intersectPoint.x, 0, intersectPoint.z])
    const layout = useBaseStore.getState().layout
    const valid = isValidPlacement(brush, snapped, brush.rotation, layout, tableBounds)

    const geo = getBrushGeometry(brush)
    if (!geo) {
      meshRef.current.visible = false
      return
    }

    meshRef.current.visible = true
    meshRef.current.geometry = geo
    meshRef.current.material = valid ? matValid : matInvalid
    meshRef.current.position.set(snapped[0], brushBoxCenterY(brush), snapped[2])
    meshRef.current.rotation.y = brush.rotation
  })

  return <mesh ref={meshRef} />
}
