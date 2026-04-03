import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { WEAPON_DISPLAY } from '@config/roster'
import { SoldierIcon, BattleIcon, StarIcon } from './ToyIcons'
import '@styles/briefing.css'

interface MissionBriefingProps {
  onBegin: () => void
}

export function MissionBriefing({ onBegin }: MissionBriefingProps) {
  const phase = useGameStore((s) => s.phase)
  const level = useGameStore((s) => s.level)
  const soldiers = useRosterStore((s) => s.soldiers)

  if (phase !== 'placement') return null

  const levelName = level?.name ?? 'MISSION'

  return (
    <div className="briefing">
      <div className="briefing-card">
        {/* Mission title */}
        <div className="briefing-badge">Mission Briefing</div>
        <div className="briefing-title">{levelName}</div>

        {/* Roster */}
        <div className="briefing-roster-label">Your Squad</div>
        <div className="briefing-roster">
          {soldiers.map((sol) => (
            <div key={sol.id} className="briefing-soldier">
              <div className="briefing-soldier-icon">
                <SoldierIcon size={28} color="#4ADE80" />
              </div>
              <div className="briefing-soldier-info">
                <div className="briefing-soldier-name">{sol.name}</div>
                <div className="briefing-soldier-weapon">
                  {WEAPON_DISPLAY[sol.equippedWeapon].name}
                </div>
              </div>
              <div className="briefing-soldier-stars">
                {[1, 2, 3].map((i) => (
                  <StarIcon
                    key={i}
                    size={10}
                    color={i <= sol.starRating ? '#FFD700' : 'rgba(255,255,255,0.12)'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Begin button */}
        <button className="btn-action-red briefing-begin" onPointerDown={onBegin}>
          <BattleIcon size={22} color="white" />
          Begin
        </button>
      </div>
    </div>
  )
}
