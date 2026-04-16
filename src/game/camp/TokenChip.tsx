/**
 * TokenChip — isometric stacked slab token icon.
 *
 * v3. Every chip in the stack is a complete slab with its own visible
 * top face, rounded front edge, and side wall band. Stacks read as
 * genuine chip towers — each chip's top face peeks above the one in
 * front, creating the "stepped" look from the reference render.
 *
 * Crisp edges — no Gaussian blur filters. The `glow` prop adds a cyan
 * `feDropShadow` beneath the whole tower, never blurring the shape itself.
 *
 * Props:
 *   - `size`  — bounding width in pixels (default 24)
 *   - `count` — stack size (1 / 2 / 3 / 5 / 8+). Back chips render fully
 *               with their own top face and side wall.
 *   - `glow`  — cyan drop-shadow aura for hero moments.
 *   - `className` — passes through.
 */

import { useId } from 'react'

interface Props {
  size?: number
  count?: number
  glow?: boolean
  className?: string
}

// Logical SVG units. One chip spans CHIP_W wide by (TOP_H + SIDE_H) tall.
const CHIP_W = 56
const TOP_H = 42       // foreshortened top face (reads as angled 3D surface)
const SIDE_H = 14      // visible side wall / thickness
const CHIP_H = TOP_H + SIDE_H  // 56 — total per-chip tile (matches width for balanced silhouette)
const STACK_STEP = 18  // vertical distance each chip is offset in a stack
                        // (smaller than CHIP_H so chips overlap — upper chip covers top of lower chip's top face)

export function TokenChip({ size = 24, count = 1, glow = false, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const stack = Math.max(1, Math.min(9, Math.floor(count)))

  // Total stack height = first chip full height + (count-1) steps on top.
  // But since we render back chips first with higher y, the topmost chip
  // sits at y=0 and each back chip is at y += STACK_STEP. The tallest
  // point is the back chip's bottom = (stack-1)*STACK_STEP + CHIP_H.
  const vbW = CHIP_W
  const vbH = CHIP_H + (stack - 1) * STACK_STEP

  const renderedW = size
  const renderedH = (size / CHIP_W) * vbH

  const topGradId = `chipTop-${uid}`
  const sideGradId = `chipSide-${uid}`
  const topBevelId = `chipBevel-${uid}`
  const rightRimId = `chipRightRim-${uid}`
  const topRimId = `chipTopRim-${uid}`
  const coreGlowId = `chipCoreGlow-${uid}`
  const dropShadowId = `chipDrop-${uid}`

  /** Render ONE full chip (top face + side wall + highlights + optional motif). */
  const renderChip = (key: string, yOffset: number, showMotif: boolean) => {
    return (
      <g key={key} transform={`translate(0 ${yOffset})`}>
        {/* ── Side wall (thickness band below the top face) ──
            Drawn FIRST so top face overlays it cleanly. Slight inset from
            the edges so the top face visually wraps over a rounded corner. */}
        <path
          d={`
            M 3 ${TOP_H - 4}
            L ${CHIP_W - 3} ${TOP_H - 4}
            L ${CHIP_W - 3} ${TOP_H + SIDE_H - 5}
            Q ${CHIP_W - 3} ${TOP_H + SIDE_H} ${CHIP_W - 8} ${TOP_H + SIDE_H}
            L 8 ${TOP_H + SIDE_H}
            Q 3 ${TOP_H + SIDE_H} 3 ${TOP_H + SIDE_H - 5}
            Z
          `}
          fill={`url(#${sideGradId})`}
          stroke="rgba(0,0,0,0.9)"
          strokeWidth="0.8"
        />
        {/* Right-side rim highlight catches upper-right light */}
        <path
          d={`
            M ${CHIP_W - 3.2} ${TOP_H - 2}
            L ${CHIP_W - 3.2} ${TOP_H + SIDE_H - 6}
          `}
          stroke={`url(#${rightRimId})`}
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* ── Top face ──
            The main chip surface. Slight horizontal elongation makes it
            read as an isometric top — a real square foreshortened. */}
        <rect
          x="0.5" y="0.5"
          width={CHIP_W - 1} height={TOP_H - 1}
          rx="7" ry="7"
          fill={`url(#${topGradId})`}
          stroke="rgba(120,200,230,0.55)"
          strokeWidth="1.1"
        />
        {/* Top-face diagonal highlight — upper-left quadrant brighter,
            simulating light from upper-left. */}
        <rect
          x="0.5" y="0.5"
          width={CHIP_W - 1} height={TOP_H - 1}
          rx="7" ry="7"
          fill={`url(#${topBevelId})`}
          pointerEvents="none"
        />
        {/* Top front edge highlight — thin bright line along the crease
            between top face and side wall, where light catches. */}
        <path
          d={`M 7 ${TOP_H - 2} Q ${CHIP_W / 2} ${TOP_H - 0.5} ${CHIP_W - 7} ${TOP_H - 2}`}
          stroke={`url(#${topRimId})`}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* ── Circuit motif ──
            Always rendered on the top face so every chip in the stack
            shows the logo peeking above. Scaled to top face dimensions. */}
        {showMotif && (() => {
          const cx = CHIP_W / 2
          const cy = TOP_H / 2 - 0.5
          const core = Math.min(TOP_H, CHIP_W) * 0.4
          const coreX = cx - core / 2
          const coreY = cy - core / 2
          return (
            <>
              {/* Inner cyan halo */}
              <rect
                x={coreX - 2.5} y={coreY - 2.5}
                width={core + 5} height={core + 5}
                rx="3" ry="3"
                fill={`url(#${coreGlowId})`}
              />
              {/* Core */}
              <rect
                x={coreX} y={coreY}
                width={core} height={core}
                rx="2" ry="2"
                fill="#0e1b2c"
                stroke="#6ed8e8"
                strokeWidth="1.1"
              />
              {/* Inner dots */}
              <circle cx={cx} cy={cy} r="1.6" fill="#6ed8e8" />
              <circle cx={cx - 4} cy={cy - 4} r="0.85" fill="#6ed8e8" opacity="0.78" />
              <circle cx={cx + 4} cy={cy - 4} r="0.85" fill="#6ed8e8" opacity="0.78" />
              <circle cx={cx - 4} cy={cy + 4} r="0.85" fill="#6ed8e8" opacity="0.78" />
              <circle cx={cx + 4} cy={cy + 4} r="0.85" fill="#6ed8e8" opacity="0.78" />
              {/* Radiating pins — N / E / S / W */}
              <g stroke="#6ed8e8" strokeWidth="1.6" strokeLinecap="round">
                <line x1={cx} y1={coreY - 1} x2={cx} y2={coreY - 5} />
                <line x1={cx} y1={coreY + core + 1} x2={cx} y2={coreY + core + 5} />
                <line x1={coreX - 1} y1={cy} x2={coreX - 5} y2={cy} />
                <line x1={coreX + core + 1} y1={cy} x2={coreX + core + 5} y2={cy} />
              </g>
              {/* Diagonal pins */}
              <g stroke="#6ed8e8" strokeWidth="1.2" strokeLinecap="round" opacity="0.68">
                <line x1={coreX} y1={coreY} x2={coreX - 3.2} y2={coreY - 3.2} />
                <line x1={coreX + core} y1={coreY} x2={coreX + core + 3.2} y2={coreY - 3.2} />
                <line x1={coreX} y1={coreY + core} x2={coreX - 3.2} y2={coreY + core + 3.2} />
                <line x1={coreX + core} y1={coreY + core} x2={coreX + core + 3.2} y2={coreY + core + 3.2} />
              </g>
            </>
          )
        })()}
      </g>
    )
  }

  // Render BACK-TO-FRONT so the top-most (front) chip paints last.
  // Back chip has highest y-offset (lowest on screen);
  // front chip sits at y=0 (highest on screen).
  const layers = []
  for (let i = stack - 1; i >= 0; i--) {
    const yOff = i * STACK_STEP
    layers.push(renderChip(`chip-${i}`, yOff, true))
  }

  return (
    <svg
      className={className}
      width={renderedW}
      height={renderedH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        overflow: 'visible',
        // Glow moments: cyan aura under the whole tower.
        // Non-glow: NO filter — keeps edges crisp at every size.
        filter: glow ? 'drop-shadow(0 0 8px rgba(77,232,255,0.55))' : undefined,
      }}
    >
      <defs>
        {/* Top face: upper edge brighter (catches light), dark toward bottom */}
        <linearGradient id={topGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#33517a" />
          <stop offset="55%"  stopColor="#1a2b44" />
          <stop offset="100%" stopColor="#0d1a2a" />
        </linearGradient>
        {/* Side wall: darker — reads as the shadowed side of a physical object */}
        <linearGradient id={sideGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14212f" />
          <stop offset="45%"  stopColor="#070e18" />
          <stop offset="100%" stopColor="#020509" />
        </linearGradient>
        {/* Upper-left soft highlight on the top face */}
        <radialGradient id={topBevelId} cx="0.28" cy="0.18" r="0.9">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.3)" />
          <stop offset="65%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Right-side rim light */}
        <linearGradient id={rightRimId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(140,210,240,0.85)" />
          <stop offset="100%" stopColor="rgba(80,140,180,0)" />
        </linearGradient>
        {/* Bright top-front edge (the "seam" where top meets side) */}
        <linearGradient id={topRimId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="rgba(160,220,240,0)" />
          <stop offset="50%" stopColor="rgba(180,230,250,0.9)" />
          <stop offset="100%" stopColor="rgba(160,220,240,0)" />
        </linearGradient>
        {/* Circuit halo */}
        <radialGradient id={coreGlowId} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"  stopColor="rgba(110,216,232,0.85)" />
          <stop offset="55%" stopColor="rgba(110,216,232,0.2)" />
          <stop offset="100%" stopColor="rgba(110,216,232,0)" />
        </radialGradient>
        {/* Unused filter kept for back-compat reference; glow uses CSS drop-shadow */}
        <filter id={dropShadowId} />
      </defs>

      {layers}
    </svg>
  )
}
