/**
 * ResultOverlay — full-screen victory/defeat overlay.
 *
 * Sprint 4, Phase 4b. Shows after battle ends:
 *   - VICTORY (green) or DEFEAT (red) title
 *   - Star display (1-3 gold stars)
 *   - NEW WEAPON UNLOCKED — spinning 3D weapon model (Sprint 5)
 *   - Compute reward on victory
 *   - RETURN TO CAMP / RETRY buttons
 */
import { useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_NAMES: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET LAUNCHER',
  grenade: 'GRENADES',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

/** Slowly rotating weapon display inside the mini Canvas */
function SpinningWeapon({ weapon }: { weapon: WeaponType }) {
  const groupRef = useRef<THREE.Group>(null!)
  const weaponObj = useMemo(() => createDisplayWeapon(weapon), [weapon])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.2
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={weaponObj} />
    </group>
  )
}

export function ResultOverlay() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const result = useCampBattleStore((s) => s.result)
  const starsEarned = useCampBattleStore((s) => s.starsEarned)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const weaponUnlocked = useCampBattleStore((s) => s.weaponUnlocked)
  const reset = useCampBattleStore((s) => s.reset)
  const initBattle = useCampBattleStore((s) => s.initBattle)

  const handleReturn = useCallback(() => {
    sfx.buttonTap()
    reset()
    setBattlePhase('idle')
  }, [reset, setBattlePhase])

  const handleRetry = useCallback(() => {
    if (!battleConfig) return
    sfx.buttonTap()
    const config = battleConfig
    reset()
    initBattle(config)
    setBattlePhase('placing')
  }, [battleConfig, reset, initBattle, setBattlePhase])

  if (battlePhase !== 'result' || !result) return null

  const isVictory = result === 'victory'
  const reward = isVictory && battleConfig ? battleConfig.reward : 0

  return (
    <div className="result-overlay">
      <div className="result-card">
        <h1 className={`result-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {isVictory && (
          <>
            <div className="result-stars">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`result-star ${i <= starsEarned ? 'earned' : 'empty'}`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {i <= starsEarned ? '\u2605' : '\u2606'}
                </span>
              ))}
            </div>

            {/* 3D Weapon Unlock Reveal */}
            {weaponUnlocked && (
              <div className="result-weapon-unlock">
                <div className="result-weapon-label">NEW WEAPON UNLOCKED</div>
                <div className="result-weapon-canvas">
                  <Canvas
                    camera={{ position: [0, 0.3, 1.8], fov: 35 }}
                    gl={{ alpha: true, antialias: true }}
                    style={{ width: 200, height: 200 }}
                  >
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[2, 3, 4]} intensity={1.2} />
                    <SpinningWeapon weapon={weaponUnlocked as WeaponType} />
                  </Canvas>
                </div>
                <div className="result-weapon-name">{WEAPON_NAMES[weaponUnlocked] ?? weaponUnlocked.toUpperCase()}</div>
              </div>
            )}

            <div className="result-reward">+{reward} COMPUTE</div>
          </>
        )}

        {!isVictory && (
          <div className="result-defeat-msg">Your soldiers have fallen. Train harder and try again!</div>
        )}

        <div className="result-buttons">
          <button className="result-btn return" onClick={handleReturn}>
            RETURN TO CAMP
          </button>
          {!isVictory && (
            <button className="result-btn retry" onClick={handleRetry}>
              RETRY
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
