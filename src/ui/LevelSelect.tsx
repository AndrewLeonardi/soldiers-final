import { useGameStore } from '@stores/gameStore'
import { CAMPAIGN_LEVELS } from '@config/levels'
import '@styles/levelselect.css'

export function LevelSelect() {
  const phase = useGameStore((s) => s.phase)
  const campaignProgress = useGameStore((s) => s.campaignProgress)
  const selectLevel = useGameStore((s) => s.selectLevel)

  if (phase !== 'levelSelect') return null

  function isUnlocked(index: number): boolean {
    if (index === 0) return true
    const prevLevel = CAMPAIGN_LEVELS[index - 1]
    const prevProgress = campaignProgress.levels[prevLevel.id]
    return prevProgress?.completed === true && prevProgress.bestStars >= 1
  }

  function isCurrent(index: number): boolean {
    for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
      const progress = campaignProgress.levels[CAMPAIGN_LEVELS[i].id]
      if (!progress?.completed) return i === index
    }
    return index === CAMPAIGN_LEVELS.length - 1
  }

  // Node positions along a winding path (bottom to top, zigzag)
  const nodePositions = CAMPAIGN_LEVELS.map((_, i) => ({
    x: 200 + (i % 2 === 0 ? -60 : 60),
    y: 600 - i * 90,
  }))

  // Generate smooth curved path through all nodes dynamically
  const pathD = nodePositions.reduce((d, pos, i) => {
    if (i === 0) return `M ${pos.x} ${pos.y}`
    const prev = nodePositions[i - 1]
    const cpX = 50
    return `${d} C ${prev.x + cpX} ${prev.y - 35}, ${pos.x - cpX} ${pos.y + 35}, ${pos.x} ${pos.y}`
  }, '')

  return (
    <div className="ls-overlay">
      {/* Layered background for depth */}
      <div className="ls-bg-layer ls-bg-sky" />
      <div className="ls-bg-layer ls-bg-dunes" />
      <div className="ls-bg-layer ls-bg-ground" />

      <div className="ls-container">
        {/* Title banner */}
        <div className="ls-banner">
          <div className="ls-banner-inner">
            <div className="ls-title">CAMPAIGN</div>
            <div className="ls-subtitle">SELECT YOUR MISSION</div>
          </div>
        </div>

        <svg
          className="ls-map"
          viewBox="0 0 400 720"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Sandy ground gradient */}
            <radialGradient id="sandGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d4aa40" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#d4aa40" stopOpacity="0" />
            </radialGradient>
            {/* Node button gradient */}
            <linearGradient id="nodeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5a8a4a" />
              <stop offset="50%" stopColor="#3d6b2f" />
              <stop offset="100%" stopColor="#2a5020" />
            </linearGradient>
            <linearGradient id="nodeGradLocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="50%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
            <linearGradient id="nodeGradCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6a9a5a" />
              <stop offset="50%" stopColor="#4a7a3a" />
              <stop offset="100%" stopColor="#3a6a2a" />
            </linearGradient>
            {/* Drop shadow filter */}
            <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Terrain decorations ── */}

          {/* Sand dunes (background hills) */}
          <ellipse cx="80" cy="650" rx="120" ry="30" fill="#3a4a2a" opacity="0.4" />
          <ellipse cx="320" cy="620" rx="100" ry="25" fill="#3a4a2a" opacity="0.3" />
          <ellipse cx="200" cy="130" rx="150" ry="35" fill="#3a4a2a" opacity="0.3" />

          {/* Barbed wire fencing (decorative) */}
          <g opacity="0.3" stroke="#555" strokeWidth="1" fill="none">
            <line x1="30" y1="450" x2="100" y2="445" />
            <line x1="30" y1="453" x2="100" y2="448" />
            {[35, 50, 65, 80, 95].map((px) => (
              <circle key={px} cx={px} cy={447} r="2" fill="#555" />
            ))}
          </g>

          {/* Military tent (near level 2) */}
          <g transform="translate(330, 320)" opacity="0.5">
            <polygon points="0,30 20,0 40,30" fill="#5a6b4a" stroke="#4a5a3a" strokeWidth="1" />
            <line x1="20" y1="0" x2="20" y2="-5" stroke="#6b5a3a" strokeWidth="1.5" />
            <rect x="8" y="20" width="24" height="10" fill="#4a5a3a" opacity="0.5" />
          </g>

          {/* Sandbags (near level 1) */}
          <g transform="translate(60, 540)" opacity="0.4">
            {[0, 12, 24].map((ox) => (
              <rect key={ox} x={ox} y={0} width="10" height="6" rx="2" fill="#8a7a5a" stroke="#6b5a3a" strokeWidth="0.5" />
            ))}
            {[6, 18].map((ox) => (
              <rect key={ox} x={ox} y={-6} width="10" height="6" rx="2" fill="#8a7a5a" stroke="#6b5a3a" strokeWidth="0.5" />
            ))}
          </g>

          {/* Ammo crates */}
          <g transform="translate(310, 480)" opacity="0.4">
            <rect x="0" y="0" width="16" height="12" rx="1" fill="#6b4a2a" stroke="#5a3a1a" strokeWidth="0.8" />
            <line x1="2" y1="6" x2="14" y2="6" stroke="#5a3a1a" strokeWidth="0.5" />
            <rect x="18" y="3" width="14" height="10" rx="1" fill="#5a3a1a" stroke="#4a2a0a" strokeWidth="0.8" />
          </g>

          {/* Small flag (near level 3) */}
          <g transform="translate(100, 170)" opacity="0.5">
            <line x1="0" y1="30" x2="0" y2="0" stroke="#6b5a3a" strokeWidth="1.5" />
            <polygon points="0,0 18,5 0,10" fill="#8b3030" opacity="0.8" className="ls-flag" />
          </g>

          {/* Scattered rocks */}
          {[[50, 380], [340, 260], [280, 550], [90, 250]].map(([rx, ry], i) => (
            <ellipse key={i} cx={rx} cy={ry} rx={4 + i * 1.5} ry={3 + i} fill="#555" opacity="0.3" />
          ))}

          {/* Footprints along path */}
          {[[170, 480], [200, 440], [230, 400], [250, 330], [230, 290], [200, 250]].map(([fx, fy], i) => (
            <g key={i} transform={`translate(${fx}, ${fy}) rotate(${-30 + i * 10})`} opacity="0.12">
              <ellipse cx="0" cy="0" rx="3" ry="4.5" fill="#4a3a2a" />
              <ellipse cx="4" cy="-1" rx="2.5" ry="4" fill="#4a3a2a" />
            </g>
          ))}

          {/* ── Dirt path (winding trail between levels) ── */}

          {/* Path shadow */}
          <path d={pathD} fill="none" stroke="#1a1a0a" strokeWidth="22" opacity="0.3"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Path body (wide dirt road) */}
          <path d={pathD} fill="none" stroke="#5a4a30" strokeWidth="18"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Path highlight (lighter center) */}
          <path d={pathD} fill="none" stroke="#7a6a48" strokeWidth="10"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />

          {/* Path dashes (track marks) */}
          <path d={pathD} fill="none" stroke="#8a7a55" strokeWidth="2"
            strokeDasharray="6 12" strokeLinecap="round" opacity="0.4" />

          {/* ── Level nodes ── */}
          {CAMPAIGN_LEVELS.map((level, i) => {
            const unlocked = isUnlocked(i)
            const current = isCurrent(i)
            const progress = campaignProgress.levels[level.id]
            const { x, y } = nodePositions[i]
            const stars = progress?.bestStars ?? 0
            const delay = i * 0.15

            return (
              <g
                key={level.id}
                className={`ls-node ${unlocked ? 'unlocked' : 'locked'} ${progress?.completed ? 'completed' : ''} ${current ? 'current' : ''}`}
                style={{ animationDelay: `${delay}s` }}
                onPointerDown={() => unlocked && selectLevel(level.id)}
              >
                {/* Ground glow under node */}
                {unlocked && (
                  <ellipse cx={x} cy={y + 28} rx={40} ry={8}
                    fill={current ? '#d4aa40' : '#4a8a3a'} opacity={current ? 0.2 : 0.15} />
                )}

                {/* Outer glow ring for current level */}
                {current && unlocked && (
                  <>
                    <circle cx={x} cy={y} r={46} className="ls-glow-outer" />
                    <circle cx={x} cy={y} r={42} className="ls-glow-inner" />
                  </>
                )}

                {/* Completed sparkles */}
                {progress?.completed && (
                  <g className="ls-sparkles">
                    {[[-20, -25], [22, -20], [-18, 18], [24, 15]].map(([sx, sy], si) => (
                      <g key={si} className="ls-sparkle" style={{ animationDelay: `${si * 0.4}s` }}>
                        <line x1={x + sx - 3} y1={y + sy} x2={x + sx + 3} y2={y + sy}
                          stroke="#d4aa40" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1={x + sx} y1={y + sy - 3} x2={x + sx} y2={y + sy + 3}
                          stroke="#d4aa40" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    ))}
                  </g>
                )}

                {/* Button shadow (3D depth) */}
                <ellipse cx={x} cy={y + 32} rx={28} ry={6} fill="#000" opacity="0.3" />

                {/* Main button - beveled 3D circle */}
                <circle cx={x} cy={y} r={30}
                  fill={unlocked ? (progress?.completed ? 'url(#nodeGradCompleted)' : 'url(#nodeGrad)') : 'url(#nodeGradLocked)'}
                  stroke={unlocked ? (current ? '#d4aa40' : '#8aaa6a') : '#444'}
                  strokeWidth={current ? 3 : 2}
                  filter="url(#nodeShadow)"
                />

                {/* Inner bevel highlight (top edge catch) */}
                <circle cx={x} cy={y - 4} r={24}
                  fill="none"
                  stroke={unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth="1.5"
                  clipPath={`circle(26px at ${x}px ${y - 8}px)`}
                />

                {/* Inner dark ring */}
                <circle cx={x} cy={y + 2} r={22}
                  fill={unlocked ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)'}
                  stroke="none"
                />

                {/* Level number or lock */}
                {unlocked ? (
                  <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle"
                    className="ls-number"
                    style={{ fontSize: '28px' }}>
                    {i + 1}
                  </text>
                ) : (
                  <g transform={`translate(${x - 9}, ${y - 11})`}>
                    <rect x="2" y="9" width="14" height="11" rx="2" fill="#555" stroke="#666" strokeWidth="0.8" />
                    <path d="M4.5 9V6a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#666" strokeWidth="1.2" />
                  </g>
                )}

                {/* Level name plate */}
                {unlocked && (
                  <g>
                    <rect x={x - 55} y={y + 36} width="110" height="20" rx="4"
                      fill="rgba(0,0,0,0.5)" stroke="rgba(139,170,106,0.3)" strokeWidth="0.5" />
                    <text x={x} y={y + 49} textAnchor="middle" className="ls-name">
                      {level.name.toUpperCase()}
                    </text>
                  </g>
                )}

                {/* Stars row */}
                <g transform={`translate(${x - 24}, ${y + 58})`}>
                  {[0, 1, 2].map((si) => {
                    const earned = stars > si
                    return (
                      <g key={si} transform={`translate(${si * 16}, 0)`}
                        className={earned ? 'ls-star-earned' : ''}
                        style={earned ? { animationDelay: `${0.6 + si * 0.1}s` } : {}}>
                        <polygon
                          points="8,0 10.5,5 16,5.8 12,9.5 13,15 8,12.5 3,15 4,9.5 0,5.8 5.5,5"
                          fill={earned ? '#d4aa40' : 'none'}
                          stroke={earned ? '#b8922e' : (unlocked ? '#555' : '#333')}
                          strokeWidth={earned ? 0.8 : 0.6}
                        />
                        {/* Star highlight */}
                        {earned && (
                          <polygon
                            points="8,2 9.5,5.5 13,6 10.5,8.5 11,12 8,10.5 5,12 5.5,8.5 3,6 6.5,5.5"
                            fill="#ecc850"
                            opacity="0.6"
                          />
                        )}
                      </g>
                    )
                  })}
                </g>
              </g>
            )
          })}

          {/* ── Compass rose (bottom-right decoration) ── */}
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
