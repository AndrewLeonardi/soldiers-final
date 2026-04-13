/**
 * RosterSheet — soldier roster bottom sheet.
 *
 * Sprint C rewrite. Sort/filter bar, redesigned flat rows with
 * rank badges, fitness bars, and weapon count. Tap row to open
 * SoldierSheet detail view.
 */
import { useState, useCallback, useMemo } from 'react'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { RankBadge } from './RankBadge'
import { WeaponIcon } from './WeaponIcon'
import { getRank, rankIndex } from '@config/ranks'
import type { SoldierRecord } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

type SortBy = 'rank' | 'fitness' | 'name'
type FilterBy = 'all' | 'trained' | 'untrained' | 'injured'

function sortSoldiers(soldiers: SoldierRecord[], sortBy: SortBy): SoldierRecord[] {
  const sorted = [...soldiers]
  switch (sortBy) {
    case 'rank':
      return sorted.sort((a, b) => {
        const ri = rankIndex(b.xp ?? 0) - rankIndex(a.xp ?? 0)
        if (ri !== 0) return ri
        return (b.xp ?? 0) - (a.xp ?? 0)
      })
    case 'fitness':
      return sorted.sort((a, b) => (b.fitnessScore ?? 0) - (a.fitnessScore ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return sorted
  }
}

function filterSoldiers(soldiers: SoldierRecord[], filterBy: FilterBy): SoldierRecord[] {
  const now = Date.now()
  switch (filterBy) {
    case 'trained':
      return soldiers.filter(s => s.trained)
    case 'untrained':
      return soldiers.filter(s => !s.trained)
    case 'injured':
      return soldiers.filter(s => s.injuredUntil && s.injuredUntil > now)
    default:
      return soldiers
  }
}

export function RosterSheet() {
  const isOpen = useSceneStore((s) => s.rosterSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)
  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)
  const soldiers = useCampStore((s) => s.soldiers)
  const gold = useCampStore((s) => s.gold)

  const [sortBy, setSortBy] = useState<SortBy>('rank')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')

  const displaySoldiers = useMemo(() => {
    const filtered = filterSoldiers(soldiers, filterBy)
    return sortSoldiers(filtered, sortBy)
  }, [soldiers, sortBy, filterBy])

  const handleClose = useCallback(() => {
    setRosterSheetOpen(false)
  }, [setRosterSheetOpen])

  const handleRecruit = useCallback(() => {
    sfx.buttonTap()
    setRosterSheetOpen(false)
    setTimeout(() => setRecruitSheetOpen(true), 150)
  }, [setRosterSheetOpen, setRecruitSheetOpen])

  const handleTapSoldier = useCallback((id: string) => {
    sfx.buttonTap()
    setRosterSheetOpen(false)
    setTimeout(() => setSoldierSheetId(id), 150)
  }, [setRosterSheetOpen, setSoldierSheetId])

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet roster-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">ROSTER</span>
          <span className="roster-count">{soldiers.length} SOLDIERS</span>
        </div>

        <div className="game-sheet-body">
          {/* Recruit button */}
          <button
            className={`roster-recruit-btn ${gold < 200 ? 'disabled' : ''}`}
            onClick={handleRecruit}
            disabled={gold < 200}
          >
            + RECRUIT NEW SOLDIER
          </button>

          {/* Sort/Filter bar */}
          <div className="roster-sort-bar">
            {(['rank', 'fitness', 'name'] as SortBy[]).map(s => (
              <button
                key={s}
                className={`roster-sort-pill ${sortBy === s ? 'active' : ''}`}
                onClick={() => { sfx.buttonTap(); setSortBy(s) }}
              >
                {s.toUpperCase()}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            {(['all', 'trained', 'untrained', 'injured'] as FilterBy[]).map(f => (
              <button
                key={f}
                className={`roster-filter-pill ${filterBy === f ? 'active' : ''}`}
                onClick={() => { sfx.buttonTap(); setFilterBy(f) }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          {soldiers.length === 0 ? (
            <div className="store-empty">No soldiers recruited yet</div>
          ) : displaySoldiers.length === 0 ? (
            <div className="store-empty">No soldiers match filter</div>
          ) : (
            <div className="roster-list">
              {displaySoldiers.map(sol => {
                const trainedWeapons = sol.trainedBrains ? Object.keys(sol.trainedBrains) : []
                const rank = getRank(sol.xp ?? 0)
                const fitnessPercent = sol.fitnessScore != null ? Math.round(sol.fitnessScore * 100) : 0
                const isInjured = sol.injuredUntil && sol.injuredUntil > Date.now()

                return (
                  <button
                    key={sol.id}
                    className="roster-row"
                    onClick={() => handleTapSoldier(sol.id)}
                  >
                    <div className="roster-row-rank">
                      <RankBadge xp={sol.xp ?? 0} size="md" />
                    </div>
                    <div className="roster-row-info">
                      <div className="roster-row-name" style={{ color: rank.color }}>
                        {sol.name}
                        {isInjured && <span style={{ color: '#FF5252', marginLeft: 6, fontSize: 9 }}>INJURED</span>}
                      </div>
                      <div className="roster-fitness-bar">
                        <div
                          className="roster-fitness-fill"
                          style={{ width: `${fitnessPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="roster-row-badges">
                      {trainedWeapons.length > 0 ? (
                        <span className="roster-weapon-count">
                          {trainedWeapons.length} {trainedWeapons.length === 1 ? 'BRAIN' : 'BRAINS'}
                        </span>
                      ) : (
                        <span className="roster-untrained-badge">UNTRAINED</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
