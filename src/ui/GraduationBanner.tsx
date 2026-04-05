import { useEffect } from 'react'
import { useTrainingStore } from '@stores/trainingStore'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { useTutorialStore } from '@stores/tutorialStore'
import * as sfx from '@audio/sfx'
import { WEAPON_DISPLAY } from '@config/roster'
import { StarIcon } from './ToyIcons'
import '@styles/training.css'

export function GraduationBanner() {
  const status = useTrainingStore(s => s.status)
  const bestFitness = useTrainingStore(s => s.bestFitness)
  const generation = useTrainingStore(s => s.generation)
  const weapon = useTrainingStore(s => s.weapon)
  const graduate = useTrainingStore(s => s.graduate)
  const setPhase = useGameStore(s => s.setPhase)

  // Play fanfare when graduation happens
  useEffect(() => {
    if (status === 'graduated') sfx.graduationFanfare()
  }, [status])

  if (status !== 'graduated') return null

  const weaponName = weapon ? WEAPON_DISPLAY[weapon]?.name ?? weapon : 'Weapon'

  function handleContinue() {
    graduate()
    setPhase('loadout')
    if (useTutorialStore.getState().isStep('save-training')) {
      // Close soldier detail so we land on barracks (where Deploy button is)
      useRosterStore.getState().closeDetail()
      useTutorialStore.getState().advanceTo('deploy')
    }
  }

  return (
    <div className="graduation-overlay">
      <div className="graduation-content">
        <div className="graduation-stars">
          <StarIcon size={48} color="#FFD700" />
          <StarIcon size={48} color="#FFD700" />
          <StarIcon size={48} color="#FFD700" />
        </div>
        <div className="graduation-title">Skill Learned!</div>
        <div className="graduation-weapon">{weaponName}</div>
        <div className="graduation-stats">
          <div>Fitness: {(bestFitness * 100).toFixed(1)}%</div>
          <div>Generations: {generation}</div>
        </div>
        <button className="graduation-btn" onPointerDown={handleContinue}>
          Save & Continue
        </button>
      </div>
    </div>
  )
}
