import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { useTutorialStore } from '@stores/tutorialStore'
import { SOLDIER_RECRUIT_COST } from '@config/roster'
import * as sfx from '@audio/sfx'
import { GoldCoinIcon, MicrochipIcon, BattleIcon } from './ToyIcons'
import '@styles/barracks.css'

export function BarracksScreen() {
  const phase = useGameStore((s) => s.phase)
  const gold = useGameStore((s) => s.gold)
  const compute = useGameStore((s) => s.compute)
  const setPhase = useGameStore((s) => s.setPhase)

  const recruitSoldier = useRosterStore((s) => s.recruitSoldier)
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)

  // During tutorial tap-soldier step, lock buttons so player must tap the soldier
  const tutorialActive = useTutorialStore((s) => s.active)
  const tutorialStep = useTutorialStore((s) => s.step)
  const isTapSoldierStep = tutorialActive && tutorialStep === 'tap-soldier'

  if (phase !== 'loadout' || detailSoldierId) return null

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

      {/* Bottom: recruit + deploy */}
      <div className="barracks-bottom">
        <div className="barracks-bottom-panel">
          {/* Hide default hint during tutorial (tutorial overlay shows its own) */}
          {!isTapSoldierStep && (
            <div className="barracks-hint">
              Tap a soldier to configure
            </div>
          )}
          <div className="barracks-bottom-row">
            <button
              className="barracks-recruit-btn"
              onPointerDown={() => {
                const success = recruitSoldier()
                if (success) sfx.recruitChime()
                if (success && useTutorialStore.getState().isStep('recruit')) {
                  useTutorialStore.getState().advanceTo('tap-soldier')
                }
              }}
              disabled={gold < SOLDIER_RECRUIT_COST || isTapSoldierStep}
            >
              + Recruit
              <span className="barracks-recruit-cost">
                <GoldCoinIcon size={14} />
                {SOLDIER_RECRUIT_COST}
              </span>
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
