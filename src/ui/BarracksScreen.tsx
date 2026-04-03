import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { SOLDIER_RECRUIT_COST } from '@config/roster'
import { GoldCoinIcon, MicrochipIcon, BattleIcon } from './ToyIcons'
import '@styles/barracks.css'

export function BarracksScreen() {
  const phase = useGameStore((s) => s.phase)
  const gold = useGameStore((s) => s.gold)
  const compute = useGameStore((s) => s.compute)
  const setPhase = useGameStore((s) => s.setPhase)

  const recruitSoldier = useRosterStore((s) => s.recruitSoldier)
  const detailSoldierId = useRosterStore((s) => s.detailSoldierId)

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
          <div className="barracks-hint">
            Tap a soldier to configure
          </div>
          <div className="barracks-bottom-row">
            <button
              className="barracks-recruit-btn"
              onPointerDown={() => recruitSoldier()}
              disabled={gold < SOLDIER_RECRUIT_COST}
            >
              + Recruit
              <span className="barracks-recruit-cost">
                <GoldCoinIcon size={14} />
                {SOLDIER_RECRUIT_COST}
              </span>
            </button>
            <button
              className="btn-action-red barracks-deploy"
              onPointerDown={() => setPhase('placement')}
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
