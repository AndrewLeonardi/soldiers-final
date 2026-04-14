/**
 * ResultOverlay — full-screen victory/defeat overlay with dramatic reveals.
 *
 * Sprint 8. Enhanced from Sprint 4/5:
 *   - Stars bounce in one-at-a-time with sound
 *   - Weapon unlock card slides up with golden glow + sparkles
 *   - Token reward counter animates from 0 to value
 *   - Rarity stripe on weapon card
 *   - Defeat shows RETRY prominently
 */
import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { createDisplayWeapon } from '@three/models/weaponMeshes'
import { RankBadge } from './RankBadge'
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

const WEAPON_RARITY: Record<string, string> = {
  rifle: 'common',
  rocketLauncher: 'uncommon',
  grenade: 'uncommon',
  machineGun: 'rare',
  tank: 'epic',
}

const WEAPON_DESCRIPTIONS: Record<string, string> = {
  rifle: 'Standard issue. Reliable and accurate.',
  rocketLauncher: 'Explosive ordnance. Area denial specialist.',
  grenade: 'Throwable explosives. Flush them out!',
  machineGun: 'Sustained fire. Suppression platform.',
  tank: 'Heavy armor. Unstoppable force.',
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

/** Animated token counter that counts up from 0 to target */
function TokenCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (target <= 0) return
    startRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - (startRef.current ?? now)
      const progress = Math.min(elapsed / 1000, 1) // 1 second duration
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target])

  return <span>{display}</span>
}

export function ResultOverlay() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const result = useCampBattleStore((s) => s.result)
  const starsEarned = useCampBattleStore((s) => s.starsEarned)
  const battleConfig = useCampBattleStore((s) => s.battleConfig)
  const weaponUnlocked = useCampBattleStore((s) => s.weaponUnlocked)
  const soldierXPEarned = useCampBattleStore((s) => s.soldierXPEarned)
  const placedSoldiers = useCampBattleStore((s) => s.placedSoldiers)
  const soldiers = useCampStore((s) => s.soldiers)
  const reset = useCampBattleStore((s) => s.reset)
  const initBattle = useCampBattleStore((s) => s.initBattle)

  // Play star sounds with staggered timing
  const starSoundsPlayed = useRef(false)
  useEffect(() => {
    if (battlePhase !== 'result' || result !== 'victory' || starSoundsPlayed.current) return
    starSoundsPlayed.current = true

    for (let i = 0; i < starsEarned; i++) {
      setTimeout(() => {
        try { sfx.targetHitPop() } catch {}
      }, 300 + i * 300)
    }

    return () => { starSoundsPlayed.current = false }
  }, [battlePhase, result, starsEarned])

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
  const rarity = weaponUnlocked ? (WEAPON_RARITY[weaponUnlocked] ?? 'common') : 'common'

  return (
    <div className="result-overlay">
      <div className={`result-card ${isVictory ? 'victory' : 'defeat'}`}>
        {/* Title */}
        <h1 className={`result-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {isVictory && (
          <>
            {/* Bouncing stars */}
            <div className="result-stars">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`result-star ${i <= starsEarned ? 'earned' : 'empty'}`}
                  style={{ animationDelay: `${0.3 + i * 0.3}s` }}
                >
                  {i <= starsEarned ? '\u2605' : '\u2606'}
                </span>
              ))}
            </div>

            {/* Weapon Unlock Card */}
            {weaponUnlocked && (
              <div className={`result-unlock-card rarity-${rarity}`}>
                {/* Sparkle particles */}
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="result-sparkle"
                    style={{
                      '--sparkle-angle': `${(i / 8) * 360}deg`,
                      '--sparkle-delay': `${0.8 + i * 0.12}s`,
                    } as React.CSSProperties}
                  />
                ))}

                <div className="result-unlock-badge">NEW</div>
                <div className="result-unlock-header">TRAINING UNLOCKED</div>

                {/* Spinning 3D weapon */}
                <div className="result-weapon-canvas">
                  <Canvas
                    camera={{ position: [0, 0.3, 1.6], fov: 35 }}
                    gl={{ alpha: true, antialias: true }}
                    style={{ width: 200, height: 140 }}
                  >
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[2, 3, 4]} intensity={1.2} />
                    {/* Rim light for dramatic look */}
                    <directionalLight position={[-3, 1, -2]} intensity={0.6} color={0x88aaff} />
                    <SpinningWeapon weapon={weaponUnlocked as WeaponType} />
                  </Canvas>
                </div>

                <div className="result-unlock-name">
                  {WEAPON_NAMES[weaponUnlocked] ?? weaponUnlocked.toUpperCase()}
                </div>
                <div className="result-unlock-desc">
                  {WEAPON_DESCRIPTIONS[weaponUnlocked] ?? ''}
                </div>
                <div className={`result-rarity-stripe rarity-${rarity}`}>
                  {rarity.toUpperCase()}
                </div>
              </div>
            )}

            {/* Rewards */}
            <div className="result-rewards">
              <div className="result-reward">
                +<TokenCounter target={reward} /> TOKENS
              </div>
            </div>

            {/* Squad XP */}
            {Object.keys(soldierXPEarned).length > 0 && (
              <div className="result-xp-section">
                <div className="result-xp-header">SQUAD XP</div>
                {placedSoldiers.map((ps, idx) => {
                  const xpInfo = soldierXPEarned[ps.soldierId]
                  if (!xpInfo) return null
                  const sol = soldiers.find(s => s.id === ps.soldierId)
                  return (
                    <div
                      key={ps.soldierId}
                      className={`result-xp-row ${xpInfo.newRankName ? 'rank-up' : ''}`}
                      style={{ animationDelay: `${1.2 + idx * 0.3}s` }}
                    >
                      <RankBadge xp={sol?.xp ?? 0} size="sm" />
                      <span className="result-xp-name">{ps.name}</span>
                      <span className="result-xp-amount">+{xpInfo.xp} XP</span>
                      {xpInfo.newRankName && (
                        <span className="result-xp-rankup">PROMOTED: {xpInfo.newRankName.toUpperCase()}!</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!isVictory && (
          <div className="result-defeat-section">
            <div className="result-defeat-msg">Your soldiers have fallen.</div>
            <div className="result-defeat-hint">TRAIN HARDER AND TRY AGAIN</div>
          </div>
        )}

        {/* Action buttons */}
        <div className="result-buttons">
          <button className="result-btn return" onClick={handleReturn}>
            RETURN TO CAMP
          </button>
          <button className="result-btn retry" onClick={handleRetry}>
            {isVictory ? 'PLAY AGAIN' : 'RETRY'}
          </button>
        </div>
      </div>
    </div>
  )
}
