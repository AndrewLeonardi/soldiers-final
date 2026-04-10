/**
 * AudioBed — ambient base camp audio loop.
 *
 * Sprint 1, Subsystem 5. One looping low-volume camp ambience
 * (synthesized — light wind + distant noise). Plays from boot.
 * Mute toggle in settings cuts it.
 *
 * Uses a single AudioContext — sprint 3 weapon SFX will hang
 * off the same context.
 */
import { useEffect, useRef } from 'react'
import { useCampStore } from '@stores/campStore'

/** Singleton audio context — shared by all game audio */
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/**
 * Synthesizes a gentle camp ambience using filtered noise.
 * No audio files needed — pure Web Audio API.
 */
function createAmbience(ctx: AudioContext): { gain: GainNode; stop: () => void } {
  // Brown noise (filtered white noise) for wind
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastSample = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    lastSample = (lastSample + 0.02 * white) / 1.02
    data[i] = lastSample * 3.5
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  // Bandpass filter for a warm wind sound
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 200
  filter.Q.value = 0.5

  // Master gain (low volume)
  const gain = ctx.createGain()
  gain.gain.value = 0.08

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()

  return {
    gain,
    stop: () => {
      source.stop()
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    },
  }
}

export function AudioBed() {
  const muted = useCampStore((s) => s.muted)
  const ambienceRef = useRef<{ gain: GainNode; stop: () => void } | null>(null)
  const startedRef = useRef(false)

  // Start ambience on first user interaction (browser autoplay policy)
  useEffect(() => {
    const startAudio = () => {
      if (startedRef.current) return
      startedRef.current = true

      const ctx = getAudioContext()
      if (ctx.state === 'suspended') ctx.resume()
      ambienceRef.current = createAmbience(ctx)

      // Remove listeners after first interaction
      window.removeEventListener('pointerdown', startAudio)
      window.removeEventListener('keydown', startAudio)
    }

    window.addEventListener('pointerdown', startAudio)
    window.addEventListener('keydown', startAudio)

    return () => {
      window.removeEventListener('pointerdown', startAudio)
      window.removeEventListener('keydown', startAudio)
      ambienceRef.current?.stop()
    }
  }, [])

  // Mute/unmute
  useEffect(() => {
    if (ambienceRef.current) {
      ambienceRef.current.gain.gain.setTargetAtTime(
        muted ? 0 : 0.08,
        getAudioContext().currentTime,
        0.1,
      )
    }
  }, [muted])

  return null
}

export { getAudioContext }
