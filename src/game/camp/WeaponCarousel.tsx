/**
 * WeaponCarousel — horizontal weapon selector with 3D weapon models.
 *
 * Weapons are unlocked by winning battles (weaponReward in campBattles).
 * Only unlocked weapons appear — no buy-to-unlock flow.
 */
import { useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCampStore } from '@stores/campStore'
import { WEAPON_DISPLAY } from '@config/roster'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

/** Small spinning weapon model for carousel cards */
function CarouselWeaponModel({ weapon }: { weapon: WeaponType }) {
  const model = useMemo(() => createDisplayWeapon(weapon), [weapon])
  const ref = useRef<THREE.Group>(null!)

  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 1.2
  })

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  )
}

interface WeaponCarouselProps {
  selected: WeaponType
  onSelect: (weapon: WeaponType) => void
}

export function WeaponCarousel({ selected, onSelect }: WeaponCarouselProps) {
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons) as WeaponType[]

  const handleTap = useCallback((weapon: WeaponType) => {
    sfx.buttonTap()
    onSelect(weapon)
  }, [onSelect])

  return (
    <div className="weapon-carousel">
      {unlockedWeapons.map((weapon) => {
        const isSelected = selected === weapon
        const display = WEAPON_DISPLAY[weapon]

        return (
          <button
            key={weapon}
            className={`weapon-card ${isSelected ? 'selected' : ''}`}
            onClick={() => handleTap(weapon)}
          >
            <div className="weapon-card-canvas">
              <Canvas
                camera={{ position: [0, 0.05, 1.0], fov: 40 }}
                gl={{ alpha: true, antialias: true }}
                style={{ width: '100%', height: '100%' }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[2, 3, 4]} intensity={0.8} />
                <CarouselWeaponModel weapon={weapon} />
              </Canvas>
            </div>
            <span className="weapon-card-name">{display.name}</span>
          </button>
        )
      })}
    </div>
  )
}
