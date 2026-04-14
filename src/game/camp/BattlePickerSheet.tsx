/**
 * BattlePickerSheet — full-screen level selector with rotating 3D diorama.
 *
 * Sprint 8. Replaces the flat bottom-sheet battle list with a swipeable
 * level selector. One level fills the screen at a time with a rotating
 * 3D island diorama showing the enemy base and themed environment.
 *
 * Swipe left/right or use arrow buttons to browse levels.
 * Shows level info, stars, rewards, and weapon unlock below the diorama.
 */
import { useCallback, useState, useMemo } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { generateLevel, getMaxAccessibleLevel } from '@config/levelGenerator'
import type { CampBattleConfig } from '@config/campBattles'
import { BattleDiorama } from './BattleDiorama'
import { TokenIcon } from './TokenIcon'
import { LockIcon } from './icons/LockIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rocketLauncher: 'ROCKET LAUNCHER',
  grenade: 'GRENADES',
  machineGun: 'MACHINE GUN',
  tank: 'TANK',
}

const WEAPON_ICONS: Record<string, string> = {
  rocketLauncher: 'RL',
  grenade: 'GR',
  machineGun: 'MG',
  tank: 'TK',
}

export function BattlePickerSheet() {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)
  const initBattle = useCampBattleStore((s) => s.initBattle)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)
  const unlockedWeapons = useCampStore((s) => s.unlockedWeapons)

  const maxLevel = useMemo(
    () => getMaxAccessibleLevel(battlesCompleted ?? {}),
    [battlesCompleted],
  )

  const [currentLevel, setCurrentLevel] = useState(1)

  // Generate the current level config
  const levelConfig = useMemo(() => generateLevel(currentLevel), [currentLevel])
  const completed = battlesCompleted?.[levelConfig.id]
  const isLocked = currentLevel > maxLevel
  const totalEnemies = levelConfig.waves.reduce(
    (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0), 0,
  )

  const handleDeploy = useCallback(() => {
    if (isLocked) return
    sfx.buttonTap()
    initBattle(levelConfig)
    setBattlePhase('placing')
  }, [isLocked, levelConfig, initBattle, setBattlePhase])

  const handleClose = useCallback(() => {
    sfx.buttonTap()
    setBattlePhase('idle')
  }, [setBattlePhase])

  const handlePrev = useCallback(() => {
    sfx.buttonTap()
    setCurrentLevel((l) => Math.max(1, l - 1))
  }, [])

  const handleNext = useCallback(() => {
    sfx.buttonTap()
    setCurrentLevel((l) => Math.min(maxLevel, l + 1))
  }, [maxLevel])

  if (battlePhase !== 'picking') return null

  const themeId = levelConfig.themeId ?? 'garden'

  return (
    <div className="level-selector">
      {/* Top bar */}
      <div className="level-selector-top">
        <button className="level-selector-back" onClick={handleClose}>
          ← BACK
        </button>
        <span className="level-selector-number">LEVEL {currentLevel}</span>
      </div>

      {/* Diorama viewport */}
      <div className="level-selector-diorama">
        {isLocked ? (
          <div className="level-selector-locked-preview">
            <span className="level-selector-lock-icon"><LockIcon size={32} /></span>
          </div>
        ) : (
          <BattleDiorama themeId={themeId} level={currentLevel} />
        )}
      </div>

      {/* Level info */}
      <div className="level-selector-info">
        <div className="level-selector-name">{levelConfig.name}</div>
        <div className="level-selector-desc">{levelConfig.description}</div>

        {/* Meta row: waves, enemies, reward */}
        <div className="level-selector-meta">
          <span className="level-selector-meta-item">
            {levelConfig.waves.length} WAVE{levelConfig.waves.length > 1 ? 'S' : ''}
          </span>
          <span className="level-selector-meta-item">
            {totalEnemies} ENEMIES
          </span>
          <span className="level-selector-meta-item">
            +{levelConfig.reward} <TokenIcon size={12} />
          </span>
        </div>

        {/* Stars */}
        {completed && (
          <div className="level-selector-stars">
            {'★'.repeat(completed.stars)}{'☆'.repeat(3 - completed.stars)}
          </div>
        )}

        {/* Weapon reward */}
        {levelConfig.weaponReward && (
          <div className={`level-selector-weapon ${unlockedWeapons.includes(levelConfig.weaponReward) ? 'earned' : ''}`}>
            {unlockedWeapons.includes(levelConfig.weaponReward)
              ? `✓ ${WEAPON_ICONS[levelConfig.weaponReward] ?? ''} ${WEAPON_LABELS[levelConfig.weaponReward] ?? levelConfig.weaponReward}`
              : `UNLOCKS: ${WEAPON_ICONS[levelConfig.weaponReward] ?? ''} ${WEAPON_LABELS[levelConfig.weaponReward] ?? levelConfig.weaponReward}`
            }
          </div>
        )}
      </div>

      {/* Navigation arrows + dots */}
      <div className="level-selector-nav">
        <button
          className="level-selector-arrow"
          onClick={handlePrev}
          disabled={currentLevel <= 1}
        >
          ◀
        </button>

        <div className="level-selector-dots">
          {Array.from({ length: Math.min(maxLevel, 10) }, (_, i) => {
            const lvl = i + 1
            return (
              <button
                key={lvl}
                className={`level-selector-dot ${lvl === currentLevel ? 'active' : ''} ${(battlesCompleted?.[`camp-${lvl}`]) ? 'completed' : ''}`}
                onClick={() => { sfx.buttonTap(); setCurrentLevel(lvl) }}
              />
            )
          })}
          {maxLevel > 10 && <span className="level-selector-dot-more">…</span>}
        </div>

        <button
          className="level-selector-arrow"
          onClick={handleNext}
          disabled={currentLevel >= maxLevel}
        >
          ▶
        </button>
      </div>

      {/* Deploy button */}
      <button
        className={`level-selector-deploy ${isLocked ? 'locked' : ''}`}
        onClick={handleDeploy}
        disabled={isLocked}
      >
        {isLocked ? <><LockIcon size={14} /> LOCKED</> : 'DEPLOY'}
      </button>
    </div>
  )
}
