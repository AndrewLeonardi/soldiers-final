import { useEffect, useCallback, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import type { WebGLRenderer } from 'three'
import { useGameStore } from '@stores/gameStore'
import { BattleScene } from './BattleScene'
import { HUD } from '@ui/HUD'
import { PlacementTray } from '@ui/PlacementTray'
import levelData from '@config/levels/sandbox-01.json'
import type { LevelConfig, GameUnit } from '@config/types'
import { WEAPON_STATS, PLACEMENT_COSTS } from '@config/units'

let unitIdCounter = 0
function nextUnitId() { return `u-${++unitIdCounter}` }

export default function Game() {
  const loadLevel = useGameStore((s) => s.loadLevel)
  const addPlayerUnit = useGameStore((s) => s.addPlayerUnit)
  const occupySlot = useGameStore((s) => s.occupySlot)
  const spendGold = useGameStore((s) => s.spendGold)
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  useEffect(() => {
    loadLevel(levelData as LevelConfig)
  }, [loadLevel])

  const handleSlotClick = useCallback((slotId: string, pos: [number, number, number]) => {
    if (!selectedUnit) return

    const cost = PLACEMENT_COSTS[selectedUnit] ?? 100
    if (!spendGold(cost)) return

    const isSoldier = selectedUnit.includes('soldier')
    const weaponKey = selectedUnit === 'rocket_soldier' ? 'rocketLauncher' as const : 'rifle' as const
    const stats = isSoldier ? WEAPON_STATS[weaponKey] : { health: 150, speed: 0, range: 0, damage: 0, fireRate: 0 }

    const unit: GameUnit = {
      id: nextUnitId(),
      type: isSoldier ? 'soldier' : selectedUnit === 'sandbag' ? 'sandbag' : 'wall',
      team: 'green',
      position: [pos[0], pos[1], pos[2]],
      rotation: Math.PI / 2,
      health: stats.health,
      maxHealth: stats.health,
      status: 'idle',
      weapon: weaponKey,
      lastFireTime: 0,
      fireRate: stats.fireRate,
      range: stats.range,
      damage: stats.damage,
      speed: stats.speed,
    }

    addPlayerUnit(unit)
    occupySlot(slotId)
  }, [selectedUnit, spendGold, addPlayerUnit, occupySlot])

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
          <Physics gravity={[0, -15, 0]}>
            <BattleScene
              selectedUnit={selectedUnit}
              onSlotClick={handleSlotClick}
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
