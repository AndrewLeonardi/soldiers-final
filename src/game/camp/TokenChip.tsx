/**
 * TokenChip — the canonical token currency icon, rendered in Three.js.
 *
 * v4. Real 3D chip geometry (rounded box + white extruded logo),
 * rendered offscreen via `chipRenderer.ts` ONCE per (count, glow)
 * variant, cached as a PNG data URL, and reused as an `<img>`.
 *
 * No per-instance WebGL — a dozen chips on screen share at most a
 * handful of underlying renders. First render runs in an effect so it
 * doesn't block initial paint; an SSR-safe 1x1 transparent placeholder
 * holds the space until the PNG is ready (usually within a frame).
 *
 * API is unchanged from v1-v3:
 *   - `size`  — bounding width in pixels
 *   - `count` — stack size (1/2/3/5/8)
 *   - `glow`  — cyan aura for hero moments
 *   - `className` — passthrough
 */

import { useEffect, useState } from 'react'
import { getChipDataUrl, chipAspect } from './chipRenderer'

interface Props {
  size?: number
  count?: number
  glow?: boolean
  className?: string
}

// 1x1 transparent PNG — used pre-render so layout doesn't jump.
const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export function TokenChip({ size = 24, count = 1, glow = false, className }: Props) {
  const [url, setUrl] = useState<string>(PLACEHOLDER)

  useEffect(() => {
    // Lazy render on mount so the initial paint isn't blocked by WebGL.
    // After the first paint for each (count, glow) pair, all future
    // mounts are synchronous from the in-memory cache.
    let cancelled = false
    const raf = requestAnimationFrame(() => {
      if (cancelled) return
      try {
        const u = getChipDataUrl({ count, glow })
        if (!cancelled) setUrl(u)
      } catch {
        // Any WebGL / render failure leaves the placeholder in place —
        // never throws into the React tree.
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [count, glow])

  const aspect = chipAspect(count)
  const width = size
  const height = Math.round(size * aspect)

  return (
    <img
      src={url}
      width={width}
      height={height}
      className={className}
      alt=""
      draggable={false}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}
