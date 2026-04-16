/**
 * BattlePickerSheet — Attack mode selector + campaign map.
 *
 * First screen: CAMPAIGN / PVP ARENA mode buttons (game menu style).
 * Second screen: SVG campaign map with winding path and battle nodes.
 * Briefing card with 3D weapon showcase on level tap.
 */
import { useCallback, useState, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { generateLevel, getMaxAccessibleLevel } from '@config/levelGenerator'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import { TokenIcon } from './TokenIcon'
import { LockIcon } from './icons/LockIcon'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import { track } from '@analytics/events'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rocketLauncher: 'ROCKET LAUNCHER',
  grenade: 'GRENADES',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

const RARITY_COLORS: Record<string, string> = {
  machineGun: '#27ae60',
  rocketLauncher: '#2980b9',
  grenade: '#8e44ad',
  tank: '#f39c12',
}

function SpinningWeapon({ weapon }: { weapon: string }) {
  const groupRef = useRef<THREE.Group>(null!)
  const weaponObj = useMemo(() => createDisplayWeapon(weapon as WeaponType), [weapon])
  useFrame((_, dt) => { if (groupRef.current) groupRef.current.rotation.y += dt * 1.5 })
  return <group ref={groupRef}><primitive object={weaponObj} /></group>
}

const PVP_UNLOCK_LEVEL = 5

export function BattlePickerSheet() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const initBattle = useCampBattleStore((s) => s.initBattle)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)

  const maxLevel = useMemo(() => getMaxAccessibleLevel(battlesCompleted ?? {}), [battlesCompleted])
  const playerLevel = Object.keys(battlesCompleted ?? {}).length + 1
  const pvpUnlocked = playerLevel >= PVP_UNLOCK_LEVEL

  const [showMap, setShowMap] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  const levels = useMemo(() => {
    return Array.from({ length: Math.max(maxLevel, 3) }, (_, i) => ({
      level: i + 1,
      config: generateLevel(i + 1),
    }))
  }, [maxLevel])

  const selectedConfig = selectedLevel != null ? levels.find(l => l.level === selectedLevel)?.config : null

  const handleNodeTap = useCallback((level: number) => {
    sfx.buttonTap()
    if (level > maxLevel) return
    setSelectedLevel(level === selectedLevel ? null : level)
  }, [maxLevel, selectedLevel])

  const handleDeploy = useCallback(() => {
    if (!selectedConfig || !selectedLevel || selectedLevel > maxLevel) return
    sfx.deployHorn()
    initBattle(selectedConfig)
    setBattlePhase('placing')
    track('battle_start', { battleId: selectedConfig.id })
  }, [selectedConfig, selectedLevel, maxLevel, initBattle, setBattlePhase])

  const handleClose = useCallback(() => {
    sfx.buttonTap()
    if (showMap) {
      setShowMap(false)
      setSelectedLevel(null)
    } else {
      setBattlePhase('idle')
    }
  }, [showMap, setBattlePhase])

  if (battlePhase !== 'picking') return null

  // ── MODE SELECTOR (first screen) ──
  if (!showMap) {
    return (
      <div className="cm-overlay">
        <div className="cm-bg-layer cm-bg-dark" />
        <div className="cm-mode-selector">
          <button className="cm-mode-back" onClick={handleClose}>← BACK</button>

          <div className="cm-mode-buttons">
            {/* CAMPAIGN button */}
            <button className="cm-mode-btn cm-mode-campaign" onClick={() => { sfx.buttonTap(); setShowMap(true) }}>
              <span className="cm-mode-btn-label">CAMPAIGN</span>
              <span className="cm-mode-btn-sub">{Object.keys(battlesCompleted ?? {}).length} of {levels.length} cleared</span>
            </button>

            {/* PVP ARENA button */}
            <button className={`cm-mode-btn cm-mode-pvp ${!pvpUnlocked ? 'locked' : ''}`} disabled={!pvpUnlocked}>
              <span className="cm-mode-btn-label">PVP ARENA</span>
              {pvpUnlocked ? (
                <span className="cm-mode-btn-sub">COMING SOON</span>
              ) : (
                <span className="cm-mode-btn-sub">
                  <LockIcon size={12} /> REQUIRES LEVEL {PVP_UNLOCK_LEVEL} ({playerLevel}/{PVP_UNLOCK_LEVEL})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CAMPAIGN MAP (second screen) ──
  const nodePositions = levels.map((_, i) => ({
    x: 200 + (i % 2 === 0 ? -55 : 55) + Math.sin(i * 0.7) * 15,
    y: 80 + i * 120,
  }))

  const pathD = nodePositions.reduce((d, pos, i) => {
    if (i === 0) return `M ${pos.x} ${pos.y}`
    const prev = nodePositions[i - 1]!
    const cpX = 45
    return `${d} C ${prev.x + cpX} ${prev.y - 40}, ${pos.x - cpX} ${pos.y + 40}, ${pos.x} ${pos.y}`
  }, '')

  const weaponReward = selectedConfig?.weaponReward
  const isWeaponNew = weaponReward ? !unlockedWeapons.includes(weaponReward) : false
  const rarityColor = weaponReward ? (RARITY_COLORS[weaponReward] ?? '#888') : '#888'

  return (
    <div className="cm-overlay">
      <div className="cm-bg-layer cm-bg-dark" />

      <div className="cm-top-bar">
        <button className="cm-back-btn" onClick={handleClose}>← BACK</button>
        <span className="cm-title">CAMPAIGN</span>
        <span className="cm-level-count">{Object.keys(battlesCompleted ?? {}).length} CLEARED</span>
      </div>

      <div className="cm-scroll-container">
        <svg className="cm-map" viewBox="0 0 400 550" preserveAspectRatio="xMidYMid meet">
          <path d={pathD} fill="none" stroke="#5a4a28" strokeWidth="28" strokeLinecap="round" opacity="0.4" />
          <path d={pathD} fill="none" stroke="#7a6a40" strokeWidth="18" strokeLinecap="round" opacity="0.6" />
          <path d={pathD} fill="none" stroke="#9a8a58" strokeWidth="8" strokeLinecap="round" strokeDasharray="4 6" opacity="0.5" />

          {levels.map(({ level, config }, i) => {
            const pos = nodePositions[i]!
            const completed = battlesCompleted?.[config.id]
            const isLocked = level > maxLevel
            const isCurrent = level === maxLevel && !completed
            const isSelected = selectedLevel === level
            const stars = completed?.stars ?? 0

            return (
              <g key={level} className={`cm-node ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNodeTap(level)} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
                {isCurrent && (<>
                  <circle cx={pos.x} cy={pos.y} r="28" fill="none" stroke="#d4aa40" strokeWidth="2" opacity="0.3" className="cm-glow-outer" />
                  <circle cx={pos.x} cy={pos.y} r="24" fill="none" stroke="#d4aa40" strokeWidth="1.5" opacity="0.5" className="cm-glow-inner" />
                </>)}
                {isSelected && <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke="#ffd740" strokeWidth="3" className="cm-select-ring" />}
                <circle cx={pos.x} cy={pos.y} r="20" fill={isLocked ? '#1a1a1a' : completed ? '#2a5a2a' : '#3a6a3a'} stroke={isLocked ? '#444' : completed ? '#66cc66' : '#8aaa8a'} strokeWidth="3" />
                <circle cx={pos.x} cy={pos.y - 2} r="16" fill="none" stroke={isLocked ? 'transparent' : 'rgba(255,255,255,0.12)'} strokeWidth="1" />
                {isLocked
                  ? <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#555" fontSize="12">🔒</text>
                  : <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="'Black Ops One'">{level}</text>}
                {completed && <text x={pos.x} y={pos.y + 32} textAnchor="middle" fill="#ffd740" fontSize="10">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</text>}
                {!isLocked && <text x={pos.x} y={pos.y - 28} textAnchor="middle" fill="#c0d0a0" fontSize="8" fontFamily="'Black Ops One'" letterSpacing="0.5">{config.name.toUpperCase()}</text>}
                {config.weaponReward && !isLocked && (<g>
                  <circle cx={pos.x + 18} cy={pos.y - 14} r="8" fill={RARITY_COLORS[config.weaponReward] ?? '#8e44ad'} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  <text x={pos.x + 18} y={pos.y - 13} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="6" fontWeight="800">
                    {config.weaponReward === 'machineGun' ? 'MG' : config.weaponReward === 'rocketLauncher' ? 'RL' : config.weaponReward === 'grenade' ? 'GR' : '?'}
                  </text>
                </g>)}
              </g>
            )
          })}

          <text x="60" y="60" fill="#5a6a4a" fontSize="18" opacity="0.3">🌿</text>
          <text x="340" y="160" fill="#5a6a4a" fontSize="16" opacity="0.3">🪨</text>
          <text x="80" y="280" fill="#5a6a4a" fontSize="14" opacity="0.25">⛺</text>
          <text x="320" y="400" fill="#5a6a4a" fontSize="16" opacity="0.3">🏴</text>
        </svg>
      </div>

      {/* Briefing card with weapon showcase */}
      {selectedConfig && selectedLevel && (
        <div className="cm-briefing">
          <div className="cm-briefing-card">
            {weaponReward && (
              <div className="cm-weapon-showcase" style={{ borderColor: rarityColor }}>
                <div className="cm-weapon-canvas-large">
                  <Canvas camera={{ position: [0, 0.1, 1.4], fov: 30 }} gl={{ alpha: true, antialias: true }} style={{ width: '100%', height: '100%' }}>
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[2, 3, 4]} intensity={0.8} />
                    <directionalLight position={[-2, 1, -1]} intensity={0.3} color={0x88aaff} />
                    <SpinningWeapon weapon={weaponReward} />
                  </Canvas>
                </div>
                <div className="cm-weapon-unlock-label" style={{ color: rarityColor }}>
                  {WEAPON_LABELS[weaponReward] ?? weaponReward}
                </div>
                <div className="cm-weapon-unlock-badge" style={{ background: rarityColor }}>
                  {isWeaponNew ? 'UNLOCK ON VICTORY' : '✓ UNLOCKED'}
                </div>
              </div>
            )}

            <div className="cm-briefing-name">{selectedConfig.name}</div>
            <div className="cm-briefing-desc">{selectedConfig.description}</div>
            <div className="cm-briefing-meta">
              <span>{selectedConfig.enemySoldiers?.length ?? 0} ENEMIES</span>
              <span>+{selectedConfig.reward} <TokenIcon size={10} /></span>
            </div>
            <button className="cm-deploy-btn" onClick={handleDeploy}>DEPLOY</button>
          </div>
        </div>
      )}
    </div>
  )
}
