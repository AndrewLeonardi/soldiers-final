/**
 * CampaignMap — Angry Birds-style path map with world-themed sections.
 *
 * Data-driven from worldRegistry. Each world gets a themed section
 * of the path. Battle nodes show stars, lock state, and names.
 * Adding a new world automatically extends the map.
 */
import { useGameStore } from '@stores/gameStore'
import { worldRegistry } from '@config/worlds'
import type { BattleConfig } from '@config/worlds'
import '@styles/campaignmap.css'

// World theme colors for map sections
const WORLD_THEMES: Record<string, { pathColor: string; accentColor: string; bgTint: string }> = {
  kitchen:  { pathColor: '#7a6a48', accentColor: '#d4aa40', bgTint: '#4a3520' },
  workshop: { pathColor: '#5a5a6a', accentColor: '#8899bb', bgTint: '#3a3a4a' },
  backyard: { pathColor: '#5a7a4a', accentColor: '#66cc66', bgTint: '#2a4a2a' },
}

// World decorative icons (small SVG elements near each section)
const WORLD_ICONS: Record<string, string> = {
  kitchen: '\u2615',    // coffee
  workshop: '\u2692',   // hammer
  backyard: '\u2600',   // sun
}

export function WorldSelect() {
  const phase = useGameStore((s) => s.phase)
  const selectBattle = useGameStore((s) => s.selectBattle)
  const worldProgress = useGameStore((s) => s.worldProgress)

  if (phase !== 'worldSelect') return null

  // Flatten all battles in order for the path
  const allBattles: (BattleConfig & { worldName: string; globalIndex: number })[] = []
  for (const world of worldRegistry.worlds) {
    const battles = worldRegistry.getBattlesForWorld(world.id)
    for (const battle of battles) {
      allBattles.push({ ...battle, worldName: world.name, globalIndex: allBattles.length })
    }
  }

  // Check if a battle is unlocked (first battle always unlocked, others need previous completed)
  function isUnlocked(index: number): boolean {
    if (index === 0) return true
    const prev = allBattles[index - 1]
    const progress = worldProgress[prev.worldId]?.battles[prev.id]
    return progress?.completed === true
  }

  // Find the current (first incomplete) battle
  function isCurrent(index: number): boolean {
    for (let i = 0; i < allBattles.length; i++) {
      const b = allBattles[i]
      const progress = worldProgress[b.worldId]?.battles[b.id]
      if (!progress?.completed) return i === index
    }
    return index === allBattles.length - 1
  }

  // Node positions: winding path from bottom to top
  const nodePositions = allBattles.map((_, i) => ({
    x: 200 + (i % 2 === 0 ? -60 : 60),
    y: 580 - i * 90,
  }))

  // SVG path through nodes
  const pathD = nodePositions.reduce((d, pos, i) => {
    if (i === 0) return `M ${pos.x} ${pos.y}`
    const prev = nodePositions[i - 1]
    const cpX = 50
    return `${d} C ${prev.x + cpX} ${prev.y - 35}, ${pos.x - cpX} ${pos.y + 35}, ${pos.x} ${pos.y}`
  }, '')

  return (
    <div className="cm-overlay">
      <div className="cm-bg-layer cm-bg-sky" />
      <div className="cm-bg-layer cm-bg-dunes" />
      <div className="cm-bg-layer cm-bg-ground" />

      <div className="cm-container">
        {/* Title */}
        <div className="cm-banner">
          <div className="cm-banner-inner">
            <div className="cm-title">CAMPAIGN</div>
            <div className="cm-subtitle">SELECT YOUR MISSION</div>
          </div>
        </div>

        <svg className="cm-map" viewBox="0 0 400 680" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cmNodeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5a8a4a" />
              <stop offset="50%" stopColor="#3d6b2f" />
              <stop offset="100%" stopColor="#2a5020" />
            </linearGradient>
            <linearGradient id="cmNodeLocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="50%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
            <linearGradient id="cmNodeDone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6a9a5a" />
              <stop offset="100%" stopColor="#4a7a3a" />
            </linearGradient>
            <filter id="cmShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Terrain decorations */}
          <ellipse cx="80" cy="620" rx="120" ry="30" fill="#3a4a2a" opacity="0.4" />
          <ellipse cx="320" cy="550" rx="100" ry="25" fill="#3a4a2a" opacity="0.3" />
          <ellipse cx="200" cy="120" rx="150" ry="35" fill="#3a4a2a" opacity="0.3" />

          {/* Scattered rocks */}
          {[[50, 380], [340, 260], [280, 520], [90, 200]].map(([rx, ry], i) => (
            <ellipse key={i} cx={rx} cy={ry} rx={4 + i * 1.5} ry={3 + i} fill="#555" opacity="0.3" />
          ))}

          {/* Sandbags decoration */}
          <g transform="translate(60, 510)" opacity="0.4">
            {[0, 12, 24].map((ox) => (
              <rect key={ox} x={ox} y={0} width="10" height="6" rx="2" fill="#8a7a5a" stroke="#6b5a3a" strokeWidth="0.5" />
            ))}
            {[6, 18].map((ox) => (
              <rect key={ox} x={ox} y={-6} width="10" height="6" rx="2" fill="#8a7a5a" stroke="#6b5a3a" strokeWidth="0.5" />
            ))}
          </g>

          {/* Flag */}
          <g transform="translate(330, 160)" opacity="0.5">
            <line x1="0" y1="30" x2="0" y2="0" stroke="#6b5a3a" strokeWidth="1.5" />
            <polygon points="0,0 18,5 0,10" fill="#8b3030" opacity="0.8" className="cm-flag" />
          </g>

          {/* Footprints along path */}
          {nodePositions.slice(0, -1).map((pos, i) => {
            const next = nodePositions[i + 1]
            const mx = (pos.x + next.x) / 2
            const my = (pos.y + next.y) / 2
            const angle = Math.atan2(next.y - pos.y, next.x - pos.x) * 180 / Math.PI
            return (
              <g key={i} transform={`translate(${mx}, ${my}) rotate(${angle})`} opacity="0.12">
                <ellipse cx="0" cy="-3" rx="3" ry="4.5" fill="#4a3a2a" />
                <ellipse cx="0" cy="3" rx="2.5" ry="4" fill="#4a3a2a" />
              </g>
            )
          })}

          {/* World section labels */}
          {worldRegistry.worlds.map((world, wi) => {
            const worldBattles = worldRegistry.getBattlesForWorld(world.id)
            const firstIdx = allBattles.findIndex(b => b.id === worldBattles[0]?.id)
            if (firstIdx < 0) return null
            const pos = nodePositions[firstIdx]
            const icon = WORLD_ICONS[world.id] ?? ''
            return (
              <text key={world.id} x={pos.x > 200 ? 40 : 320} y={pos.y - 10}
                className="cm-world-label" textAnchor={pos.x > 200 ? 'start' : 'end'}>
                {icon} {world.name.toUpperCase()}
              </text>
            )
          })}

          {/* Dirt path */}
          <path d={pathD} fill="none" stroke="#1a1a0a" strokeWidth="22" opacity="0.3"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathD} fill="none" stroke="#5a4a30" strokeWidth="18"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathD} fill="none" stroke="#7a6a48" strokeWidth="10"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          <path d={pathD} fill="none" stroke="#8a7a55" strokeWidth="2"
            strokeDasharray="6 12" strokeLinecap="round" opacity="0.4" />

          {/* Battle nodes */}
          {allBattles.map((battle, i) => {
            const unlocked = isUnlocked(i)
            const current = isCurrent(i)
            const progress = worldProgress[battle.worldId]?.battles[battle.id]
            const completed = progress?.completed === true
            const stars = progress?.bestStars ?? 0
            const { x, y } = nodePositions[i]
            const delay = i * 0.15

            return (
              <g
                key={battle.id}
                className={`cm-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''} ${current ? 'current' : ''}`}
                style={{ animationDelay: `${delay}s` }}
                onPointerDown={() => unlocked && selectBattle(battle.id)}
              >
                {/* Ground glow */}
                {unlocked && (
                  <ellipse cx={x} cy={y + 28} rx={40} ry={8}
                    fill={current ? '#d4aa40' : '#4a8a3a'} opacity={current ? 0.2 : 0.15} />
                )}

                {/* Current level glow rings */}
                {current && unlocked && (
                  <>
                    <circle cx={x} cy={y} r={46} className="cm-glow-outer" />
                    <circle cx={x} cy={y} r={42} className="cm-glow-inner" />
                  </>
                )}

                {/* Completed sparkles */}
                {completed && (
                  <g className="cm-sparkles">
                    {[[-20, -25], [22, -20], [-18, 18], [24, 15]].map(([sx, sy], si) => (
                      <g key={si} className="cm-sparkle" style={{ animationDelay: `${si * 0.4}s` }}>
                        <line x1={x + sx - 3} y1={y + sy} x2={x + sx + 3} y2={y + sy}
                          stroke="#d4aa40" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1={x + sx} y1={y + sy - 3} x2={x + sx} y2={y + sy + 3}
                          stroke="#d4aa40" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    ))}
                  </g>
                )}

                {/* Button shadow */}
                <ellipse cx={x} cy={y + 32} rx={28} ry={6} fill="#000" opacity="0.3" />

                {/* Main button */}
                <circle cx={x} cy={y} r={30}
                  fill={unlocked ? (completed ? 'url(#cmNodeDone)' : 'url(#cmNodeGrad)') : 'url(#cmNodeLocked)'}
                  stroke={unlocked ? (current ? '#d4aa40' : '#8aaa6a') : '#444'}
                  strokeWidth={current ? 3 : 2}
                  filter="url(#cmShadow)"
                />

                {/* Inner highlight */}
                <circle cx={x} cy={y - 4} r={24}
                  fill="none"
                  stroke={unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth="1.5"
                />

                {/* Inner dark ring */}
                <circle cx={x} cy={y + 2} r={22}
                  fill={unlocked ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)'}
                />

                {/* Number or lock */}
                {unlocked ? (
                  <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle"
                    className="cm-number" style={{ fontSize: '28px' }}>
                    {i + 1}
                  </text>
                ) : (
                  <g transform={`translate(${x - 9}, ${y - 11})`}>
                    <rect x="2" y="9" width="14" height="11" rx="2" fill="#555" stroke="#666" strokeWidth="0.8" />
                    <path d="M4.5 9V6a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#666" strokeWidth="1.2" />
                  </g>
                )}

                {/* Battle name plate */}
                {unlocked && (
                  <g>
                    <rect x={x - 55} y={y + 36} width="110" height="20" rx="4"
                      fill="rgba(0,0,0,0.5)" stroke="rgba(139,170,106,0.3)" strokeWidth="0.5" />
                    <text x={x} y={y + 49} textAnchor="middle" className="cm-name">
                      {battle.name.toUpperCase()}
                    </text>
                  </g>
                )}

                {/* Stars */}
                <g transform={`translate(${x - 24}, ${y + 58})`}>
                  {[0, 1, 2].map((si) => {
                    const earned = stars > si
                    return (
                      <g key={si} transform={`translate(${si * 16}, 0)`}
                        className={earned ? 'cm-star-earned' : ''}
                        style={earned ? { animationDelay: `${0.6 + si * 0.1}s` } : {}}>
                        <polygon
                          points="8,0 10.5,5 16,5.8 12,9.5 13,15 8,12.5 3,15 4,9.5 0,5.8 5.5,5"
                          fill={earned ? '#d4aa40' : 'none'}
                          stroke={earned ? '#b8922e' : (unlocked ? '#555' : '#333')}
                          strokeWidth={earned ? 0.8 : 0.6}
                        />
                        {earned && (
                          <polygon
                            points="8,2 9.5,5.5 13,6 10.5,8.5 11,12 8,10.5 5,12 5.5,8.5 3,6 6.5,5.5"
                            fill="#ecc850" opacity="0.6"
                          />
                        )}
                      </g>
                    )
                  })}
                </g>
              </g>
            )
          })}

          {/* Compass rose */}
          <g transform="translate(350, 620)" opacity="0.2">
            <circle cx="0" cy="0" r="15" fill="none" stroke="#8a7a5a" strokeWidth="0.5" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#8a7a5a" strokeWidth="0.5" />
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#8a7a5a" strokeWidth="0.5" />
            <polygon points="0,-14 -3,-6 3,-6" fill="#8a7a5a" />
            <text x="0" y="-17" textAnchor="middle" fill="#8a7a5a" fontSize="5"
              fontFamily="'Black Ops One', sans-serif">N</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
