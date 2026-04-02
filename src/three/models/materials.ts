import * as THREE from 'three'

export const TOY = {
  armyGreen:   0x3d6b4f,
  darkGreen:   0x2d5a3f,
  oliveGreen:  0x4a5a3a,
  khaki:       0x8b7d5c,
  sandBrown:   0xc2b280,
  sandDark:    0xb8a870,
  woodBrown:   0x6b4226,
  metalDark:   0x3a3a3a,
  canvasGreen: 0x5a6b4f,
  ropeBeige:   0xa89870,
  flagRed:     0x8b2020,
  starYellow:  0xd4aa40,
  black:       0x1a1a1a,
} as const

const _cache = new Map<number, THREE.MeshStandardMaterial>()

export function getPlasticMat(color: number): THREE.MeshStandardMaterial {
  const existing = _cache.get(color)
  if (existing) return existing
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0 })
  _cache.set(color, mat)
  return mat
}

export function plasticMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0 })
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.geometry.dispose()
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else {
          mesh.material.dispose()
        }
      }
    }
  })
}
