import { useState } from 'react'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { useTutorialStore } from '@stores/tutorialStore'
import { SOLDIER_RECRUIT_COST, getRecruitNameOptions } from '@config/roster'
import * as sfx from '@audio/sfx'
import { GoldCoinIcon, MicrochipIcon, BattleIcon } from './ToyIcons'
import '@styles/barracks.css'

export function BarracksScreen() {
  const phase = useGameStore((s) => s.phase)
  const gold = useGameStore((s) => s.gold)
  const compute = useGameStore((s) => s.compute)
  const setPhase = useGameStore((s) => s.setPhase)
  const openStore = useGameStore((s) => s.openStore)
  const lastClaimTime = useGameStore((s) => s.lastDailyClaimTime)

  const recruitSoldier = useRosterStore((s) => s.recruitSoldier)
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)

  const tutorialActive = useTutorialStore((s) => s.active)
  const tutorialStep = useTutorialStore((s) => s.step)
  const isTapSoldierStep = tutorialActive && tutorialStep === 'tap-soldier'

  // Recruit name selection modal
  const [showRecruitModal, setShowRecruitModal] = useState(false)
  const [nameOptions, setNameOptions] = useState<string[]>([])

  if (phase !== 'loadout' || detailSoldierId) return null

  function handleRecruitTap() {
    // During tutorial, use instant recruit (no modal)
    if (tutorialActive) {
      const success = recruitSoldier()
      if (success) sfx.recruitChime()
      if (success && useTutorialStore.getState().isStep('recruit')) {
        useTutorialStore.getState().advanceTo('tap-soldier')
      }
      return
    }
    // Normal: show name selection modal
    setNameOptions(getRecruitNameOptions())
    setShowRecruitModal(true)
    sfx.buttonTap()
  }

  function handleNameSelect(name: string) {
    const success = recruitSoldier(name)
    if (success) sfx.recruitChime()
    setShowRecruitModal(false)
  }

  return (
    <div className="barracks-overlay">
      {/* Top: resources */}
      <div className="barracks-top">
        <div className="barracks-title">Barracks</div>
        <div className="barracks-resources">
          <div className="resource-pill">
            <GoldCoinIcon size={20} />
            <span className="value">{gold}</span>
          </div>
          <div className="resource-pill">
            <MicrochipIcon size={18} color="#4ADE80" />
            <span className="value">{compute}</span>
          </div>
        </div>
      </div>

      {/* Recruit name selection modal */}
      {showRecruitModal && (
        <div className="recruit-modal-overlay">
          <div className="recruit-modal">
            <div className="recruit-modal-title">CHOOSE YOUR RECRUIT</div>
            <div className="recruit-modal-subtitle">Select a name for your new soldier</div>
            <div className="recruit-name-options">
              {nameOptions.map((name) => (
                <button
                  key={name}
                  className="recruit-name-btn"
                  onPointerDown={() => handleNameSelect(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className="recruit-cancel-btn"
              onPointerDown={() => setShowRecruitModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom: recruit + store + deploy */}
      <div className="barracks-bottom">
        <div className="barracks-bottom-panel">
          {!isTapSoldierStep && (
            <div className="barracks-hint">
              Tap a soldier to configure
            </div>
          )}
          <div className="barracks-bottom-row">
            <button
              className="barracks-recruit-btn"
              onPointerDown={handleRecruitTap}
              disabled={gold < SOLDIER_RECRUIT_COST || isTapSoldierStep}
            >
              + Recruit
              <span className="barracks-recruit-cost">
                <GoldCoinIcon size={14} />
                {SOLDIER_RECRUIT_COST}
              </span>
            </button>
            <button
              className="barracks-store-btn"
              onPointerDown={() => { sfx.buttonTap(); openStore() }}
              disabled={isTapSoldierStep}
            >
              <MicrochipIcon size={16} color="#4ADE80" />
              Store
              {Date.now() - lastClaimTime >= 86400000 && (
                <span className="store-notify-dot" />
              )}
            </button>
            <button
              className="btn-action-red barracks-deploy"
              onPointerDown={() => { sfx.buttonTap(); setPhase('placement') }}
              disabled={isTapSoldierStep}
            >
              <BattleIcon size={22} color="white" />
              Deploy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
