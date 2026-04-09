/**
 * GameConcept — the root page for the new base-defense game at /game-concept.
 *
 * Phase 1a is a static foundation slice: renders the kitchen-table base with
 * three destructible buildings (Vault, Training Grounds, Collector), three
 * idle toy soldiers, and an orbit camera. No gameplay yet — this page
 * exists to prove the architecture works end-to-end before Phase 2 layers
 * on base editing, Phase 3 adds training, Phase 4 adds rival attacks, etc.
 *
 * The eventual replacement for /play. See plan.md for the full roadmap.
 *
 * Physics gravity matches the rest of the game (Game.tsx, PhysicsTest.tsx)
 * so physics feel is consistent across scenes.
 */
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { BaseScene } from './base/BaseScene'
import { BaseHUD } from './ui/BaseHUD'
import { LoadingFallback } from './ui/LoadingFallback'

export default function GameConcept() {
  return (
    <div
      style={{
        width: '100%',
        height: '100svh',
        position: 'relative',
        background: '#0a0d14',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <BaseScene />
          </Physics>
        </Suspense>
      </Canvas>
      <LoadingFallback />
      <BaseHUD />
    </div>
  )
}
