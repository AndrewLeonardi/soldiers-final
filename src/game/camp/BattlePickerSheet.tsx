/**
 * BattlePickerSheet — Campaign map level selector.
 *
 * Sprint B (UI redesign). Angry Birds-style winding path map with battle nodes.
 * Each node shows stars, weapon reward, lock state. Tapping opens a briefing
 * card with DEPLOY button.
 */
import { useCallback, useState, useMemo } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { generateLevel, getMaxAccessibleLevel } from '@config/levelGenerator'
import { TokenIcon } from './TokenIcon'
import { LockIcon } from './icons/LockIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rocketLauncher: 'ROCKET LAUNCHER',
  grenade: 'GRENADES',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

export function BattlePickerSheet() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const initBattle = useCampBattleStore((s) => s.initBattle)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)

  const maxLevel = useMemo(
    () => getMaxAccessibleLevel(battlesCompleted ?? {}),
    [battlesCompleted],
  )

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  // Generate all accessible level configs
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
  }, [selectedConfig, selectedLevel, maxLevel, initBattle, setBattlePhase])

  const handleClose = useCallback(() => {
    sfx.buttonTap()
    setSelectedLevel(null)
    setBattlePhase('idle')
  }, [setBattlePhase])

  if (battlePhase !== 'picking') return null

  // Node positions: winding path from top to bottom
  const nodePositions = levels.map((_, i) => ({
    x: 200 + (i % 2 === 0 ? -55 : 55) + Math.sin(i * 0.7) * 15,
    y: 80 + i * 120,
  }))

  // SVG path through nodes
  const pathD = nodePositions.reduce((d, pos, i) => {
    if (i === 0) return `M ${pos.x} ${pos.y}`
    const prev = nodePositions[i - 1]!
    const cpX = 45
    return `${d} C ${prev.x + cpX} ${prev.y - 40}, ${pos.x - cpX} ${pos.y + 40}, ${pos.x} ${pos.y}`
  }, '')

  return (
    <div className="cm-overlay">
      {/* Background layers */}
      <div className="cm-bg-layer cm-bg-dark" />

      {/* Top bar */}
      <div className="cm-top-bar">
        <button className="cm-back-btn" onClick={handleClose}>← BACK</button>
        <span className="cm-title">CAMPAIGN</span>
        <span className="cm-level-count">{Object.keys(battlesCompleted ?? {}).length} CLEARED</span>
      </div>

      {/* Map container */}
      <div className="cm-scroll-container">
        <svg className="cm-map" viewBox="0 0 400 550" preserveAspectRatio="xMidYMid meet">
          {/* Dirt path */}
          <path d={pathD} fill="none" stroke="#5a4a28" strokeWidth="28" strokeLinecap="round" opacity="0.4" />
          <path d={pathD} fill="none" stroke="#7a6a40" strokeWidth="18" strokeLinecap="round" opacity="0.6" />
          <path d={pathD} fill="none" stroke="#9a8a58" strokeWidth="8" strokeLinecap="round" strokeDasharray="4 6" opacity="0.5" />

          {/* Battle nodes */}
          {levels.map(({ level, config }, i) => {
            const pos = nodePositions[i]!
            const completed = battlesCompleted?.[config.id]
            const isLocked = level > maxLevel
            const isCurrent = level === maxLevel && !completed
            const isSelected = selectedLevel === level
            const stars = completed?.stars ?? 0

            return (
              <g
                key={level}
                className={`cm-node ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNodeTap(level)}
                style={{ cursor: isLocked ? 'default' : 'pointer' }}
              >
                {/* Glow rings for current level */}
                {isCurrent && (
                  <>
                    <circle cx={pos.x} cy={pos.y} r="28" fill="none" stroke="#d4aa40" strokeWidth="2" opacity="0.3" className="cm-glow-outer" />
                    <circle cx={pos.x} cy={pos.y} r="24" fill="none" stroke="#d4aa40" strokeWidth="1.5" opacity="0.5" className="cm-glow-inner" />
                  </>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke="#ffd740" strokeWidth="3" className="cm-select-ring" />
                )}

                {/* Node circle */}
                <circle
                  cx={pos.x} cy={pos.y} r="20"
                  fill={isLocked ? '#1a1a1a' : completed ? '#2a5a2a' : '#3a6a3a'}
                  stroke={isLocked ? '#444' : completed ? '#66cc66' : '#8aaa8a'}
                  strokeWidth="3"
                />
                {/* Inner highlight for depth */}
                <circle
                  cx={pos.x} cy={pos.y - 2} r="16"
                  fill="none"
                  stroke={isLocked ? 'transparent' : 'rgba(255,255,255,0.12)'}
                  strokeWidth="1"
                />

                {/* Node content */}
                {isLocked ? (
                  <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#555" fontSize="12" fontFamily="'Black Ops One'">
                    🔒
                  </text>
                ) : (
                  <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="'Black Ops One'">
                    {level}
                  </text>
                )}

                {/* Stars below node */}
                {completed && (
                  <text x={pos.x} y={pos.y + 32} textAnchor="middle" fill="#ffd740" fontSize="10">
                    {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                  </text>
                )}

                {/* Name plate */}
                {!isLocked && (
                  <text x={pos.x} y={pos.y - 28} textAnchor="middle" fill="#c0d0a0" fontSize="8" fontFamily="'Black Ops One'" letterSpacing="0.5">
                    {config.name.toUpperCase()}
                  </text>
                )}

                {/* Weapon reward indicator */}
                {config.weaponReward && !isLocked && (
                  <g>
                    <circle cx={pos.x + 18} cy={pos.y - 14} r="8" fill="#8e44ad" stroke="#aa66cc" strokeWidth="1.5" />
                    <text x={pos.x + 18} y={pos.y - 13} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="6" fontWeight="800">
                      {config.weaponReward === 'machineGun' ? 'MG' : config.weaponReward === 'rocketLauncher' ? 'RL' : config.weaponReward === 'grenade' ? 'GR' : '?'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Decorative elements */}
          <text x="60" y="60" fill="#5a6a4a" fontSize="18" opacity="0.3">🌿</text>
          <text x="340" y="160" fill="#5a6a4a" fontSize="16" opacity="0.3">🪨</text>
          <text x="80" y="280" fill="#5a6a4a" fontSize="14" opacity="0.25">⛺</text>
          <text x="320" y="400" fill="#5a6a4a" fontSize="16" opacity="0.3">🏴</text>
        </svg>
      </div>

      {/* Briefing card — slides up when a node is selected */}
      {selectedConfig && selectedLevel && (
        <div className="cm-briefing">
          <div className="cm-briefing-card">
            <div className="cm-briefing-name">{selectedConfig.name}</div>
            <div className="cm-briefing-desc">{selectedConfig.description}</div>
            <div className="cm-briefing-meta">
              <span>{selectedConfig.enemySoldiers?.length ?? 0} ENEMIES</span>
              <span>+{selectedConfig.reward} <TokenIcon size={10} /></span>
              {selectedConfig.weaponReward && (
                <span className="cm-briefing-unlock">
                  {unlockedWeapons.includes(selectedConfig.weaponReward) ? '✓' : '🔓'} {WEAPON_LABELS[selectedConfig.weaponReward] ?? selectedConfig.weaponReward}
                </span>
              )}
            </div>
            <button className="cm-deploy-btn" onClick={handleDeploy}>
              DEPLOY
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
