import { useEffect, useCallback, useRef, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import type { WebGLRenderer } from 'three'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { BattleScene } from './BattleScene'
import { TrainingScene } from './TrainingScene'
import { BarracksScene } from '@three/models/BarracksScene'
import { HUD } from '@ui/HUD'
import { PlacementTray } from '@ui/PlacementTray'
import { BarracksScreen } from '@ui/BarracksScreen'
import { SoldierDetail } from '@ui/SoldierDetail'
import { TrainingHUD } from '@ui/TrainingHUD'
import { GraduationBanner } from '@ui/GraduationBanner'
import { NeuralNetViz } from '@ui/NeuralNetViz'
import { ResultScreen } from '@ui/ResultScreen'
import levelData from '@config/levels/sandbox-01.json'
import type { LevelConfig } from '@config/types'

// Camera controller for training arena
function TrainingCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(4, 8, 14)
    camera.lookAt(5, 0, 0)
  }, [camera])
  return <TrainingScene />
}

// Camera controller for barracks view
function BarracksCamera({ soldierCount }: { soldierCount: number }) {
  const { camera, gl, scene } = useThree()

  useEffect(() => {
    scene.fog = null
  }, [scene])

  useFrame(() => {
    const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight
    const countBonus = Math.max(0, (soldierCount - 2) * 0.4)
    const z = (aspect < 1 ? 4.5 : 3.0) + countBonus
    const y = aspect < 1 ? 0.75 : 0.65
    camera.position.set(0, y, z)
    camera.lookAt(0, 0.3, 0)
  })
  return null
}

// Renders either barracks 3D scene or battlefield based on phase
function SceneRouter({ orbitingRef }: { orbitingRef: React.MutableRefObject<boolean> }) {
  const phase = useGameStore((s) => s.phase)
  const soldiers = useRosterStore((s) => s.soldiers)
  const openDetail = useRosterStore((s) => s.openDetail)
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)

  const isBarracks = phase === 'loadout' && !detailSoldierId

  if (isBarracks) {
    return (
      <>
        <BarracksCamera soldierCount={soldiers.length} />
        <color attach="background" args={[0x111a0d]} />
        <BarracksScene
          soldiers={soldiers}
          onSoldierTap={(id) => openDetail(id)}
        />
      </>
    )
  }

  if (phase === 'loadout' && detailSoldierId) {
    return <color attach="background" args={[0x0c1520]} />
  }

  if (phase === 'training') {
    return <TrainingCamera />
  }

  return (
    <Physics gravity={[0, -15, 0]}>
      <BattleScene orbitingRef={orbitingRef} />
    </Physics>
  )
}

export default function Game() {
  const loadLevel = useGameStore((s) => s.loadLevel)
  const phase = useGameStore((s) => s.phase)
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
          <SceneRouter orbitingRef={orbitingRef} />
        </Suspense>
      </Canvas>

      {/* HTML UI overlay */}
      <BarracksScreen />
      <SoldierDetail />
      <TrainingHUD />
      <NeuralNetViz />
      <GraduationBanner />
      <HUD />
      <PlacementTray />
      <ResultScreen />
    </div>
  )
}
