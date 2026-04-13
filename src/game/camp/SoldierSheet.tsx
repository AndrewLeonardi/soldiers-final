/**
 * SoldierSheet — bottom sheet showing a soldier's stats.
 *
 * Sprint C rewrite. Shows rank badge, XP bar, next rank preview,
 * per-weapon fitness, and TRAIN NOW button.
 */
import { useCallback } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { RankBadge } from './RankBadge'
import { getRank, getNextRank } from '@config/ranks'
import type { WeaponType } from '@config/types'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'Rifle',
  rocketLauncher: 'Rocket Launcher',
  grenade: 'Grenades',
  machineGun: 'Machine Gun',
  tank: 'Tank',
}

export function SoldierSheet() {
  const soldierSheetId = useSceneStore((s) => s.soldierSheetId)
  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)
  const setPreselectedTrainingSoldierId = useSceneStore((s) => s.setPreselectedTrainingSoldierId)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const soldiers = useCampStore((s) => s.soldiers)

  const soldier = soldierSheetId ? soldiers.find((s) => s.id === soldierSheetId) : null

  const handleClose = useCallback(() => {
    setSoldierSheetId(null)
  }, [setSoldierSheetId])

  const setFiringRange = useSceneStore((s) => s.setFiringRange)

  const handleTrainNow = useCallback(() => {
    if (!soldierSheetId) return
    sfx.buttonTap()
    setPreselectedTrainingSoldierId(soldierSheetId)
    setSoldierSheetId(null)
    setTrainingSheetOpen(true)
  }, [soldierSheetId, setPreselectedTrainingSoldierId, setSoldierSheetId, setTrainingSheetOpen])

  const handleTestWeapon = useCallback((weapon: WeaponType) => {
    if (!soldierSheetId) return
    sfx.weaponEquip()
    setSoldierSheetId(null)
    setFiringRange(soldierSheetId, weapon)
  }, [soldierSheetId, setSoldierSheetId, setFiringRange])

  if (!soldier) return null

  const trainedBrains = soldier.trainedBrains ? Object.keys(soldier.trainedBrains) : []
  const legacyBrains = soldier.legacyBrains ? Object.keys(soldier.legacyBrains) : []
  const hasLegacy = legacyBrains.length > 0 && trainedBrains.length === 0
  const fitnessPercent = soldier.fitnessScore != null ? Math.round(soldier.fitnessScore * 100) : null

  const xp = soldier.xp ?? 0
  const rank = getRank(xp)
  const nextRank = getNextRank(xp)
  const xpProgress = nextRank
    ? ((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100
    : 100

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="soldier-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="soldier-sheet-name">{soldier.name}</div>
        <div className="soldier-sheet-weapon">{WEAPON_LABELS[soldier.weapon] ?? soldier.weapon}</div>

        {/* Rank + XP */}
        <div className="soldier-rank-info">
          <RankBadge xp={xp} size="md" showName />
        </div>

        <div className="soldier-xp-bar-container">
          <div className="soldier-xp-label">
            <span>{xp} XP</span>
            <span>{nextRank ? `${nextRank.xp} XP` : 'MAX'}</span>
          </div>
          <div className="soldier-xp-bar">
            <div
              className="soldier-xp-fill"
              style={{
                width: `${Math.min(100, xpProgress)}%`,
                background: `linear-gradient(90deg, ${rank.color}, ${nextRank?.color ?? rank.color})`,
              }}
            />
          </div>
          {nextRank && (
            <div className="soldier-next-rank">
              NEXT: {nextRank.name.toUpperCase()} (+{Math.round((nextRank.healthMult - 1) * 100)}% HP)
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="soldier-sheet-stats">
          <div className="soldier-stat">
            <span className="soldier-stat-label">STATUS</span>
            <span className={`soldier-stat-value ${soldier.trained ? 'trained' : 'untrained'}`}>
              {soldier.trained ? 'TRAINED' : 'UNTRAINED'}
            </span>
          </div>

          {fitnessPercent != null && (
            <div className="soldier-stat">
              <span className="soldier-stat-label">FITNESS</span>
              <span className="soldier-stat-value">{fitnessPercent}%</span>
            </div>
          )}

          {soldier.generationsTrained != null && soldier.generationsTrained > 0 && (
            <div className="soldier-stat">
              <span className="soldier-stat-label">GENERATIONS</span>
              <span className="soldier-stat-value">{soldier.generationsTrained}</span>
            </div>
          )}
        </div>

        {/* Trained brains + test buttons */}
        {trainedBrains.length > 0 && (
          <div className="soldier-sheet-brains">
            <div className="soldier-stat-label">TRAINED WEAPONS</div>
            <div className="soldier-brains-list">
              {trainedBrains.map((w) => (
                <div key={w} className="soldier-brain-row">
                  <span className="soldier-brain-badge">
                    {WEAPON_LABELS[w] ?? w}
                  </span>
                  <button
                    className="soldier-brain-test-btn"
                    onClick={() => handleTestWeapon(w as WeaponType)}
                  >
                    TEST
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Re-train badge for soldiers with legacy brains */}
        {hasLegacy && (
          <div className="soldier-retrain-badge">
            RE-TRAIN RECOMMENDED — brain upgraded
          </div>
        )}

        {/* Train Now button */}
        <button className="soldier-sheet-train-btn" onClick={handleTrainNow}>
          {hasLegacy ? 'RE-TRAIN NOW' : 'TRAIN NOW'}
        </button>
      </div>
    </div>
  )
}
