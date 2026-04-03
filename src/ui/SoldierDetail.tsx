import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { useTrainingStore } from '@stores/trainingStore'
import { WEAPON_DISPLAY, WEAPON_UNLOCK_COST, WEAPON_TRAINING } from '@config/roster'
import type { WeaponType } from '@config/types'
import { SoldierPreview } from '@three/models/SoldierPreview'
import {
  BackArrowIcon,
  MicrochipIcon,
  RifleIcon,
  RocketLauncherIcon,
  MachineGunIcon,
  StarIcon,
  CheckIcon,
  LockIcon,
  TrainIcon,
} from './ToyIcons'
import '@styles/loadout.css'

const ALL_WEAPONS: WeaponType[] = ['rifle', 'rocketLauncher', 'grenade', 'machineGun']

function WeaponIcon({ weapon, size = 28 }: { weapon: WeaponType; size?: number }) {
  switch (weapon) {
    case 'rifle': return <RifleIcon size={size} />
    case 'rocketLauncher': return <RocketLauncherIcon size={size} />
    case 'machineGun': return <MachineGunIcon size={size} />
    case 'grenade': return <TrainIcon size={size} />
  }
}

export function SoldierDetail() {
  const compute = useGameStore((s) => s.compute)
  const phase = useGameStore((s) => s.phase)
  const soldiers = useRosterStore((s) => s.soldiers)
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)
  const closeDetail = useRosterStore((s) => s.closeDetail)
  const equipWeapon = useRosterStore((s) => s.equipWeapon)
  const unlockWeapon = useRosterStore((s) => s.unlockWeapon)
  const [trainingWeapon, setTrainingWeapon] = useState<WeaponType | null>(null)

  if (!detailSoldierId || phase === 'training') return null
  const soldier = soldiers.find((s) => s.id === detailSoldierId)
  if (!soldier) return null

  function handleWeaponTap(weapon: WeaponType) {
    if (!soldier) return
    if (soldier.unlockedWeapons.includes(weapon)) {
      equipWeapon(soldier.id, weapon)
      setTrainingWeapon(null)
    } else {
      setTrainingWeapon(weapon)
    }
  }

  function handleTrain() {
    if (!soldier || !trainingWeapon) return
    const config = WEAPON_TRAINING[trainingWeapon]
    if (!config) {
      // No training needed (rifle) — just unlock
      if (unlockWeapon(soldier.id, trainingWeapon)) {
        setTrainingWeapon(null)
      }
      return
    }
    // Launch real training
    const started = useTrainingStore.getState().startTraining(soldier.id, trainingWeapon)
    if (started) {
      setTrainingWeapon(null)
      useGameStore.getState().setPhase('training')
    }
  }

  return (
    <div className="detail-screen">
      {/* ── Soldier Preview (top) ──────────────────── */}
      <div className="detail-preview">
        <Canvas
          dpr={[1, 2]}
          shadows
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: 30, position: [0, 0.35, 2.4], near: 0.1, far: 20 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.2
            gl.setClearColor(0x111a0d)
          }}
        >
          <Suspense fallback={null}>
            <SoldierPreview weapon={soldier.equippedWeapon} />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Header (floating) ─────────────────────── */}
      <div className="detail-header">
        <button className="detail-back" onPointerDown={() => { closeDetail(); setTrainingWeapon(null) }}>
          <BackArrowIcon size={20} />
        </button>
        <div className="detail-name-block">
          <div className="detail-name">{soldier.name}</div>
          <div className="detail-stars">
            {[1, 2, 3].map((i) => (
              <StarIcon key={i} size={14} color={i <= soldier.starRating ? '#FFD700' : 'rgba(255,255,255,0.15)'} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Weapon Cards (bottom strip) ───────────── */}
      <div className="detail-bottom">
        <div className="detail-wpn-label">Weapons</div>
        <div className="detail-wpn-scroll">
          {ALL_WEAPONS.map((weapon) => {
            const isEquipped = soldier.equippedWeapon === weapon
            const isUnlocked = soldier.unlockedWeapons.includes(weapon)
            const display = WEAPON_DISPLAY[weapon]
            const cost = WEAPON_UNLOCK_COST[weapon]

            return (
              <button
                key={weapon}
                className={`wpn-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onPointerDown={() => handleWeaponTap(weapon)}
              >
                <div className="wpn-card-icon">
                  <WeaponIcon weapon={weapon} size={32} />
                  {!isUnlocked && (
                    <div className="wpn-card-lock"><LockIcon size={14} color="white" /></div>
                  )}
                  {isEquipped && (
                    <div className="wpn-card-check"><CheckIcon size={12} color="#4ADE80" /></div>
                  )}
                </div>
                <div className="wpn-card-name">{display.name}</div>
                {!isUnlocked && (
                  <div className="wpn-card-cost">
                    <MicrochipIcon size={10} color="rgba(245,240,224,0.5)" /> {cost}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Training CTA ──────────────────────────── */}
      {trainingWeapon && (
        <div className="training-cta">
          <div className="training-cta-inner">
            <div className="training-cta-title">Training Required</div>
            <div className="training-cta-desc">
              {soldier.name} needs to learn<br />
              <strong>{WEAPON_DISPLAY[trainingWeapon].name.toUpperCase()}</strong>
            </div>
            <div className="training-cta-sub">
              Watch your soldier learn through neural evolution
            </div>
            <button className="training-cta-btn" onPointerDown={handleTrain} disabled={compute < (WEAPON_TRAINING[trainingWeapon]?.computeCost ?? WEAPON_UNLOCK_COST[trainingWeapon])}>
              <MicrochipIcon size={20} color="white" />
              Begin Training — {WEAPON_TRAINING[trainingWeapon]?.computeCost ?? WEAPON_UNLOCK_COST[trainingWeapon]} Compute
            </button>
            <button className="training-cta-cancel" onPointerDown={() => setTrainingWeapon(null)}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
