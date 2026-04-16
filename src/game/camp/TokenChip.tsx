/**
 * TokenChip — the canonical token currency icon.
 *
 * Redesigned as an isometric-style stacked slab to match the dark-navy
 * chip reference: a foreshortened top face with the circuit motif, plus
 * a visible front bevel band showing physical thickness, plus an inset
 * right-edge highlight for volume. Stacks are TRUE chip towers —
 * additional chips sit beneath the top one, only their thickness band
 * peeks out, reading as a real stack of slabs.
 *
 * Props:
 *   - `size`  — bounding width in pixels (default 24)
 *   - `count` — stack size (1 / 2 / 3 / 5 / 8). Each back chip adds an
 *               extra "band" of visible thickness below the top chip.
 *   - `glow`  — adds an outer cyan aura + drop shadow for hero moments.
 *   - `className` — passes through.
 */

import { useId } from 'react'

interface Props {
  size?: number
  count?: number
  glow?: boolean
  className?: string
}

// ── SVG-unit geometry ───────────────────────────────────────────────────
// All sizes are in logical SVG units; the outer <svg> scales to `size`.
const CHIP_W = 44           // logical chip width
const TOP_H = 30            // foreshortened top face (wider than tall → reads isometric)
const RIM_H = 6             // thickness band visible below the top face
const CHIP_H = TOP_H + RIM_H  // 36 per chip slab
const STACK_STEP = RIM_H + 1  // vertical distance each back chip adds to the tower

export function TokenChip({ size = 24, count = 1, glow = false, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const stack = Math.max(1, Math.min(9, Math.floor(count)))

  const glowPad = glow ? 6 : 0
  // Viewport: chip width + glow margins, chip height + (stack-1) bands + margins.
  const vbW = CHIP_W + glowPad * 2
  const vbH = CHIP_H + (stack - 1) * STACK_STEP + glowPad * 2

  const renderedW = size
  const renderedH = (size / CHIP_W) * vbH

  const topGradId = `chipTop-${uid}`
  const rimGradId = `chipRim-${uid}`
  const topBevelId = `chipBevel-${uid}`
  const coreGlowId = `chipCoreGlow-${uid}`
  const rightBevelId = `chipRightBevel-${uid}`
  const auraId = `chipAura-${uid}`
  const dropShadowId = `chipDrop-${uid}`

  // Render BACK-to-FRONT. The front chip (index 0) sits highest visually
  // (lowest y), with the thickness band at its base; back chips contribute
  // only their thickness band peeking below the one in front.
  const layers = []
  for (let i = stack - 1; i >= 0; i--) {
    // Each chip's BASE sits at this y. Front chip's base = top of viewport + glowPad.
    // Back chips sit further DOWN (higher y) so their bands show underneath.
    const chipY = glowPad + i * STACK_STEP
    const isFront = i === 0

    if (!isFront) {
      // Back chips: render ONLY the thickness band peeking below the chip in front.
      const bandY = chipY + TOP_H + (stack - 1 - i) * STACK_STEP
      layers.push(
        <g key={`back-${i}`} opacity={0.92 - (stack - 1 - i) * 0.04}>
          <rect
            x={glowPad + 1} y={bandY}
            width={CHIP_W - 2} height={RIM_H}
            rx="2.5" ry="2.5"
            fill={`url(#${rimGradId})`}
            stroke="rgba(10,20,32,0.9)" strokeWidth="0.6"
          />
        </g>,
      )
    } else {
      // Front chip — full slab with motif.
      layers.push(
        <g key="front" transform={`translate(${glowPad} ${chipY})`}>
          {/* Thickness band (sits below the top face, gives chip its depth). */}
          <rect
            x="1" y={TOP_H - 2}
            width={CHIP_W - 2} height={RIM_H + 2}
            rx="3" ry="3"
            fill={`url(#${rimGradId})`}
            stroke="rgba(10,20,32,0.95)" strokeWidth="0.8"
          />
          {/* Right-edge bevel inside the rim — the specular highlight of
              the chip's right wall when the light hits from upper-left. */}
          <rect
            x={CHIP_W - 5} y={TOP_H - 1}
            width="3" height={RIM_H}
            rx="1" ry="1"
            fill={`url(#${rightBevelId})`}
            opacity="0.55"
          />

          {/* Top face */}
          <rect
            x="0" y="0"
            width={CHIP_W} height={TOP_H}
            rx="4" ry="4"
            fill={`url(#${topGradId})`}
            stroke="rgba(90,180,225,0.55)" strokeWidth="1.1"
          />
          {/* Top bevel highlight (upper-left quadrant, simulated light) */}
          <rect
            x="0" y="0"
            width={CHIP_W} height={TOP_H}
            rx="4" ry="4"
            fill={`url(#${topBevelId})`}
            pointerEvents="none"
          />

          {/* Circuit motif centered on the top face.
              Layout: soft cyan halo, core square, pin dots at corners,
              radiating pin segments (N/E/S/W + 4 diagonals). */}
          {(() => {
            const cx = CHIP_W / 2
            const cy = TOP_H / 2
            const coreSize = Math.min(TOP_H, CHIP_W) * 0.46
            const coreX = cx - coreSize / 2
            const coreY = cy - coreSize / 2
            return (
              <>
                {/* Inner cyan halo */}
                <rect
                  x={coreX - 3} y={coreY - 3}
                  width={coreSize + 6} height={coreSize + 6}
                  rx="3" ry="3"
                  fill={`url(#${coreGlowId})`}
                />
                {/* Core square */}
                <rect
                  x={coreX} y={coreY}
                  width={coreSize} height={coreSize}
                  rx="1.5" ry="1.5"
                  fill="#0d1a28"
                  stroke="#5ecfe0" strokeWidth="0.9"
                />
                {/* Inner 4 dots */}
                <circle cx={cx} cy={cy} r="1.2" fill="#5ecfe0" />
                <circle cx={cx - 3.5} cy={cy - 3.5} r="0.6" fill="#5ecfe0" opacity="0.7" />
                <circle cx={cx + 3.5} cy={cy - 3.5} r="0.6" fill="#5ecfe0" opacity="0.7" />
                <circle cx={cx - 3.5} cy={cy + 3.5} r="0.6" fill="#5ecfe0" opacity="0.7" />
                <circle cx={cx + 3.5} cy={cy + 3.5} r="0.6" fill="#5ecfe0" opacity="0.7" />
                {/* Radiating pins */}
                <g stroke="#5ecfe0" strokeWidth="1.3" strokeLinecap="round" opacity="0.9">
                  <line x1={cx} y1={coreY - 1} x2={cx} y2={coreY - 4} />
                  <line x1={cx} y1={coreY + coreSize + 1} x2={cx} y2={coreY + coreSize + 4} />
                  <line x1={coreX - 1} y1={cy} x2={coreX - 4} y2={cy} />
                  <line x1={coreX + coreSize + 1} y1={cy} x2={coreX + coreSize + 4} y2={cy} />
                </g>
                <g stroke="#4de8ff" strokeWidth="0.9" strokeLinecap="round" opacity="0.55">
                  <line x1={coreX - 1} y1={coreY - 1} x2={coreX - 3} y2={coreY - 3} />
                  <line x1={coreX + coreSize + 1} y1={coreY - 1} x2={coreX + coreSize + 3} y2={coreY - 3} />
                  <line x1={coreX - 1} y1={coreY + coreSize + 1} x2={coreX - 3} y2={coreY + coreSize + 3} />
                  <line x1={coreX + coreSize + 1} y1={coreY + coreSize + 1} x2={coreX + coreSize + 3} y2={coreY + coreSize + 3} />
                </g>
              </>
            )
          })()}
        </g>,
      )
    }
  }

  return (
    <svg
      className={className}
      width={renderedW}
      height={renderedH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      <defs>
        {/* Top face gradient — bright on top edge (catches the light),
            dark toward the bottom of the top face. */}
        <linearGradient id={topGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2f486a" />
          <stop offset="45%"  stopColor="#1a2a42" />
          <stop offset="100%" stopColor="#0b172a" />
        </linearGradient>
        {/* Rim / thickness gradient — darker, reads as the physical
            "side" of the chip. Catches a tiny highlight at the top edge. */}
        <linearGradient id={rimGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a2738" />
          <stop offset="25%"  stopColor="#0c1626" />
          <stop offset="100%" stopColor="#050a12" />
        </linearGradient>
        {/* Right-edge bevel strip — subtle blue rim light. */}
        <linearGradient id={rightBevelId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(120,200,240,0.55)" />
          <stop offset="100%" stopColor="rgba(80,140,180,0)" />
        </linearGradient>
        {/* Top-face highlight — soft upper-left light spill. */}
        <radialGradient id={topBevelId} cx="0.28" cy="0.2" r="0.85">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.28)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Center circuit halo. */}
        <radialGradient id={coreGlowId} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"  stopColor="rgba(77,232,255,0.8)" />
          <stop offset="55%" stopColor="rgba(77,232,255,0.18)" />
          <stop offset="100%" stopColor="rgba(77,232,255,0)" />
        </radialGradient>
        {glow && (
          <>
            <radialGradient id={auraId} cx="0.5" cy="0.5" r="0.6">
              <stop offset="0%"  stopColor="rgba(77,232,255,0.55)" />
              <stop offset="70%" stopColor="rgba(77,232,255,0)" />
            </radialGradient>
            <filter id={dropShadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" />
            </filter>
          </>
        )}
      </defs>

      {glow && (
        <rect x="0" y="0" width={vbW} height={vbH} fill={`url(#${auraId})`} />
      )}

      {glow ? <g filter={`url(#${dropShadowId})`}>{layers}</g> : layers}
    </svg>
  )
}
