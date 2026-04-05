// ── Web Audio synthesis engine ──────────────────────────
// All sounds built from noise buffers, oscillators, and filters.
// Zero external audio files. Every sound is generated at runtime.

let noiseBuffer: AudioBuffer | null = null

/** Create a 1-second white noise buffer (reused by all noise-based sounds) */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const length = ctx.sampleRate
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/** ASR envelope helper */
function envelope(
  gain: GainNode,
  ctx: AudioContext,
  attack: number,
  sustain: number,
  decay: number,
  peak = 1,
) {
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0.001, t)
  gain.gain.linearRampToValueAtTime(peak, t + attack)
  gain.gain.setValueAtTime(peak, t + attack + sustain)
  gain.gain.exponentialRampToValueAtTime(0.001, t + attack + sustain + decay)
}

/** Create a noise source node with optional filter */
function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  duration: number,
  filterType: BiquadFilterType = 'bandpass',
  filterFreq = 3000,
  filterQ = 1,
  volume = 0.3,
): GainNode {
  const source = ctx.createBufferSource()
  source.buffer = getNoiseBuffer(ctx)

  const filter = ctx.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = filterFreq
  filter.Q.value = filterQ

  const gain = ctx.createGain()
  envelope(gain, ctx, 0.003, 0, duration, volume)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  source.start(ctx.currentTime)
  source.stop(ctx.currentTime + duration + 0.05)
  return gain
}

// ═══════════════════════════════════════════════════
// BATTLE SOUNDS
// ═══════════════════════════════════════════════════

export function synthRifleShot(dest: AudioNode, ctx: AudioContext): number {
  noiseBurst(ctx, dest, 0.08, 'bandpass', 3000, 2, 0.25)
  // Add a tiny click transient
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 1500
  envelope(g, ctx, 0.001, 0, 0.02, 0.15)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.03)
  return 0.1
}

export function synthMGBurst(dest: AudioNode, ctx: AudioContext): number {
  // 3 rapid clicks
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.035
    const source = ctx.createBufferSource()
    source.buffer = getNoiseBuffer(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2500
    filter.Q.value = 1.5
    const g = ctx.createGain()
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(0.2, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025)
    source.connect(filter)
    filter.connect(g)
    g.connect(dest)
    source.start(t)
    source.stop(t + 0.04)
  }
  return 0.15
}

export function synthRocketLaunch(dest: AudioNode, ctx: AudioContext): number {
  // Low noise burst (ignition)
  noiseBurst(ctx, dest, 0.15, 'lowpass', 600, 1, 0.2)

  // Sine sweep (whoosh) 200→800Hz
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)
  envelope(g, ctx, 0.02, 0.1, 0.25, 0.15)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.45)
  return 0.45
}

export function synthGrenadeThrow(dest: AudioNode, ctx: AudioContext): number {
  noiseBurst(ctx, dest, 0.06, 'bandpass', 800, 1, 0.12)
  return 0.08
}

export function synthExplosionLarge(dest: AudioNode, ctx: AudioContext): number {
  const t = ctx.currentTime

  // Noise body
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = getNoiseBuffer(ctx)
  const nFilter = ctx.createBiquadFilter()
  nFilter.type = 'lowpass'
  nFilter.frequency.setValueAtTime(2000, t)
  nFilter.frequency.exponentialRampToValueAtTime(200, t + 0.6)
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.001, t)
  nGain.gain.linearRampToValueAtTime(0.4, t + 0.01)
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
  noiseSource.connect(nFilter)
  nFilter.connect(nGain)
  nGain.connect(dest)
  noiseSource.start(t)
  noiseSource.stop(t + 0.75)

  // Sub-bass thump
  const bass = ctx.createOscillator()
  const bGain = ctx.createGain()
  bass.frequency.setValueAtTime(50, t)
  bass.frequency.exponentialRampToValueAtTime(25, t + 0.5)
  bGain.gain.setValueAtTime(0.001, t)
  bGain.gain.linearRampToValueAtTime(0.35, t + 0.01)
  bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  bass.connect(bGain)
  bGain.connect(dest)
  bass.start(t)
  bass.stop(t + 0.65)

  return 0.75
}

export function synthExplosionSmall(dest: AudioNode, ctx: AudioContext): number {
  const t = ctx.currentTime

  // Noise body (shorter)
  noiseBurst(ctx, dest, 0.2, 'lowpass', 1500, 1, 0.3)

  // Thump
  const bass = ctx.createOscillator()
  const g = ctx.createGain()
  bass.frequency.setValueAtTime(60, t)
  bass.frequency.exponentialRampToValueAtTime(30, t + 0.3)
  envelope(g, ctx, 0.005, 0, 0.3, 0.25)
  bass.connect(g)
  g.connect(dest)
  bass.start(t)
  bass.stop(t + 0.35)

  return 0.4
}

export function synthBulletImpact(dest: AudioNode, ctx: AudioContext): number {
  noiseBurst(ctx, dest, 0.015, 'highpass', 4000, 1, 0.15)
  return 0.03
}

export function synthDeathThud(dest: AudioNode, ctx: AudioContext): number {
  noiseBurst(ctx, dest, 0.08, 'lowpass', 300, 0.8, 0.25)

  // Low thump
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 80
  envelope(g, ctx, 0.005, 0, 0.1, 0.2)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.12)

  return 0.12
}

// ═══════════════════════════════════════════════════
// UI SOUNDS
// ═══════════════════════════════════════════════════

export function synthButtonTap(dest: AudioNode, ctx: AudioContext): number {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 800
  osc.type = 'sine'
  envelope(g, ctx, 0.003, 0, 0.025, 0.12)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.04)
  return 0.04
}

export function synthRecruitChime(dest: AudioNode, ctx: AudioContext): number {
  const t = ctx.currentTime
  // Two ascending tones
  const notes = [600, 900]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    const start = t + i * 0.08
    g.gain.setValueAtTime(0.001, start)
    g.gain.linearRampToValueAtTime(0.18, start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
    osc.connect(g)
    g.connect(dest)
    osc.start(start)
    osc.stop(start + 0.15)
  })
  return 0.25
}

export function synthDeployHorn(dest: AudioNode, ctx: AudioContext): number {
  const t = ctx.currentTime

  // Two sawtooth harmonics
  const freqs = [200, 300]
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 400
    filter.Q.value = 2

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(0.1, t + 0.02)
    g.gain.setValueAtTime(0.1, t + 0.15)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)

    osc.connect(filter)
    filter.connect(g)
    g.connect(dest)
    osc.start(t)
    osc.stop(t + 0.4)
  })
  return 0.4
}

export function synthWeaponEquip(dest: AudioNode, ctx: AudioContext): number {
  // Metallic click
  noiseBurst(ctx, dest, 0.01, 'highpass', 3000, 2, 0.15)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 1200
  envelope(g, ctx, 0.002, 0, 0.015, 0.1)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.03)
  return 0.03
}

// ═══════════════════════════════════════════════════
// TRAINING SOUNDS
// ═══════════════════════════════════════════════════

export function synthTargetHitPop(dest: AudioNode, ctx: AudioContext): number {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(1000, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.06)
  envelope(g, ctx, 0.003, 0, 0.06, 0.15)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
  return 0.08
}

export function synthGraduationFanfare(dest: AudioNode, ctx: AudioContext): number {
  const t = ctx.currentTime
  // 3-note ascending: C5, E5, G5
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    const start = t + i * 0.13
    g.gain.setValueAtTime(0.001, start)
    g.gain.linearRampToValueAtTime(0.2, start + 0.01)
    g.gain.setValueAtTime(0.2, start + 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
    osc.connect(g)
    g.connect(dest)
    osc.start(start)
    osc.stop(start + 0.25)
  })
  return 0.5
}

// ═══════════════════════════════════════════════════
// TUTORIAL SOUNDS
// ═══════════════════════════════════════════════════

export function synthModalAppear(dest: AudioNode, ctx: AudioContext): number {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(400, ctx.currentTime)
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1)
  osc.type = 'sine'
  envelope(g, ctx, 0.01, 0.03, 0.08, 0.08)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.15)
  return 0.15
}

export function synthStepAdvance(dest: AudioNode, ctx: AudioContext): number {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 880
  osc.type = 'sine'
  envelope(g, ctx, 0.003, 0.02, 0.04, 0.1)
  osc.connect(g)
  g.connect(dest)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.07)
  return 0.07
}
