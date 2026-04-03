import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFlexSoldier, poseIdle } from './flexSoldier'
import { applyWeaponToSoldier, createDisplayWeapon } from './weaponMeshes'
import type { WeaponType } from '@config/types'
import { TOY } from './materials'

const ALL_WEAPONS: WeaponType[] = ['rifle', 'rocketLauncher', 'grenade', 'machineGun']

// ── Single display weapon ──────────────────────────────

function DisplayWeapon({ weapon, positionX, isEquipped, isUnlocked }: {
  weapon: WeaponType
  positionX: number
  isEquipped: boolean
  isUnlocked: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (meshRef.current) ref.current.remove(meshRef.current)
    const wpn = createDisplayWeapon(weapon)
    ref.current.add(wpn)
    meshRef.current = wpn
    return () => {
      if (meshRef.current && ref.current) ref.current.remove(meshRef.current)
    }
  }, [weapon])

  return (
    <group position={[positionX, 0, 0]}>
      <group ref={ref} />
      {/* Green glow for equipped */}
      {isEquipped && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <ringGeometry args={[0.12, 0.17, 20]} />
          <meshBasicMaterial color={0x4ADE80} transparent opacity={0.35} />
        </mesh>
      )}
      {/* Dark sphere for locked */}
      {!isUnlocked && (
        <mesh>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color={0x000000} transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}

// ── Main Preview ───────────────────────────────────────────

interface SoldierPreviewProps {
  weapon: WeaponType
  showWeapons?: boolean
  equippedWeapon?: WeaponType
  unlockedWeapons?: WeaponType[]
}

export function SoldierPreview({ weapon, showWeapons, equippedWeapon, unlockedWeapons }: SoldierPreviewProps) {
  const groupRef = useRef<THREE.Group>(null)
  const rotationRef = useRef(0)
  const dragRef = useRef({ active: false, lastX: 0 })
  const weaponGrpRef = useRef<THREE.Group | null>(null)

  const soldier = useMemo(() => createFlexSoldier(TOY.armyGreen), [])

  useEffect(() => {
    if (groupRef.current && soldier) {
      groupRef.current.add(soldier.group)
      return () => { groupRef.current?.remove(soldier.group) }
    }
  }, [soldier])

  useEffect(() => {
    if (!soldier) return
    weaponGrpRef.current = applyWeaponToSoldier(soldier.parts, weapon, weaponGrpRef.current)
  }, [weapon, soldier])

  useFrame((state) => {
    if (!soldier || !groupRef.current) return
    poseIdle(soldier.parts, state.clock.getElapsedTime())
    if (!dragRef.current.active) rotationRef.current += 0.003
    groupRef.current.rotation.y = rotationRef.current
  })

  const { gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return
      rotationRef.current += (e.clientX - dragRef.current.lastX) * 0.01
      dragRef.current.lastX = e.clientX
    }
    const onUp = () => { dragRef.current.active = false }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    }
  }, [gl])

  const weaponSpacing = 0.5
  const weaponStartX = -((ALL_WEAPONS.length - 1) * weaponSpacing) / 2

  return (
    <>
      <ambientLight intensity={0.8} color="#f5e6c8" />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff8e7" castShadow />
      <directionalLight position={[-2, 3, 2]} intensity={0.5} color="#ddeeff" />
      <pointLight position={[0, 2, 3]} intensity={0.4} color="#ffe8c0" />

      {/* Shadow under soldier */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, showWeapons ? -0.1 : -0.42, 0]} receiveShadow>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color={TOY.sandBrown} roughness={0.8} transparent opacity={0.3} />
      </mesh>

      {/* Soldier -- positioned higher when weapons showing */}
      <group
        ref={groupRef}
        position={[0, showWeapons ? -0.1 : -0.42, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          dragRef.current.active = true
          dragRef.current.lastX = (e as unknown as { clientX: number }).clientX ?? 0
        }}
        onPointerUp={() => { dragRef.current.active = false }}
      />

      {/* Weapon display row below soldier */}
      {showWeapons && (
        <group position={[0, -0.85, 0.4]}>
          {ALL_WEAPONS.map((w, i) => (
            <DisplayWeapon
              key={w}
              weapon={w}
              positionX={weaponStartX + i * weaponSpacing}
              isEquipped={(equippedWeapon ?? weapon) === w}
              isUnlocked={unlockedWeapons ? unlockedWeapons.includes(w) : true}
            />
          ))}
        </group>
      )}
    </>
  )
}
