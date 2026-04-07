/**
 * WorldRenderer — reads a WorldConfig and renders the complete 3D environment.
 *
 * This is the single entry point for world rendering. It handles:
 * - Ground plane with Rapier collider
 * - Border walls (open edges for falls, closed for blocking)
 * - Theme-driven lighting and sky
 * - All props via PropRenderer dispatch
 *
 * BattleScene renders <WorldRenderer worldConfig={...} /> instead of
 * the old SandboxGround + BattlefieldProps.
 */
import type { WorldConfig } from '@config/worlds/types'
import { WorldGround } from './WorldGround'
import { WorldLighting } from './WorldLighting'
import { PropRenderer } from './props/PropRenderer'

interface WorldRendererProps {
  worldConfig: WorldConfig
}

export function WorldRenderer({ worldConfig }: WorldRendererProps) {
  return (
    <>
      {/* Sky + fog from theme */}
      <color attach="background" args={[worldConfig.theme.skyColor]} />
      <fog attach="fog" args={[worldConfig.theme.fogColor, worldConfig.theme.fogNear, worldConfig.theme.fogFar]} />

      {/* Lighting */}
      <WorldLighting theme={worldConfig.theme} />

      {/* Ground + borders */}
      <WorldGround
        ground={worldConfig.ground}
        edges={worldConfig.edges}
        tableFrame={worldConfig.tableFrame}
      />

      {/* Interactive props */}
      {worldConfig.props.map(prop => (
        <PropRenderer key={prop.id} config={prop} />
      ))}
    </>
  )
}
