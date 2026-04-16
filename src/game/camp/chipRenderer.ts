/**
 * chipRenderer — offscreen Three.js renderer for the TokenChip icon.
 *
 * Renders a real 3D isometric chip stack once per (count, glow) variant,
 * captures the result as a PNG data URL, and caches it. TokenChip.tsx
 * then uses the cached URL as an `<img>` source — so there's only ever
 * a handful of WebGL renders (one per unique chip variant), even if
 * hundreds of chips appear on screen.
 *
 * This is what matches the dark-navy isometric reference image with
 * the chip logo on top: real metallic PBR material, real lighting
 * from upper-left, real rounded box geometry with beveled edges.
 */

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// ── Cache ───────────────────────────────────────────────────────────────
// Keyed by `${count}-${glow}`. Populated lazily on first access.
const cache = new Map<string, string>()

export interface ChipVariantKey {
  count: number
  glow: boolean
}

function cacheKey(v: ChipVariantKey): string {
  return `${v.count}-${v.glow ? 1 : 0}`
}

// ── Geometry helpers ────────────────────────────────────────────────────

/** Build a single chip (body + logo geometry) as a centered Group. */
function buildChipMesh(): THREE.Group {
  const g = new THREE.Group()

  // ── Chip body: rounded cuboid ──
  // Slightly taller depth (y) than logo scale suggests, to feel chunky.
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(1.6, 0.48, 1.6, 6, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x0e1a2d,
      metalness: 0.55,
      roughness: 0.42,
    }),
  )
  g.add(body)

  // A very subtle cyan emissive rim on the side walls for game-y read.
  // Accomplished via a second, slightly larger hollow frame. Actually
  // simpler: set a small `emissive` on the main body — it lifts the
  // blacks without blowing out the top.
  ;(body.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x0a1220)
  ;(body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7

  // ── Chip logo (white, sits on top face) ──
  const logoMat = new THREE.MeshStandardMaterial({
    color: 0xf6f9ff,
    emissive: 0xe4ecff,
    emissiveIntensity: 0.35,
    metalness: 0.15,
    roughness: 0.55,
  })
  const logoY = 0.24 + 0.02 // slightly above top face

  // Central core (the microchip body)
  const core = new THREE.Mesh(
    new RoundedBoxGeometry(0.55, 0.06, 0.55, 3, 0.04),
    logoMat,
  )
  core.position.y = logoY
  g.add(core)

  // Dark indent in the core (the "die" cavity)
  const indent = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.04, 0.24, 3, 0.015),
    new THREE.MeshStandardMaterial({
      color: 0x091121,
      metalness: 0.4,
      roughness: 0.6,
    }),
  )
  indent.position.y = logoY + 0.032
  g.add(indent)

  // Pins — 3 per side (12 total). Small flat rectangles sticking out.
  const pinGeo = new RoundedBoxGeometry(0.08, 0.05, 0.16, 2, 0.015)
  const pinDist = 0.52   // distance from center to pin
  const pinOff = 0.2     // lateral offset along the side (-pinOff, 0, +pinOff)
  const pinYPositions = [-pinOff, 0, pinOff]

  // +Z side (front) and -Z side (back): pins run along X
  for (const z of [-pinDist, pinDist]) {
    for (const x of pinYPositions) {
      const pin = new THREE.Mesh(pinGeo, logoMat)
      pin.position.set(x, logoY, z)
      g.add(pin)
    }
  }
  // +X side (right) and -X side (left): pins are rotated 90°, run along Z
  const pinGeoSide = new RoundedBoxGeometry(0.16, 0.05, 0.08, 2, 0.015)
  for (const x of [-pinDist, pinDist]) {
    for (const z of pinYPositions) {
      const pin = new THREE.Mesh(pinGeoSide, logoMat)
      pin.position.set(x, logoY, z)
      g.add(pin)
    }
  }

  return g
}

// ── Renderer pool ──────────────────────────────────────────────────────
// One shared hidden canvas. Reused for every variant render.
let _canvas: HTMLCanvasElement | null = null
let _renderer: THREE.WebGLRenderer | null = null

function getRenderer(width: number, height: number): { renderer: THREE.WebGLRenderer; canvas: HTMLCanvasElement } {
  if (!_canvas || !_renderer) {
    _canvas = document.createElement('canvas')
    _renderer = new THREE.WebGLRenderer({
      canvas: _canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    _renderer.setPixelRatio(2)
  }
  _canvas.width = width
  _canvas.height = height
  _renderer.setSize(width, height, false)
  return { renderer: _renderer, canvas: _canvas }
}

// ── Main entry ─────────────────────────────────────────────────────────

/**
 * Get (or render and cache) a PNG data URL for a chip variant.
 * Called from TokenChip.tsx on every render — cheap after the first call
 * per variant thanks to the map cache.
 */
export function getChipDataUrl(variant: ChipVariantKey): string {
  const key = cacheKey(variant)
  const hit = cache.get(key)
  if (hit) return hit

  const url = renderChip(variant)
  cache.set(key, url)
  return url
}

// ── Shared framing constants ───────────────────────────────────────────
// Tuned so the TOP chip in the stack renders at identical pixel position
// and scale regardless of stack count — i.e. count=1 is the same image as
// the top chip of count=5. The PNG height is the only thing that grows.
const CHIP_W = 1.6
const CHIP_H = 0.48
const STEP = CHIP_H + 0.04

// Horizontal half-frustum: FIXED. Drives per-chip pixel width.
const FRAME_HALF_W = CHIP_W * 0.78
// Vertical half-frustum ABOVE the top chip: FIXED.
const FRAME_HALF_ABOVE = CHIP_H * 1.3 + 0.3
// Per-chip extra vertical frustum BELOW the top chip. Grows linearly.
const FRAME_STEP_BELOW = STEP

/** Total vertical frustum for a stack (above + below the top chip). */
function frameTotalH(stack: number): number {
  const halfBelow = (stack - 1) * FRAME_STEP_BELOW + FRAME_HALF_ABOVE
  return FRAME_HALF_ABOVE + halfBelow
}

function renderChip({ count, glow }: ChipVariantKey): string {
  const stack = Math.max(1, Math.min(9, Math.floor(count)))

  const RENDER_W = 256
  const RENDER_H = Math.round(RENDER_W * frameTotalH(stack) / (FRAME_HALF_W * 2))

  const { renderer, canvas } = getRenderer(RENDER_W, RENDER_H)

  const scene = new THREE.Scene()

  // Lighting — key from upper-left, soft fill from upper-right cyan.
  scene.add(new THREE.AmbientLight(0xffffff, 0.38))

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15)
  keyLight.position.set(-4, 6, 3)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0x5ec4ff, 0.4)
  fillLight.position.set(4, 3, 2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0x6ed8e8, 0.35)
  rimLight.position.set(5, 1, -2)
  scene.add(rimLight)

  // Build the stack with the TOP chip at scene y=0. Back chips cascade
  // DOWNWARD (negative y). This way the camera can anchor on (0,0,0)
  // — the top chip — and extra chips just extend the frame below it.
  for (let i = 0; i < stack; i++) {
    const chip = buildChipMesh()
    chip.position.y = -i * STEP  // i=0 → top, i=stack-1 → bottom
    scene.add(chip)
  }

  // Asymmetric orthographic frustum:
  //   - Fixed small room ABOVE the top chip (same for every count).
  //   - Extra room BELOW that grows with stack depth.
  // Camera always looks at the TOP chip so it stays fixed in the image.
  const halfBelow = (stack - 1) * FRAME_STEP_BELOW + FRAME_HALF_ABOVE
  const camera = new THREE.OrthographicCamera(
    -FRAME_HALF_W, FRAME_HALF_W,
    FRAME_HALF_ABOVE, -halfBelow,
    0.1, 100,
  )
  camera.position.set(4, 5, 4)
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)

  // Optional: add cyan glow via 2D canvas post-process (cheap + avoids
  // per-variant filter setup). Done by drawing the rendered output into
  // a new canvas with a blurred cyan shadow.
  let finalUrl: string
  if (glow) {
    const post = document.createElement('canvas')
    post.width = RENDER_W
    post.height = RENDER_H
    const ctx = post.getContext('2d')!
    // Draw a blurred cyan copy underneath, then the crisp original on top.
    ctx.save()
    ctx.filter = 'blur(6px)'
    ctx.globalAlpha = 0.85
    ctx.drawImage(canvas, 0, 0, post.width, post.height)
    ctx.restore()
    ctx.save()
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = 'rgba(77, 232, 255, 0.65)'
    ctx.fillRect(0, 0, post.width, post.height)
    ctx.restore()
    ctx.drawImage(canvas, 0, 0, post.width, post.height)
    finalUrl = post.toDataURL('image/png')
  } else {
    finalUrl = canvas.toDataURL('image/png')
  }

  // Dispose geometries + materials so repeat renders don't leak GPU mem.
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    }
  })

  return finalUrl
}

/**
 * Aspect ratio (height / width) of the rendered PNG for a given stack
 * count. Used by TokenChip.tsx to size the `<img>` element correctly.
 * Stays in lockstep with renderChip's frustum math.
 */
export function chipAspect(count: number): number {
  const stack = Math.max(1, Math.min(9, Math.floor(count)))
  return frameTotalH(stack) / (FRAME_HALF_W * 2)
}
