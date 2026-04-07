// ── Sound Effects Public API ────────────────────────────
// Fire-and-forget functions. Import this file and call directly.
// All sounds are synthesized at runtime via Web Audio API.
//
// Usage:
//   import * as sfx from '@audio/sfx'
//   sfx.rifleShot()
//   sfx.explosionLarge()

import { ensureContext, getMasterGain } from './context'
import { createVoicePool } from './voicePool'
import {
  synthRifleShot,
  synthMGBurst,
  synthRocketLaunch,
  synthGrenadeThrow,
  synthExplosionLarge,
  synthExplosionSmall,
  synthBulletImpact,
  synthDeathThud,
  synthButtonTap,
  synthRecruitChime,
  synthDeployHorn,
  synthWeaponEquip,
  synthTargetHitPop,
  synthGraduationFanfare,
  synthModalAppear,
  synthStepAdvance,
  synthFallScream,
} from './synthEngine'

// Re-export volume controls
export { setMasterVolume, mute, unmute } from './context'

// ── Voice pools ─────────────────────────────────────────
const pools = {
  rifle:          createVoicePool(8, 25),
  mg:             createVoicePool(6, 20),
  rocket:         createVoicePool(4, 50),
  grenade:        createVoicePool(4, 50),
  explosionLarge: createVoicePool(3, 80),
  explosionSmall: createVoicePool(4, 60),
  bulletImpact:   createVoicePool(6, 15),
  deathThud:      createVoicePool(4, 40),
  ui:             createVoicePool(3, 30),
  fanfare:        createVoicePool(1, 200),
}

/** Play a sound through a voice pool. Returns true if played. */
function play(
  pool: ReturnType<typeof createVoicePool>,
  synthFn: (dest: AudioNode, ctx: AudioContext) => number,
): boolean {
  if (!pool.canPlay()) return false
  const ctx = ensureContext()
  if (ctx.state === 'suspended') return false

  const dest = getMasterGain()
  pool.noteOn()
  const duration = synthFn(dest, ctx)

  // Auto release voice after sound duration
  setTimeout(() => pool.noteOff(), duration * 1000 + 50)
  return true
}

// ═══════════════════════════════════════════════════
// BATTLE
// ═══════════════════════════════════════════════════

export function rifleShot(): void {
  play(pools.rifle, synthRifleShot)
}

export function mgBurst(): void {
  play(pools.mg, synthMGBurst)
}

export function rocketLaunch(): void {
  play(pools.rocket, synthRocketLaunch)
}

export function grenadeThrow(): void {
  play(pools.grenade, synthGrenadeThrow)
}

export function explosionLarge(): void {
  play(pools.explosionLarge, synthExplosionLarge)
}

export function explosionSmall(): void {
  play(pools.explosionSmall, synthExplosionSmall)
}

export function bulletImpact(): void {
  play(pools.bulletImpact, synthBulletImpact)
}

export function deathThud(): void {
  play(pools.deathThud, synthDeathThud)
}

// ═══════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════

export function buttonTap(): void {
  play(pools.ui, synthButtonTap)
}

export function recruitChime(): void {
  play(pools.ui, synthRecruitChime)
}

export function deployHorn(): void {
  play(pools.ui, synthDeployHorn)
}

export function weaponEquip(): void {
  play(pools.ui, synthWeaponEquip)
}

// ═══════════════════════════════════════════════════
// TRAINING
// ═══════════════════════════════════════════════════

export function targetHitPop(): void {
  play(pools.ui, synthTargetHitPop)
}

export function graduationFanfare(): void {
  play(pools.fanfare, synthGraduationFanfare)
}

// ═══════════════════════════════════════════════════
// TUTORIAL
// ═══════════════════════════════════════════════════

export function modalAppear(): void {
  play(pools.ui, synthModalAppear)
}

export function stepAdvance(): void {
  play(pools.ui, synthStepAdvance)
}

export function completionFanfare(): void {
  play(pools.fanfare, synthGraduationFanfare)
}

// ═══════════════════════════════════════════════════
// MISC
// ═══════════════════════════════════════════════════

export function fallScream(): void {
  play(pools.ui, synthFallScream)
}
