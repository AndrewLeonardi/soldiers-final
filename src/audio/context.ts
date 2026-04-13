// ── AudioContext lifecycle + mobile resume ──────────────
// Single AudioContext shared by all audio. Lazily created on first use.
// Mobile browsers require resume() inside a user gesture handler.

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let resumed = false

export function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5 // default master volume
    masterGain.connect(ctx.destination)
  }
  return ctx
}

export function getMasterGain(): GainNode {
  ensureContext()
  return masterGain!
}

/** Resume AudioContext on first user interaction (iOS Safari requirement) */
export function resumeOnInteraction(): void {
  if (resumed) return
  resumed = true

  // Try to resume immediately (works if user already interacted)
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }

  // Also listen for the next interaction as a fallback
  function handler() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
    document.removeEventListener('touchstart', handler)
    document.removeEventListener('pointerdown', handler)
    document.removeEventListener('click', handler)
  }

  document.addEventListener('touchstart', handler, { once: true })
  document.addEventListener('pointerdown', handler, { once: true })
  document.addEventListener('click', handler, { once: true })
}

export function setMasterVolume(v: number): void {
  const gain = getMasterGain()
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, v)), ensureContext().currentTime)
}

export function mute(): void {
  setMasterVolume(0)
}

export function unmute(): void {
  setMasterVolume(0.5)
}
