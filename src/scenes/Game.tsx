import { useEffect, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import type { WebGLRenderer } from 'three'
import { useGameStore } from '@stores/gameStore'
import { BattleScene } from './BattleScene'
import levelData from '@config/levels/sandbox-01.json'
import type { LevelConfig } from '@config/types'

function PhysicsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Physics gravity={[0, -15, 0]}>
      {children}
    </Physics>
  )
}

export default function Game() {
  const loadLevel = useGameStore((s) => s.loadLevel)

  useEffect(() => {
    loadLevel(levelData as LevelConfig)
  }, [loadLevel])

  const onCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', (e: Event) => {
      e.preventDefault()
    })
  }, [])

  return (
    <div className="game-canvas">
      <Canvas
        dpr={[1, 2]}
        shadows
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: 45,
          position: [0, 10, 8],
          near: 0.1,
          far: 100,
        }}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <PhysicsWrapper>
            <BattleScene />
          </PhysicsWrapper>
        </Suspense>
      </Canvas>
    </div>
  )
}
