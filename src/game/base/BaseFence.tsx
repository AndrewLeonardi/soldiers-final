/**
 * BaseFence — the perimeter fence that rings the entire 24×16 toy soldier
 * base, just inside the table edges.
 *
 * Visual only — no Rapier colliders. Collision is handled by the
 * WorldRenderer's edge walls already. This is pure aesthetic: dark olive
 * posts + horizontal rails, gate opening at the front-center.
 *
 * Layout:
 *   - Posts: 0.08×0.5×0.08 dark olive boxes every POST_SPACING units
 *   - Rails: two per span (upper + lower), thin horizontal bars connecting posts
 *   - Front gate: a 2.5-unit gap centered on z = +HALF_DEPTH (front face)
 *   - Corner posts: rendered first, serve as layout anchors
 *
 * Coordinate frame: world origin. Fence runs at x: ±HALF_WIDTH, z: ±HALF_DEPTH.
 * Posts sit at y=0.25 (center), their bottom at y=0, flush with table surface.
 */

import { useMemo } from 'react'
import * as THREE from 'three'

// ── Fence geometry constants ──────────────────────────────

/** Inset from the table half-bounds so the fence sits clearly on the table. */
const HALF_WIDTH = 11.2
const HALF_DEPTH = 7.4

const POST_SPACING = 1.5
const POST_W = 0.08
const POST_H = 0.5
const POST_D = 0.08
const POST_Y = POST_H / 2

const RAIL_H = 0.04
const RAIL_D = 0.04
const RAIL_Y_UPPER = 0.40
const RAIL_Y_LOWER = 0.14

/** Gate opening width at the front face — centered on z = +HALF_DEPTH. */
const GATE_WIDTH = 2.8

const POST_COLOR = new THREE.Color(0x4a5a28)
const RAIL_COLOR = new THREE.Color(0x3e4e22)

// ── Geometry + material (shared) ─────────────────────────

const postGeo = new THREE.BoxGeometry(POST_W, POST_H, POST_D)
// Unit geometry in both X and Z so we can scale independently per span.
const railGeo = new THREE.BoxGeometry(1, RAIL_H, 1)
const fenceMat = new THREE.MeshLambertMaterial({ color: POST_COLOR })
const railMat  = new THREE.MeshLambertMaterial({ color: RAIL_COLOR })

// ── Helpers ───────────────────────────────────────────────

interface PostSpec {
  x: number
  z: number
}

interface RailSpec {
  cx: number
  cz: number
  length: number
  axis: 'x' | 'z'
}

/**
 * Generate evenly-spaced post positions along a line from `from` to `to`.
 * The gate exclusion is based on the VARYING coordinate `v` — regardless
 * of whether the face runs along x or z. When `gateCenter` is set, any
 * post whose varying coordinate falls within the gate window is skipped.
 */
function postsAlongLine(
  from: [number, number],
  to:   [number, number],
  axis: 'x' | 'z',
  fixed: number,
  gateCenter: number | null,
): PostSpec[] {
  const [a, b] = axis === 'x' ? [from[0], to[0]] : [from[1], to[1]]
  const len = Math.abs(b - a)
  const n   = Math.round(len / POST_SPACING) + 1
  const posts: PostSpec[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const v = a + (b - a) * t
    // Gate exclusion — skip any post whose varying coordinate lands
    // inside the gate window. `gateCenter` is null for faces with no gate.
    if (gateCenter !== null) {
      const half = GATE_WIDTH / 2
      if (v > gateCenter - half && v < gateCenter + half) continue
    }
    const [x, z] = axis === 'x'
      ? [v, fixed]
      : [fixed, v]
    posts.push({ x, z })
  }
  return posts
}

/**
 * Generate rail specs between consecutive posts on the same face.
 * We skip any rail whose midpoint falls inside the gate zone.
 */
function railsBetweenPosts(
  posts: PostSpec[],
  axis: 'x' | 'z',
  gateCenter: number | null,
): RailSpec[] {
  const rails: RailSpec[] = []
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i]!
    const b = posts[i + 1]!
    const cx = (a.x + b.x) / 2
    const cz = (a.z + b.z) / 2
    // Skip rails that span the gate — check the VARYING midpoint coordinate.
    if (gateCenter !== null) {
      const midV = axis === 'x' ? cx : cz
      const halfGate = GATE_WIDTH / 2
      if (Math.abs(midV - gateCenter) < halfGate + POST_SPACING / 2) continue
    }
    const length = axis === 'x'
      ? Math.abs(b.x - a.x)
      : Math.abs(b.z - a.z)
    rails.push({ cx, cz, length, axis })
  }
  return rails
}

// ── Component ─────────────────────────────────────────────

export function BaseFence() {
  const { posts, rails } = useMemo(() => {
    const allPosts: PostSpec[] = []
    // Front face (z = +HALF_DEPTH, runs along z-axis): gate centered at z=+HALF_DEPTH, x=0
    const frontPosts = postsAlongLine(
      [-HALF_WIDTH, HALF_DEPTH],
      [+HALF_WIDTH, HALF_DEPTH],
      'x', HALF_DEPTH, 0,
    )
    // Back face (z = -HALF_DEPTH, runs along x-axis): no gate
    const backPosts  = postsAlongLine(
      [-HALF_WIDTH, -HALF_DEPTH],
      [+HALF_WIDTH, -HALF_DEPTH],
      'x', -HALF_DEPTH, null,
    )
    // Left face (x = -HALF_WIDTH, runs along z-axis): no gate
    const leftPosts  = postsAlongLine(
      [-HALF_WIDTH, -HALF_DEPTH],
      [-HALF_WIDTH, +HALF_DEPTH],
      'z', -HALF_WIDTH, null,
    )
    // Right face (x = +HALF_WIDTH, runs along z-axis): no gate
    const rightPosts = postsAlongLine(
      [+HALF_WIDTH, -HALF_DEPTH],
      [+HALF_WIDTH, +HALF_DEPTH],
      'z', +HALF_WIDTH, null,
    )
    allPosts.push(...frontPosts, ...backPosts, ...leftPosts, ...rightPosts)

    const allRails: RailSpec[] = []
    allRails.push(...railsBetweenPosts(frontPosts, 'x', 0))
    allRails.push(...railsBetweenPosts(backPosts,  'x', null))
    allRails.push(...railsBetweenPosts(leftPosts,  'z', null))
    allRails.push(...railsBetweenPosts(rightPosts, 'z', null))

    return { posts: allPosts, rails: allRails }
  }, [])

  return (
    <group name="base-fence">
      {/* Posts */}
      {posts.map((p, i) => (
        <mesh
          key={`post-${i}`}
          geometry={postGeo}
          material={fenceMat}
          position={[p.x, POST_Y, p.z]}
          castShadow
        />
      ))}

      {/* Rails — two per span, upper and lower */}
      {rails.map((r, i) => {
        // Geo is 1×RAIL_H×1. Scale the span dimension to r.length;
        // the perpendicular dimension to RAIL_D (the rail's thin depth).
        const scaleX = r.axis === 'x' ? r.length : RAIL_D
        const scaleZ = r.axis === 'z' ? r.length : RAIL_D
        return (
          <group key={`rail-${i}`} position={[r.cx, 0, r.cz]}>
            <mesh
              geometry={railGeo}
              material={railMat}
              scale={[scaleX, 1, scaleZ]}
              position={[0, RAIL_Y_UPPER, 0]}
            />
            <mesh
              geometry={railGeo}
              material={railMat}
              scale={[scaleX, 1, scaleZ]}
              position={[0, RAIL_Y_LOWER, 0]}
            />
          </group>
        )
      })}
    </group>
  )
}
