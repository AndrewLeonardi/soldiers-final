/**
 * RosterSheet — 2×3 slot-based grid with 3D soldier models.
 *
 * Always shows 6 slots: filled soldiers, empty unlocked slots, locked slots.
 * Each filled card shows a rotating 3D soldier, rank-colored border, name, weapon,
 * XP bar, status indicator. Tap card to open SoldierSheet detail.
 * Empty slots open RecruitSheet. Locked slots show level requirement.
 */
import { useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCampStore, getMaxSoldierSlots, SLOT_MILESTONES } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { RankBadge } from './RankBadge'
import { getRank, getNextRank } from '@config/ranks'
import { createFlexSoldier, animateFlexSoldier } from '@three/models/flexSoldier'
import { LockIcon } from './icons/LockIcon'
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

const TOTAL_SLOTS = 6

/** Default sort: most trained brains (desc), then XP (desc) */
function sortByMostTrained(soldiers: SoldierRecord[]): SoldierRecord[] {
  return [...soldiers].sort((a, b) => {
    const aBrains = a.trainedBrains ? Object.keys(a.trainedBrains).length : 0
    const bBrains = b.trainedBrains ? Object.keys(b.trainedBrains).length : 0
    if (bBrains !== aBrains) return bBrains - aBrains
    return (b.xp ?? 0) - (a.xp ?? 0)
  })
}

/** Find the level that unlocks a given slot index (0-based) */
function getLevelForSlot(slotIndex: number): number | null {
  // Slots 0-1 are always unlocked (base = 2 slots)
  if (slotIndex < 2) return null
  // Walk milestones to find which level unlocks this slot count
  const sortedMilestones = Object.entries(SLOT_MILESTONES)
    .map(([lvl, count]) => ({ level: Number(lvl), count }))
    .sort((a, b) => a.level - b.level)
  for (const { level, count } of sortedMilestones) {
    if (slotIndex < count) return level
  }
  // Fallback: highest milestone level
  return sortedMilestones[sortedMilestones.length - 1]?.level ?? null
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

/** Empty unlocked slot — big "+" to recruit */
function EmptySlotCard({ index, onTap }: { index: number; onTap: () => void }) {
  return (
    <div
      className="roster-soldier-card roster-empty-slot"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={() => { sfx.buttonTap(); onTap() }}
    >
      <div className="roster-empty-slot-plus">+</div>
      <div className="roster-empty-slot-label">SLOT AVAILABLE</div>
    </div>
  )
}

/** Locked slot — grayed out with lock + level requirement */
function LockedSlotCard({ index, requiredLevel }: { index: number; requiredLevel: number }) {
  return (
    <div
      className="roster-soldier-card roster-locked-slot"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="roster-locked-slot-icon">
        <LockIcon size={28} color="rgba(180,180,180,0.5)" />
      </div>
      <div className="roster-locked-slot-level">LEVEL {requiredLevel}</div>
    </div>
  )
}

export function RosterSheet() {
  const isOpen = useSceneStore((s) => s.rosterSheetOpen)
  const setRosterSheetOpen = useSceneStore((s) => s.setRosterSheetOpen)
  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)
  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)
  const soldiers = useCampStore((s) => s.soldiers)
  const battlesCompleted = useCampStore((s) => s.battlesCompleted)

  const maxSlots = useMemo(() => getMaxSoldierSlots(battlesCompleted), [battlesCompleted])
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

  // Build the 6-slot array: filled, empty unlocked, locked
  const slotElements: React.ReactNode[] = []

  // 1. Filled slots
  displaySoldiers.forEach((sol, i) => {
    slotElements.push(
      <SoldierCard
        key={sol.id}
        soldier={sol}
        index={i}
        onTap={() => handleTapSoldier(sol.id)}
      />
    )
  })

  // 2. Empty unlocked slots
  const emptyUnlocked = maxSlots - soldiers.length
  for (let i = 0; i < emptyUnlocked; i++) {
    const slotIdx = soldiers.length + i
    slotElements.push(
      <EmptySlotCard
        key={`empty-${slotIdx}`}
        index={slotIdx}
        onTap={handleRecruit}
      />
    )
  }

  // 3. Locked slots
  const lockedCount = TOTAL_SLOTS - maxSlots
  for (let i = 0; i < lockedCount; i++) {
    const slotIdx = maxSlots + i
    const requiredLevel = getLevelForSlot(slotIdx) ?? 10
    slotElements.push(
      <LockedSlotCard
        key={`locked-${slotIdx}`}
        index={slotIdx}
        requiredLevel={requiredLevel}
      />
    )
  }

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet roster-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">SOLDIERS</span>
          <span className="roster-count">SQUAD: {soldiers.length}/{maxSlots}</span>
        </div>

        <div className="game-sheet-body">
          <div className="roster-slot-grid">
            {slotElements}
          </div>
        </div>
      </div>
    </div>
  )
}
