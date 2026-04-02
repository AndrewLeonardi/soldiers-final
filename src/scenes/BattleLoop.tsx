import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '@stores/gameStore'
import { BattleManager } from '@engine/sim/BattleManager'

export function BattleLoop() {
  const managerRef = useRef<BattleManager | null>(null)
  const phase = useGameStore((s) => s.phase)

  useEffect(() => {
    if (phase === 'battle') {
      const mgr = new BattleManager()
      managerRef.current = mgr
      return () => {
        mgr.reset()
        managerRef.current = null
      }
    } else {
      if (managerRef.current) {
        managerRef.current.reset()
        managerRef.current = null
      }
    }
  }, [phase])

  useFrame((state) => {
    if (phase !== 'battle') return
    if (!managerRef.current) return

    const dt = Math.min(state.clock.getDelta(), 0.05) // cap dt
    const elapsed = state.clock.getElapsedTime()
    managerRef.current.tick(dt, elapsed)
  })

  return null
}
