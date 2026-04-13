/**
 * RecruitSheet — recruit with 3D ceremony reveal.
 *
 * Sprint 3: The Identity. 3 phases:
 *   1. Name Selection — pick from 3 cards, reroll
 *   2. Ceremony — 3D soldier drops from sky, bounces, dust burst, info reveal
 *   3. Dismiss — "REPORT FOR DUTY" button
 */
import { useState, useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { SOLDIER_RECRUIT_COST, getRecruitNameOptions } from '@config/roster'
import { GoldCoinIcon } from './GoldCoinIcon'
import { createFlexSoldier, animateFlexSoldier } from '@three/models/flexSoldier'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

type Phase = 'picking' | 'ceremony' | 'dismiss'

/** Standard easeOutBounce easing */
function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) return 7.5625 * t * t
  if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75 }
  if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375 }
  const t2 = t - 2.625 / 2.75
  return 7.5625 * t2 * t2 + 0.984375
}

/** 3D soldier that drops in from above with bounce */
function DropInSoldier({ onLanded }: { onLanded: () => void }) {
  const soldier = useMemo(() => createFlexSoldier(0x5b8c5a), [])
  const ref = useRef<THREE.Group>(null!)
  const landed = useRef(false)
  const startTime = useRef(0)

  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    if (startTime.current === 0) startTime.current = clock.elapsedTime
    const t = Math.min((clock.elapsedTime - startTime.current) / 1.2, 1)
    const y = 8 * (1 - easeOutBounce(t))
    ref.current.position.y = y

    if (t >= 1 && !landed.current) {
      landed.current = true
      onLanded()
    }

    // Idle animation after landing
    if (landed.current) {
      animateFlexSoldier(soldier, 'idle', clock.elapsedTime, dt)
    }

    // Slow rotation after landing
    if (landed.current) {
      ref.current.rotation.y += dt * 0.3
    }
  })

  return (
    <group ref={ref}>
      <primitive object={soldier.group} />
    </group>
  )
}

/** Dust burst particles on landing */
function DustBurst({ active }: { active: boolean }) {
  const particles = useRef<THREE.Group>(null!)
  const startTime = useRef(0)
  const meshes = useMemo(() => {
    const arr: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[] = []
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06)
    const mat = new THREE.MeshStandardMaterial({ color: 0xaa9977, transparent: true, opacity: 0.8 })
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2
      const speed = 1.5 + Math.random() * 1.5
      arr.push({
        mesh: new THREE.Mesh(geo, mat.clone()),
        vx: Math.cos(angle) * speed,
        vy: 1.5 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!active || !particles.current) return
    if (startTime.current === 0) startTime.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - startTime.current
    const duration = 0.8

    for (const p of meshes) {
      const t = Math.min(elapsed / duration, 1)
      p.mesh.position.set(
        p.vx * t * 0.5,
        p.vy * t * 0.5 - 4.9 * t * t * 0.25,
        p.vz * t * 0.5,
      )
      const scale = 1 - t
      p.mesh.scale.setScalar(scale)
      ;(p.mesh.material as THREE.MeshStandardMaterial).opacity = 0.8 * (1 - t)
    }
  })

  if (!active) return null

  return (
    <group ref={particles}>
      {meshes.map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
    </group>
  )
}

/** Camera shake after landing */
function CameraShake({ active }: { active: boolean }) {
  const startTime = useRef(0)

  useFrame(({ camera, clock }) => {
    if (!active) return
    if (startTime.current === 0) startTime.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - startTime.current
    if (elapsed > 0.4) {
      camera.position.set(0, 0.8, 3.0)
      return
    }
    const intensity = (1 - elapsed / 0.4) * 0.08
    camera.position.set(
      (Math.random() - 0.5) * intensity,
      0.8 + (Math.random() - 0.5) * intensity,
      3.0 + (Math.random() - 0.5) * intensity * 0.5,
    )
  })

  return null
}

export function RecruitSheet() {
  const isOpen = useSceneStore((s) => s.recruitSheetOpen)
  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)
  const gold = useCampStore((s) => s.gold)
  const recruitSoldier = useCampStore((s) => s.recruitSoldier)
  const soldiers = useCampStore((s) => s.soldiers)

  const [nameOptions, setNameOptions] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('picking')
  const [hasLanded, setHasLanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showDismiss, setShowDismiss] = useState(false)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshNames = useCallback(() => {
    setNameOptions(getRecruitNameOptions())
    setSelectedName(null)
  }, [])

  // Refresh on open, reset phase
  useMemo(() => {
    if (isOpen) {
      refreshNames()
      setPhase('picking')
      setHasLanded(false)
      setShowInfo(false)
      setShowDismiss(false)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const canAfford = gold >= SOLDIER_RECRUIT_COST

  const handleSelectName = useCallback((name: string) => {
    sfx.buttonTap()
    setSelectedName(name)
  }, [])

  const handleRecruit = useCallback(() => {
    if (!canAfford || !selectedName) return
    const success = recruitSoldier(selectedName)
    if (success) {
      sfx.recruitChime()
      setPhase('ceremony')
    }
  }, [canAfford, selectedName, recruitSoldier])

  const handleLanded = useCallback(() => {
    setHasLanded(true)
    sfx.graduationFanfare()
    // Info reveal after 0.5s
    setTimeout(() => setShowInfo(true), 500)
    // Dismiss button after 1.5s
    setTimeout(() => setShowDismiss(true), 1500)
    // Auto-dismiss after 5s
    autoDismissRef.current = setTimeout(() => {
      setRecruitSheetOpen(false)
    }, 5000)
  }, [setRecruitSheetOpen])

  const handleDismiss = useCallback(() => {
    sfx.buttonTap()
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    setRecruitSheetOpen(false)
  }, [setRecruitSheetOpen])

  const handleClose = useCallback(() => {
    if (phase !== 'picking') return // Can't close during ceremony
    setRecruitSheetOpen(false)
  }, [phase, setRecruitSheetOpen])

  if (!isOpen) return null

  // ═══ CEREMONY PHASE ═══
  if (phase === 'ceremony') {
    return (
      <div className="recruit-ceremony">
        {/* Full-screen 3D canvas */}
        <div className="recruit-ceremony-canvas">
          <Canvas
            camera={{ position: [0, 0.8, 3.0], fov: 35 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[3, 5, 4]} intensity={1.2} />
            <directionalLight position={[-3, 2, -2]} intensity={0.4} color={0x88aaff} />
            <pointLight position={[0, 1, 2]} intensity={0.3} color="#00e5ff" />
            <DropInSoldier onLanded={handleLanded} />
            <DustBurst active={hasLanded} />
            <CameraShake active={hasLanded} />
          </Canvas>
        </div>

        {/* Info reveal */}
        {showInfo && (
          <div className="recruit-ceremony-info">
            <div className="recruit-ceremony-name">{selectedName}</div>
            <div className="recruit-ceremony-rank">RECRUIT</div>
            <div className="recruit-ceremony-weapon">ARMED: RIFLE</div>
          </div>
        )}

        {/* Confetti particles (CSS) */}
        {hasLanded && (
          <div className="recruit-ceremony-confetti">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="recruit-confetti-particle"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.08}s`,
                  background: ['#00e5ff', '#4CAF50', '#ffd93d', '#ff6b6b', '#9C27B0'][i % 5],
                }}
              />
            ))}
          </div>
        )}

        {/* Dismiss button */}
        {showDismiss && (
          <button className="recruit-ceremony-dismiss game-btn" onClick={handleDismiss}>
            REPORT FOR DUTY
          </button>
        )}
      </div>
    )
  }

  // ═══ PICKING PHASE ═══
  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet recruit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">RECRUIT SOLDIER</span>
          <span className="recruit-cost">
            <GoldCoinIcon size={14} />
            <span className="recruit-cost-value">{SOLDIER_RECRUIT_COST}</span>
          </span>
        </div>

        <div className="game-sheet-body">
          <div className="recruit-balance">
            <GoldCoinIcon size={18} />
            <span className="recruit-balance-value">{gold}</span>
            <span className="recruit-balance-label">GOLD</span>
          </div>

          <div className="recruit-squad-count">
            SQUAD: {soldiers.length} SOLDIERS
          </div>

          {!canAfford && (
            <div className="recruit-insufficient">
              NOT ENOUGH GOLD
            </div>
          )}

          <div className="recruit-name-grid">
            {nameOptions.map((name) => (
              <button
                key={name}
                className={`recruit-name-card ${canAfford ? '' : 'disabled'} ${selectedName === name ? 'selected' : ''}`}
                onClick={() => handleSelectName(name)}
                disabled={!canAfford}
              >
                <span className="recruit-name-rank">{name.split(' ')[0]}</span>
                <span className="recruit-name-call">{name.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>

          <div className="recruit-bottom-actions">
            <button className="recruit-reroll" onClick={refreshNames}>
              REROLL NAMES
            </button>
            {selectedName && canAfford && (
              <button className="recruit-confirm-btn game-btn" onClick={handleRecruit}>
                RECRUIT {selectedName.split(' ').slice(1).join(' ')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
