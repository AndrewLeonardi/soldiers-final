/**
 * RecruitSheet — bottom sheet for recruiting new soldiers with gold.
 *
 * Sprint A. Opens from the gold "+" button in the HUD.
 * Shows 3 random name options. Tap a name to recruit for SOLDIER_RECRUIT_COST gold.
 */
import { useState, useCallback, useMemo } from 'react'
import { useSceneStore } from '@stores/sceneStore'
import { useCampStore } from '@stores/campStore'
import { SOLDIER_RECRUIT_COST, getRecruitNameOptions } from '@config/roster'
import { GoldCoinIcon } from './GoldCoinIcon'
import * as sfx from '@audio/sfx'
import '@styles/camp-ui.css'

export function RecruitSheet() {
  const isOpen = useSceneStore((s) => s.recruitSheetOpen)
  const setRecruitSheetOpen = useSceneStore((s) => s.setRecruitSheetOpen)
  const gold = useCampStore((s) => s.gold)
  const recruitSoldier = useCampStore((s) => s.recruitSoldier)
  const soldiers = useCampStore((s) => s.soldiers)

  // Generate 3 name options when sheet opens
  const [nameOptions, setNameOptions] = useState<string[]>([])

  // Refresh names each time sheet opens
  const refreshNames = useCallback(() => {
    setNameOptions(getRecruitNameOptions())
  }, [])

  // Refresh on open
  useMemo(() => {
    if (isOpen) refreshNames()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const canAfford = gold >= SOLDIER_RECRUIT_COST

  const handleRecruit = useCallback((name: string) => {
    if (!canAfford) return
    const success = recruitSoldier(name)
    if (success) {
      sfx.buttonTap()
      setRecruitSheetOpen(false)
    }
  }, [canAfford, recruitSoldier, setRecruitSheetOpen])

  const handleClose = useCallback(() => {
    setRecruitSheetOpen(false)
  }, [setRecruitSheetOpen])

  if (!isOpen) return null

  return (
    <div className="game-sheet-backdrop" onClick={handleClose}>
      <div className="game-sheet recruit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="game-sheet-header">
          <span className="game-sheet-title">RECRUIT SOLDIER</span>
          <span className="recruit-cost">
            <GoldCoinIcon size={14} />
            <span className="recruit-cost-value">{SOLDIER_RECRUIT_COST}</span>
          </span>
        </div>

        <div className="game-sheet-body">
          <div className="recruit-balance">
            <GoldCoinIcon size={18} />
            <span className="recruit-balance-value">{gold}</span>
            <span className="recruit-balance-label">GOLD</span>
          </div>

          <div className="recruit-squad-count">
            SQUAD: {soldiers.length} SOLDIERS
          </div>

          {!canAfford && (
            <div className="recruit-insufficient">
              NOT ENOUGH GOLD
            </div>
          )}

          <div className="recruit-name-grid">
            {nameOptions.map((name) => (
              <button
                key={name}
                className={`recruit-name-card ${canAfford ? '' : 'disabled'}`}
                onClick={() => handleRecruit(name)}
                disabled={!canAfford}
              >
                <span className="recruit-name-rank">{name.split(' ')[0]}</span>
                <span className="recruit-name-call">{name.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>

          <button className="recruit-reroll" onClick={refreshNames}>
            REROLL NAMES
          </button>
        </div>
      </div>
    </div>
  )
}
