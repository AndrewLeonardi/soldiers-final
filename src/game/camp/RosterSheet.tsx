/**
 * RosterSheet — 2-column card grid with 3D soldier models.
 *
 * Sprint 3: The Identity. Each card shows a rotating 3D soldier,
 * rank-colored border, name, weapon, XP bar, status indicator.
 * Tap card to open full-screen SoldierSheet detail.
 */
import { useState, useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { RankBadge } from './RankBadge'
import { getRank, getNextRank, rankIndex } from '@config/ranks'
import { createFlexSoldier, animateFlexSoldier } from '@three/models/flexSoldier'
import type { SoldierRecord } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

type SortBy = 'rank' | 'fitness' | 'name'
type FilterBy = 'all' | 'ready' | 'trained' | 'injured'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET',
  grenade: 'GRENADES',
  machineGun: 'MG',
  tank: 'TANK',
}

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
    case 'ready':
      return soldiers.filter(s => s.trained && !(s.injuredUntil && s.injuredUntil > now))
    case 'trained':
      return soldiers.filter(s => s.trained)
    case 'injured':
      return soldiers.filter(s => s.injuredUntil && s.injuredUntil > now)
    default:
      return soldiers
  }
}

/** 3D soldier model for card preview */
function CardSoldierModel({ trained, isInjured }: { trained: boolean; isInjured: boolean }) {
  const soldier = useMemo(() => createFlexSoldier(0x5b8c5a), [])
  const elapsed = useRef(0)

  useFrame(({ invalidate }, dt) => {
    elapsed.current += dt
    if (trained && !isInjured) {
      animateFlexSoldier(soldier, 'idle', elapsed.current, dt)
    }
    invalidate()
  })

  return <primitive object={soldier.group} />
}

/** Single soldier card */
function SoldierCard({
  soldier,
  index,
  onTap,
}: {
  soldier: SoldierRecord
  index: number
  onTap: () => void
}) {
  const xp = soldier.xp ?? 0
  const rank = getRank(xp)
  const nextRank = getNextRank(xp)
  const xpProgress = nextRank
    ? ((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100
    : 100
  const isInjured = !!(soldier.injuredUntil && soldier.injuredUntil > Date.now())
  const trainedBrains = soldier.trainedBrains ? Object.keys(soldier.trainedBrains) : []

  return (
    <div
      className="roster-soldier-card"
      style={{
        borderLeftColor: rank.color,
        animationDelay: `${index * 0.06}s`,
      }}
      onClick={() => { sfx.buttonTap(); onTap() }}
    >
      {/* 3D soldier preview */}
      <div
        className="roster-card-canvas"
        style={{
          filter: isInjured ? 'saturate(0.3) brightness(0.7)' : soldier.trained ? 'none' : 'brightness(0.5)',
        }}
      >
        <Canvas
          camera={{ position: [0, 0.8, 2.2], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          frameloop="demand"
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 3, 4]} intensity={0.9} />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} color={0x88aaff} />
          <CardSoldierModel trained={soldier.trained} isInjured={isInjured} />
        </Canvas>
        {isInjured && <div className="roster-card-injured-overlay" />}
      </div>

      {/* Info panel */}
      <div className="roster-card-info">
        <div className="roster-card-name-row">
          <span className="roster-card-name">{soldier.name}</span>
          <RankBadge xp={xp} size="sm" />
        </div>

        <div className="roster-card-weapon">
          {WEAPON_LABELS[soldier.weapon] ?? soldier.weapon}
          {trainedBrains.length > 0 && (
            <span className="roster-card-brains">{trainedBrains.length} {trainedBrains.length === 1 ? 'BRAIN' : 'BRAINS'}</span>
          )}
        </div>

        {/* Mini XP bar */}
        <div className="roster-card-xp-bar">
          <div
            className="roster-card-xp-fill"
            style={{
              width: `${Math.min(100, xpProgress)}%`,
              background: `linear-gradient(90deg, ${rank.color}, ${nextRank?.color ?? rank.color})`,
            }}
          />
        </div>

        {/* Status */}
        <div className="roster-card-status">
          {isInjured ? (
            <>
              <span className="roster-status-dot injured" />
              <span className="roster-status-text injured">INJURED</span>
            </>
          ) : soldier.trained ? (
            <>
              <span className="roster-status-dot ready" />
              <span className="roster-status-text ready">READY</span>
            </>
          ) : (
            <>
              <span className="roster-status-dot untrained" />
              <span className="roster-status-text untrained">UNTRAINED</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
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
    setSoldierSheetId(id)
  }, [setSoldierSheetId])

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
            {(['all', 'ready', 'trained', 'injured'] as FilterBy[]).map(f => (
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
            <div className="roster-card-grid">
              {displaySoldiers.map((sol, i) => (
                <SoldierCard
                  key={sol.id}
                  soldier={sol}
                  index={i}
                  onTap={() => handleTapSoldier(sol.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
