import { useEffect, useCallback, useRef, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import type { WebGLRenderer } from 'three'
import { useGameStore } from '@stores/gameStore'
import { BattleScene } from './BattleScene'
import { HUD } from '@ui/HUD'
import { PlacementTray } from '@ui/PlacementTray'
import levelData from '@config/levels/sandbox-01.json'
import type { LevelConfig } from '@config/types'

export default function Game() {
  const loadLevel = useGameStore((s) => s.loadLevel)
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const orbitingRef = useRef(false)

  useEffect(() => {
    loadLevel(levelData as LevelConfig)
  }, [loadLevel])

  const onCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.1

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
          position: [0, 12, 10],
          near: 0.1,
          far: 100,
        }}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <BattleScene
              selectedUnit={selectedUnit}
              orbitingRef={orbitingRef}
            />
          </Physics>
        </Suspense>
      </Canvas>

      {/* HTML UI overlay */}
      <HUD />
      <PlacementTray
        selectedUnit={selectedUnit}
        onSelect={setSelectedUnit}
      />
    </div>
  )
}
