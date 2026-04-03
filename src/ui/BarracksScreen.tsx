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
          <div className="hud-resource">
            <GoldCoinIcon size={18} />
            <span className="hud-resource-value">{gold}</span>
          </div>
          <div className="hud-resource">
            <MicrochipIcon size={16} color="#4ADE80" />
            <span className="hud-resource-value">{compute}</span>
          </div>
        </div>
      </div>

      {/* Bottom: recruit + deploy */}
      <div className="barracks-bottom">
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
              <GoldCoinIcon size={12} />
              {SOLDIER_RECRUIT_COST}
            </span>
          </button>
          <button
            className="barracks-deploy"
            onPointerDown={() => setPhase('placement')}
          >
            <BattleIcon size={20} color="white" />
            Deploy
          </button>
        </div>
      </div>
    </div>
  )
}
