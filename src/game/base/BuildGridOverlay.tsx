/**
 * BuildGridOverlay — subtle 0.5-unit grid drawn on the table in BUILD mode.
 *
 * Visual aid only. Helps the player see the snap grid so their placements
 * land where expected. Constructed as a single `LineSegments` mesh so the
 * whole grid is one draw call.
 */
import { useMemo } from 'react'
import * as THREE from 'three'

interface BuildGridOverlayProps {
  tableBounds: { halfWidth: number; halfDepth: number }
}

export function BuildGridOverlay({ tableBounds }: BuildGridOverlayProps) {
  const { geometry, material } = useMemo(() => {
    const hw = tableBounds.halfWidth
    const hd = tableBounds.halfDepth
    const step = 0.5
    const points: number[] = []
    // Lines parallel to Z
    for (let x = -hw; x <= hw + 1e-6; x += step) {
      points.push(x, 0, -hd, x, 0, hd)
    }
    // Lines parallel to X
    for (let z = -hd; z <= hd + 1e-6; z += step) {
      points.push(-hw, 0, z, hw, 0, z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    const mat = new THREE.LineBasicMaterial({
      color: 0xf5f0e0, // --text-white, matches the toy aesthetic
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    })
    return { geometry: geo, material: mat }
  }, [tableBounds.halfWidth, tableBounds.halfDepth])

  return <lineSegments geometry={geometry} material={material} position={[0, 0.02, 0]} />
}
