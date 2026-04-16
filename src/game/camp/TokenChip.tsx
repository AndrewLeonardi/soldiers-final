/**
 * TokenChip — the canonical token currency icon.
 *
 * Production token-design sprint. Replaces the flat `TokenIcon` with a
 * 3D-feeling SVG chip: dark navy body, top bevel highlight, bottom
 * shadow, teal chip motif glowing from the center. Scales cleanly from
 * inline (12px) to hero (48-60px).
 *
 * Props:
 *   - `size`  — bounding width in pixels (default 24)
 *   - `count` — stack size (1 / 2 / 3 / 5 / 8). Back chips offset down-right
 *               with reduced opacity. Default 1.
 *   - `glow`  — adds an outer cyan aura + drop shadow for hero moments
 *               (Welcome, Daily, HUD). Default false.
 *   - `className` — passes through for custom styling.
 *
 * The SVG uses a unique per-instance id suffix so gradients + filters
 * don't collide when multiple chips render on the same page.
 */

import { useId } from 'react'

interface Props {
  size?: number
  count?: number
  glow?: boolean
  className?: string
}

// Logical chip body is 40x40 in SVG units. The outer viewBox stretches
// to accommodate the stack offset (6px down, 3px right per back chip).
const CHIP_UNITS = 40
const STACK_OFFSET_Y = 6
const STACK_OFFSET_X = 3

export function TokenChip({ size = 24, count = 1, glow = false, className }: Props) {
  const uid = useId().replace(/:/g, '') // useId returns values like ":r0:"; strip colons for safe SVG ids
  const stack = Math.max(1, Math.min(9, Math.floor(count)))
  // Reserve extra SVG space for the stack, plus glow padding if needed.
  const glowPad = glow ? 6 : 0
  const vbW = CHIP_UNITS + STACK_OFFSET_X * (stack - 1) + glowPad * 2
  const vbH = CHIP_UNITS + STACK_OFFSET_Y * (stack - 1) + glowPad * 2

  // Height scales proportionally so the top-front chip stays crisp.
  const renderedW = size + (size / CHIP_UNITS) * (STACK_OFFSET_X * (stack - 1) + glowPad * 2)
  const renderedH = size + (size / CHIP_UNITS) * (STACK_OFFSET_Y * (stack - 1) + glowPad * 2)

  const bodyGradId = `chipBody-${uid}`
  const bevelGradId = `chipBevel-${uid}`
  const shadowGradId = `chipShadow-${uid}`
  const coreGlowId = `chipCoreGlow-${uid}`
  const auraId = `chipAura-${uid}`
  const dropShadowId = `chipDrop-${uid}`

  // Render each chip layer from BACK to FRONT.
  const chips = []
  for (let i = stack - 1; i >= 0; i--) {
    const dx = glowPad + STACK_OFFSET_X * i
    const dy = glowPad + STACK_OFFSET_Y * i
    const opacity = i === 0 ? 1 : 0.9 - (stack - 1 - i) * 0.05
    chips.push(
      <g key={i} transform={`translate(${dx} ${dy})`} opacity={opacity}>
        {/* Chip body */}
        <rect x="0" y="0" width={CHIP_UNITS} height={CHIP_UNITS} rx="5" ry="5"
              fill={`url(#${bodyGradId})`} stroke="rgba(90,180,225,0.55)" strokeWidth="1.2" />
        {/* Top bevel highlight */}
        <rect x="0" y="0" width={CHIP_UNITS} height={CHIP_UNITS} rx="5" ry="5"
              fill={`url(#${bevelGradId})`} pointerEvents="none" />
        {/* Bottom shadow */}
        <rect x="0" y="0" width={CHIP_UNITS} height={CHIP_UNITS} rx="5" ry="5"
              fill={`url(#${shadowGradId})`} pointerEvents="none" />

        {/* Only the FRONT chip shows the full circuit motif; back chips
            show a dimmed version so the stack still reads as chips. */}
        {i === 0 ? (
          <>
            {/* Teal inner glow behind the core */}
            <rect x="8" y="8" width="24" height="24" rx="3" ry="3"
                  fill={`url(#${coreGlowId})`} />
            {/* Core square */}
            <rect x="13" y="13" width="14" height="14" rx="1.5" ry="1.5"
                  fill="#0d1a28" stroke="#5ecfe0" strokeWidth="1" />
            {/* Inner dot cluster (4-point motif) */}
            <circle cx="20" cy="20" r="1.4" fill="#5ecfe0" />
            <circle cx="17" cy="17" r="0.7" fill="#5ecfe0" opacity="0.7" />
            <circle cx="23" cy="17" r="0.7" fill="#5ecfe0" opacity="0.7" />
            <circle cx="17" cy="23" r="0.7" fill="#5ecfe0" opacity="0.7" />
            <circle cx="23" cy="23" r="0.7" fill="#5ecfe0" opacity="0.7" />
            {/* Radiating pin segments (8 — N/E/S/W + diagonals) */}
            <g stroke="#5ecfe0" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
              <line x1="20" y1="7"  x2="20" y2="12" />
              <line x1="20" y1="28" x2="20" y2="33" />
              <line x1="7"  y1="20" x2="12" y2="20" />
              <line x1="28" y1="20" x2="33" y2="20" />
            </g>
            <g stroke="#4de8ff" strokeWidth="1" strokeLinecap="round" opacity="0.55">
              <line x1="10" y1="10" x2="13" y2="13" />
              <line x1="30" y1="10" x2="27" y2="13" />
              <line x1="10" y1="30" x2="13" y2="27" />
              <line x1="30" y1="30" x2="27" y2="27" />
            </g>
          </>
        ) : (
          // Back-chip simplified marking: just the central glow + core outline.
          <>
            <rect x="8" y="8" width="24" height="24" rx="3" ry="3"
                  fill={`url(#${coreGlowId})`} opacity="0.6" />
            <rect x="13" y="13" width="14" height="14" rx="1.5" ry="1.5"
                  fill="#0d1a28" stroke="rgba(94,207,224,0.5)" strokeWidth="0.8" />
          </>
        )}
      </g>,
    )
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
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a4260" />
          <stop offset="45%"  stopColor="#1c2a3e" />
          <stop offset="100%" stopColor="#0a1320" />
        </linearGradient>
        <radialGradient id={bevelGradId} cx="0.3" cy="0.2" r="0.8">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.25)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={shadowGradId} cx="0.5" cy="1" r="0.75">
          <stop offset="0%"  stopColor="rgba(0,0,0,0.45)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.1)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={coreGlowId} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%"  stopColor="rgba(77,232,255,0.75)" />
          <stop offset="60%" stopColor="rgba(77,232,255,0.15)" />
          <stop offset="100%" stopColor="rgba(77,232,255,0)" />
        </radialGradient>
        {glow && (
          <>
            <radialGradient id={auraId} cx="0.5" cy="0.5" r="0.55">
              <stop offset="0%"  stopColor="rgba(77,232,255,0.55)" />
              <stop offset="70%" stopColor="rgba(77,232,255,0)" />
            </radialGradient>
            <filter id={dropShadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </>
        )}
      </defs>

      {/* Outer aura when glow=true. Sits under everything. */}
      {glow && (
        <rect x="0" y="0" width={vbW} height={vbH} fill={`url(#${auraId})`} />
      )}

      {glow ? <g filter={`url(#${dropShadowId})`}>{chips}</g> : chips}
    </svg>
  )
}
