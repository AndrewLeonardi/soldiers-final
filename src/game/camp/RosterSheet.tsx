/**
 * RosterSheet — 2-column card grid with 3D soldier models.
 *
 * Sprint 4 polish: removed sort/filter buttons, auto-sorts by most trained.
 * Each card shows a rotating 3D soldier, rank-colored border, name, weapon,
 * XP bar, status indicator. Tap card to open full-screen SoldierSheet detail.
 */
import { useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { RankBadge } from './RankBadge'
import { getRank, getNextRank } from '@config/ranks'
import { createFlexSoldier, animateFlexSoldier } from '@three/models/flexSoldier'
import type { SoldierRecord } from '@stores/campStore'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

const WEAPON_LABELS: Record<string, string> = {
  rifle: 'RIFLE',
  rocketLauncher: 'ROCKET',
  grenade: 'GRENADES',
  machineGun: 'MG',
  tank: 'TANK',
}

/** Default sort: most trained brains (desc), then XP (desc) */
function sortByMostTrained(soldiers: SoldierRecord[]): SoldierRecord[] {
  return [...soldiers].sort((a, b) => {
    const aBrains = a.trainedBrains ? Object.keys(a.trainedBrains).length : 0
    const bBrains = b.trainedBrains ? Object.keys(b.trainedBrains).length : 0
    if (bBrains !== aBrains) return bBrains - aBrains
    return (b.xp ?? 0) - (a.xp ?? 0)
  })
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
          camera={{ position: [0, 0.2, 3.6], fov: 40 }}
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

  const displaySoldiers = useMemo(() => sortByMostTrained(soldiers), [soldiers])

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
          <span className="game-sheet-title">SOLDIERS</span>
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

          {/* Sort indicator */}
          <div className="roster-sort-bar">
            <span className="roster-sort-label">MOST TRAINED FIRST</span>
          </div>

          {soldiers.length === 0 ? (
            <div className="store-empty">No soldiers recruited yet</div>
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
