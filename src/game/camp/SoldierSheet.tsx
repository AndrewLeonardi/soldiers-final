/**
 * SoldierSheet — full-screen character sheet with hero 3D model.
 *
 * Sprint 3: The Identity. Full-screen overlay with rotating 3D soldier,
 * XP milestone bar across all ranks, combat stat bars, trained weapon
 * 3D previews, and chunky action buttons.
 */
import { useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { RankBadge } from './RankBadge'
import { getRank, getNextRank, RANKS } from '@config/ranks'
import { createFlexSoldier, animateFlexSoldier } from '@three/models/flexSoldier'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import type { WeaponType } from '@config/types'
import { CrossedSwordsIcon } from './icons/CrossedSwordsIcon'
import { MedicIcon } from './icons/MedicIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'Rifle',
  rocketLauncher: 'Rocket Launcher',
  grenade: 'Grenades',
  machineGun: 'Machine Gun',
  tank: 'Tank',
}

/** Hero 3D soldier that slowly rotates */
function HeroSoldierModel({ isInjured }: { isInjured: boolean }) {
  const soldier = useMemo(() => createFlexSoldier(0x5b8c5a), [])
  const ref = useRef<THREE.Group>(null!)
  const elapsed = useRef(0)

  useFrame((_, dt) => {
    elapsed.current += dt
    ref.current.rotation.y += dt * 0.4
    if (!isInjured) {
      animateFlexSoldier(soldier, 'idle', elapsed.current, dt)
    }
  })

  return (
    <group ref={ref}>
      <primitive object={soldier.group} />
    </group>
  )
}

/** Small spinning weapon model for the weapons grid */
function MiniWeaponModel({ weapon }: { weapon: string }) {
  const model = useMemo(() => createDisplayWeapon(weapon as WeaponType), [weapon])
  const ref = useRef<THREE.Group>(null!)

  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 1.5
  })

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  )
}

export function SoldierSheet() {
  const soldierSheetId = useSceneStore((s) => s.soldierSheetId)
  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)
  const setPreselectedTrainingSoldierId = useSceneStore((s) => s.setPreselectedTrainingSoldierId)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const setFiringRange = useSceneStore((s) => s.setFiringRange)
  const soldiers = useCampStore((s) => s.soldiers)
  const healSoldier = useCampStore((s) => s.healSoldier)

  const soldier = soldierSheetId ? soldiers.find((s) => s.id === soldierSheetId) : null

  const handleClose = useCallback(() => {
    sfx.buttonTap()
    setSoldierSheetId(null)
  }, [setSoldierSheetId])

  const handleTrainNow = useCallback(() => {
    if (!soldierSheetId) return
    sfx.buttonTap()
    setPreselectedTrainingSoldierId(soldierSheetId)
    setSoldierSheetId(null)
    setTrainingSheetOpen(true)
  }, [soldierSheetId, setPreselectedTrainingSoldierId, setSoldierSheetId, setTrainingSheetOpen])

  const handleTestWeapon = useCallback((weapon: WeaponType) => {
    if (!soldierSheetId) return
    sfx.weaponEquip()
    setSoldierSheetId(null)
    setFiringRange(soldierSheetId, weapon)
  }, [soldierSheetId, setSoldierSheetId, setFiringRange])

  const handleHeal = useCallback(() => {
    if (!soldierSheetId) return
    sfx.buttonTap()
    healSoldier(soldierSheetId)
  }, [soldierSheetId, healSoldier])

  if (!soldier) return null

  const trainedBrains = soldier.trainedBrains ? Object.keys(soldier.trainedBrains) : []
  const legacyBrains = soldier.legacyBrains ? Object.keys(soldier.legacyBrains) : []
  const hasLegacy = legacyBrains.length > 0 && trainedBrains.length === 0

  const xp = soldier.xp ?? 0
  const rank = getRank(xp)
  const nextRank = getNextRank(xp)
  const isInjured = !!(soldier.injuredUntil && soldier.injuredUntil > Date.now())
  const fitnessPercent = soldier.fitnessScore != null ? Math.round(soldier.fitnessScore * 100) : 0
  const generationsTrained = soldier.generationsTrained ?? 0

  // XP milestone bar: show progress across all ranks
  const maxXP = RANKS[RANKS.length - 1]!.xp
  const xpPercent = Math.min(100, (xp / maxXP) * 100)

  // Injured time remaining
  const injuredRemaining = isInjured ? Math.max(0, Math.ceil((soldier.injuredUntil! - Date.now()) / 1000)) : 0
  const injuredMin = Math.floor(injuredRemaining / 60)
  const injuredSec = injuredRemaining % 60

  return (
    <div className="soldier-detail-overlay" onClick={handleClose}>
      <div className="soldier-detail-card" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="soldier-detail-close game-btn" onClick={handleClose}>✕</button>

        {/* Header */}
        <div className="soldier-detail-header">
          <RankBadge xp={xp} size="md" showName />
          <h1 className="soldier-detail-name">{soldier.name}</h1>
          <div className="soldier-detail-subtitle">
            {WEAPON_LABELS[soldier.weapon] ?? soldier.weapon}
            {isInjured && <span className="soldier-detail-injured-tag">INJURED</span>}
            {!soldier.trained && !isInjured && <span className="soldier-detail-untrained-tag">UNTRAINED</span>}
          </div>
        </div>

        {/* Hero 3D model */}
        <div className="soldier-hero-canvas" style={isInjured ? { filter: 'saturate(0.4)' } : undefined}>
          <Canvas
            camera={{ position: [0, 0.2, 4.0], fov: 40 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 4, 5]} intensity={1.0} />
            <directionalLight position={[-3, 1, -2]} intensity={0.4} color={0x88aaff} />
            <pointLight
              position={[0, 0.5, 1.5]}
              intensity={0.4}
              color={isInjured ? '#ff4444' : rank.color}
            />
            <HeroSoldierModel isInjured={isInjured} />
          </Canvas>
        </div>

        {/* XP milestone bar */}
        <div className="soldier-milestone-section">
          <div className="soldier-milestone-label">
            <span>{xp} XP</span>
            <span>{nextRank ? `NEXT: ${nextRank.name.toUpperCase()}` : 'MAX RANK'}</span>
          </div>
          <div className="soldier-milestone-bar">
            <div
              className="soldier-milestone-fill"
              style={{
                width: `${xpPercent}%`,
                background: `linear-gradient(90deg, ${rank.color}, ${nextRank?.color ?? rank.color})`,
              }}
            />
            {/* Rank markers */}
            {RANKS.slice(1).map((r) => {
              const pos = (r.xp / maxXP) * 100
              return (
                <div
                  key={r.name}
                  className={`soldier-milestone-marker ${xp >= r.xp ? 'reached' : ''}`}
                  style={{ left: `${pos}%` }}
                  title={`${r.name}: ${r.xp} XP`}
                >
                  <span className="soldier-milestone-marker-dot" style={{ borderColor: r.color }} />
                  <span className="soldier-milestone-marker-label">{r.badge || r.name[0]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Combat stats */}
        <div className="soldier-detail-stats">
          <div className="soldier-detail-stat">
            <span className="soldier-detail-stat-label">ACCURACY</span>
            <div className="armory-stat-bar">
              <div className="armory-stat-fill" style={{ width: `${fitnessPercent}%`, background: '#4ecdc4' }} />
            </div>
            <span className="soldier-detail-stat-val">{fitnessPercent}%</span>
          </div>
          <div className="soldier-detail-stat">
            <span className="soldier-detail-stat-label">EXPERIENCE</span>
            <div className="armory-stat-bar">
              <div className="armory-stat-fill" style={{ width: `${Math.min(100, generationsTrained * 2)}%`, background: '#ffd93d' }} />
            </div>
            <span className="soldier-detail-stat-val">{generationsTrained} GEN</span>
          </div>
          <div className="soldier-detail-stat">
            <span className="soldier-detail-stat-label">WEAPONS</span>
            <div className="armory-stat-bar">
              <div className="armory-stat-fill" style={{ width: `${Math.min(100, trainedBrains.length * 25)}%`, background: '#ff6b6b' }} />
            </div>
            <span className="soldier-detail-stat-val">{trainedBrains.length} BRAINS</span>
          </div>
        </div>

        {/* Trained weapons grid with 3D models */}
        {trainedBrains.length > 0 && (
          <div className="soldier-weapons-grid">
            <div className="soldier-weapons-label">TRAINED WEAPONS</div>
            <div className="soldier-weapons-row">
              {trainedBrains.map((w) => (
                <div
                  key={w}
                  className="soldier-weapon-card"
                  onClick={() => handleTestWeapon(w as WeaponType)}
                >
                  <div className="soldier-weapon-canvas">
                    <Canvas
                      camera={{ position: [0, 0.1, 1.2], fov: 35 }}
                      gl={{ alpha: true, antialias: true }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[2, 3, 4]} intensity={0.8} />
                      <MiniWeaponModel weapon={w} />
                    </Canvas>
                  </div>
                  <span className="soldier-weapon-name">{WEAPON_LABELS[w] ?? w}</span>
                  <span className="soldier-weapon-test">TEST</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Re-train badge */}
        {hasLegacy && (
          <div className="soldier-retrain-badge">
            RE-TRAIN RECOMMENDED — brain upgraded
          </div>
        )}

        {/* Action buttons */}
        <div className="soldier-detail-actions">
          <button className="game-btn soldier-action-btn train" onClick={handleTrainNow}>
            <CrossedSwordsIcon size={14} /> {hasLegacy ? 'RE-TRAIN' : 'TRAIN'}
          </button>
          {isInjured && (
            <button className="game-btn soldier-action-btn heal" onClick={handleHeal}>
              <MedicIcon size={14} /> HEAL ({injuredMin}:{String(injuredSec).padStart(2, '0')})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
