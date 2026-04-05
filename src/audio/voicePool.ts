// ── Voice pool: polyphony management ────────────────────
// Prevents audio overload when 10 soldiers fire simultaneously.
// Each sound category gets a max voice count + cooldown timer.

export interface VoicePool {
  /** Returns true if a voice is available (not on cooldown, within max) */
  canPlay(): boolean
  /** Mark a voice as started. Call after beginning playback. */
  noteOn(): void
  /** Mark a voice as ended. Call when sound finishes. */
  noteOff(): void
}

export function createVoicePool(maxVoices: number, cooldownMs = 25): VoicePool {
  let activeCount = 0
  let lastPlayTime = 0

  return {
    canPlay() {
      if (activeCount >= maxVoices) return false
      const now = performance.now()
      if (now - lastPlayTime < cooldownMs) return false
      return true
    },

    noteOn() {
      activeCount++
      lastPlayTime = performance.now()
    },

    noteOff() {
      activeCount = Math.max(0, activeCount - 1)
    },
  }
}
