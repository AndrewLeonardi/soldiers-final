/**
 * CampPage — the main entry point for the base camp diorama.
 *
 * Sprint 1. This is the route component that wires together:
 *   - Boot screen (Subsystem 4)
 *   - Canvas + Physics + CampScene (Subsystem 1-3)
 *   - HUD overlay: compute counter + settings gear (Subsystem 5)
 *   - Settings sheet stub (Subsystem 4)
 *   - Ambient audio bed (Subsystem 5)
 *
 * Foundation: lifted from /physics-test's page structure.
 * NOT from BaseScene.tsx or GameConcept.
 */
import { Suspense, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { CampScene } from './CampScene'
import { BootScreen } from './BootScreen'
import { ComputeCounter } from './ComputeCounter'
import { SettingsSheet } from './SettingsSheet'
import { TrainingSheet } from './TrainingSheet'
import { MilestoneCallout } from './MilestoneCallout'
import { AudioBed } from '@audio/AudioBed'
import { useSceneStore } from '@stores/sceneStore'
import '@styles/camp-ui.css'

export default function CampPage() {
  const [booted, setBooted] = useState(false)
  const toggleSettings = useSceneStore((s) => s.toggleSettings)

  const handleBootDone = useCallback(() => setBooted(true), [])
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)

  // Dev shortcut: T opens training sheet
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        setTrainingSheetOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTrainingSheetOpen])

  return (
    <div style={{ width: '100%', height: '100svh', position: 'relative', background: '#111' }}>
      {/* Boot screen — 1s hold + crossfade */}
      {!booted && <BootScreen onDone={handleBootDone} />}

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <CampScene />
          </Physics>
        </Suspense>
      </Canvas>

      {/* HUD overlay — compute counter + settings gear */}
      <div className="camp-hud">
        <ComputeCounter />
        <button
          className="settings-gear"
          onClick={toggleSettings}
          aria-label="Settings"
        >
          &#x2699;
        </button>
      </div>

      {/* Settings sheet (bottom sheet pattern) */}
      <SettingsSheet />

      {/* Training sheet (commit soldier to training) */}
      <TrainingSheet />

      {/* Milestone callout banners */}
      <MilestoneCallout />

      {/* Ambient audio bed — synthesized camp ambience */}
      <AudioBed />

      {/* Dev indicator */}
      {import.meta.env.DEV && (
        <div className="dev-indicator">
          DEV | G=grenade T=train
        </div>
      )}
    </div>
  )
}
