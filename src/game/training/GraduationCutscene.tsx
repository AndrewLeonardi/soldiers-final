/**
 * GraduationCutscene — the "SKILL LEARNED!" modal that celebrates a
 * completed training run in /game-concept.
 *
 * Appears as a full-screen HTML overlay when any training slot
 * transitions to `phase === 'graduated'`. Mirrors the visual language
 * of the existing `/play` `GraduationBanner` (three gold stars
 * spinning in, bold display-font title, weapon name, fitness +
 * generation stats, big gold SAVE & CONTINUE button) but reads from
 * the NEW training store and commits through the NEW roster surface,
 * so nothing here depends on retiring `/play` code.
 *
 * Pairs with the 3D `ConfettiEffect` mounted inside
 * `TrainingGroundsInterior` — the confetti burst fires at the same
 * time the cutscene pops, giving the player a diegetic + HTML
 * celebration combo. The fanfare SFX fires via `sfx.graduationFanfare`
 * on mount.
 *
 * ─ Why a dedicated cutscene component ─
 *
 * The HUD already had a SAVE & CONTINUE button in its bottom-center
 * slot during the `graduated` phase. Step 8 moves that action into
 * the cutscene so the player's full attention is on the celebration
 * moment instead of being split between a top-left generation
 * counter and a bottom-center action button. The HUD correspondingly
 * hides its bottom-center button during graduation; the top-of-
 * screen panels (generation, fitness, speed toggle) stay visible
 * behind the modal's 78% black backdrop so the player still sees
 * "GEN 01 / 100%" as narrative context during the celebration.
 *
 * ─ What this does NOT own ─
 *
 * - The confetti burst lives in the 3D scene (`TrainingGroundsInterior`),
 *   not here.
 * - The camera stays on its observation shot — no cutscene camera move.
 * - The rename affordance is step 9; this cutscene uses whatever name
 *   the soldier currently has on the roster.
 */
import { useEffect } from 'react'
import { useTrainingStore } from '@game/stores/trainingStore'
import { useRosterStore } from '@stores/rosterStore'
import { WEAPON_DISPLAY } from '@config/roster'
import { StarIcon } from '@ui/ToyIcons'
import * as sfx from '@audio/sfx'
import '@game/ui/training-hud.css'

/** Phase 3a slot id — single-trainee Phase 3a hardcoding. */
const PHASE_3A_SLOT_ID = 'slot-rocket-ace'

export function GraduationCutscene() {
  // Atomic selectors per the feedback memory — no consolidated shallow
  // selector. The parent store rarely updates while the cutscene is
  // open (only the commit action transitions phase), so these are
  // effectively one-shot reads after mount.
  const observing = useTrainingStore((s) => s.observing)
  const slot = useTrainingStore((s) =>
    s.observing ? s.slots[s.observing] : null,
  )

  // Play the fanfare exactly once, on the rising edge into the
  // graduated state. We key the effect on `slot?.phase` so a
  // refresh of the same graduated slot doesn't re-trigger the sound.
  const phase = slot?.phase
  useEffect(() => {
    if (phase === 'graduated') {
      sfx.graduationFanfare()
    }
  }, [phase])

  if (!observing || !slot || phase !== 'graduated') return null

  // Look up the soldier's current display name from the roster. The
  // training store only holds the soldier id; all name/rank surfaces
  // go through the roster as the source of truth.
  const soldier = useRosterStore
    .getState()
    .soldiers.find((s) => s.id === slot.soldierId)
  const soldierName = soldier?.name ?? 'Unknown Soldier'
  const weaponName = WEAPON_DISPLAY[slot.weapon]?.name ?? slot.weapon

  const bestFitnessPct = Math.round(slot.bestFitness * 100)
  const generationCount = slot.generation

  const handleCommit = (): void => {
    sfx.buttonTap()
    useTrainingStore.getState().commitGraduation(PHASE_3A_SLOT_ID)
  }

  return (
    <div className="gcut" role="dialog" aria-modal="true" aria-label="Training graduation">
      <div className="gcut__card">
        <div className="gcut__stars" aria-hidden="true">
          <StarIcon size={52} color="#FFD700" />
          <StarIcon size={52} color="#FFD700" />
          <StarIcon size={52} color="#FFD700" />
        </div>

        <div className="gcut__title">Skill Learned!</div>

        <div className="gcut__soldier">{soldierName}</div>
        <div className="gcut__weapon">+ {weaponName}</div>

        <div className="gcut__stats">
          <div>
            Fitness
            <strong>{bestFitnessPct}%</strong>
          </div>
          <div>
            Generations
            <strong>{generationCount}</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCommit}
          className="gcut__action"
          aria-label="Save trained brain and continue"
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  )
}
