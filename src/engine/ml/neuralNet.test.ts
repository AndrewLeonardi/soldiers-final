/**
 * Unit tests for the hand-rolled feedforward neural network.
 *
 * This is the first test file under src/engine/ml/*. The existing ML
 * stack has been in production via /play for a while, but the null-brain
 * factory added in Phase 3a step 1 is the exact class of change that
 * needs a locked-in behavioral contract — every other Phase 3 component
 * (store, interior renderer, combat sims, rival AI) assumes that
 * `NeuralNet.fromZeros()` produces a soldier who literally does nothing.
 * If that contract ever drifts, these tests fail loudly.
 *
 * We also opportunistically cover the rest of the public API while we're
 * here: weight count math, weight round-trip, forward determinism, and
 * the invariant that the default constructor also produces zeros (so the
 * factory's internal `fill(0)` is belt-and-braces, not load-bearing).
 */
import { describe, expect, it } from 'vitest'
import { NeuralNet } from './neuralNet'

// ── weightCount ────────────────────────────────────────────────

describe('NeuralNet.weightCount', () => {
  it('matches the doc comment formula for 6→12→4', () => {
    // (6 * 12 + 12) + (12 * 4 + 4) = 84 + 52 = 136
    expect(NeuralNet.weightCount(6, 12, 4)).toBe(136)
  })

  it('matches the formula for a minimal 1→1→1 net', () => {
    // (1 * 1 + 1) + (1 * 1 + 1) = 2 + 2 = 4
    expect(NeuralNet.weightCount(1, 1, 1)).toBe(4)
  })

  it('scales correctly with hidden size', () => {
    // (2 * 3 + 3) + (3 * 1 + 1) = 9 + 4 = 13
    expect(NeuralNet.weightCount(2, 3, 1)).toBe(13)
  })
})

// ── Constructor (default zero-init) ─────────────────────────────

describe('NeuralNet constructor', () => {
  it('initializes weights to zero by default (Float64Array spec)', () => {
    const nn = new NeuralNet(6, 12, 4)
    expect(nn.weights.length).toBe(136)
    for (let i = 0; i < nn.weights.length; i++) {
      expect(nn.weights[i]).toBe(0)
    }
  })

  it('stores the provided sizes', () => {
    const nn = new NeuralNet(6, 12, 4)
    expect(nn.inputSize).toBe(6)
    expect(nn.hiddenSize).toBe(12)
    expect(nn.outputSize).toBe(4)
  })

  it('allocates weights as a Float64Array', () => {
    const nn = new NeuralNet(6, 12, 4)
    expect(nn.weights).toBeInstanceOf(Float64Array)
  })
})

// ── fromZeros — THE NULL BRAIN CONTRACT ─────────────────────────

describe('NeuralNet.fromZeros — the null brain', () => {
  it('returns a network with the correct shape', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    expect(nn.inputSize).toBe(6)
    expect(nn.hiddenSize).toBe(12)
    expect(nn.outputSize).toBe(4)
    expect(nn.weights.length).toBe(136)
  })

  it('has every weight explicitly set to zero', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    for (let i = 0; i < nn.weights.length; i++) {
      expect(nn.weights[i]).toBe(0)
    }
  })

  it('forward() returns all zeros for the zero input vector', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    const out = nn.forward([0, 0, 0, 0, 0, 0])
    expect(out).toEqual([0, 0, 0, 0])
  })

  it('forward() returns all zeros for any positive input vector', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    const out = nn.forward([1, 2, 3, 4, 5, 6])
    expect(out).toEqual([0, 0, 0, 0])
  })

  it('forward() returns all zeros for any negative input vector', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    const out = nn.forward([-1, -2, -3, -4, -5, -6])
    expect(out).toEqual([0, 0, 0, 0])
  })

  it('forward() returns all zeros for a mixed-sign input vector', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    const out = nn.forward([1, -1, 0.5, -0.5, 100, -100])
    expect(out).toEqual([0, 0, 0, 0])
  })

  it('forward() returns all zeros for extreme magnitude inputs (no overflow)', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    // tanh(0) = 0 regardless of input magnitudes, so even Infinity-scaled
    // inputs should produce zeros (0 * ∞ is NaN in IEEE 754 but these are
    // finite so the product is 0).
    const out = nn.forward([1e9, -1e9, 1e9, -1e9, 1e9, -1e9])
    expect(out).toEqual([0, 0, 0, 0])
  })

  it('is idempotent — fromZeros twice produces identical networks', () => {
    const a = NeuralNet.fromZeros(6, 12, 4)
    const b = NeuralNet.fromZeros(6, 12, 4)
    expect(a.getWeights()).toEqual(b.getWeights())
  })

  it('is isolated — randomizing one fromZeros instance does not affect another', () => {
    const a = NeuralNet.fromZeros(6, 12, 4)
    const b = NeuralNet.fromZeros(6, 12, 4)
    a.randomize()
    // b must still be the null brain.
    expect(b.forward([1, 2, 3, 4, 5, 6])).toEqual([0, 0, 0, 0])
  })

  it('survives randomize-then-reset — setWeights(zeros) restores null behavior', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    nn.randomize()
    // After randomization, forward output is almost certainly not all zero.
    nn.setWeights(new Array(136).fill(0))
    expect(nn.forward([1, 2, 3, 4, 5, 6])).toEqual([0, 0, 0, 0])
  })
})

// ── Weight round-trip ───────────────────────────────────────────

describe('NeuralNet weight round-trip', () => {
  it('setWeights then getWeights returns the same values', () => {
    const nn = new NeuralNet(6, 12, 4)
    const weights = Array.from({ length: 136 }, (_, i) => (i - 68) / 100)
    nn.setWeights(weights)
    const got = nn.getWeights()
    expect(got).toEqual(weights)
  })

  it('getWeights returns a plain number[] (not a Float64Array)', () => {
    const nn = NeuralNet.fromZeros(6, 12, 4)
    const w = nn.getWeights()
    expect(Array.isArray(w)).toBe(true)
    expect(w).not.toBeInstanceOf(Float64Array)
  })

  it('setWeights with a short array zero-fills the remainder', () => {
    const nn = new NeuralNet(6, 12, 4)
    nn.setWeights([1, 2, 3]) // only 3 values, rest must become 0
    const got = nn.getWeights()
    expect(got[0]).toBe(1)
    expect(got[1]).toBe(2)
    expect(got[2]).toBe(3)
    for (let i = 3; i < 136; i++) {
      expect(got[i]).toBe(0)
    }
  })

  it('getWeights after setWeights does not share a reference with the input', () => {
    const nn = new NeuralNet(6, 12, 4)
    const input = new Array(136).fill(0.5)
    nn.setWeights(input)
    const got = nn.getWeights()
    // Mutating the original input must not affect the network
    input[0] = 99
    expect(got[0]).toBe(0.5)
    expect(nn.getWeights()[0]).toBe(0.5)
  })
})

// ── Forward determinism ─────────────────────────────────────────

describe('NeuralNet.forward determinism', () => {
  it('produces identical output for identical input on identical weights', () => {
    const a = new NeuralNet(6, 12, 4)
    const b = new NeuralNet(6, 12, 4)
    const weights = Array.from({ length: 136 }, (_, i) => Math.sin(i) * 0.5)
    a.setWeights(weights)
    b.setWeights(weights)
    const input = [0.1, -0.2, 0.3, -0.4, 0.5, -0.6]
    expect(a.forward(input)).toEqual(b.forward(input))
  })

  it('produces the correct shape (one output per neuron)', () => {
    const nn = new NeuralNet(6, 12, 4)
    nn.randomize()
    const out = nn.forward([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
    expect(out).toHaveLength(4)
  })

  it('all outputs are within tanh range [-1, 1]', () => {
    const nn = new NeuralNet(6, 12, 4)
    // Crank weights to extreme values so pre-activation sums are huge;
    // tanh should clamp everything into [-1, 1].
    nn.setWeights(new Array(136).fill(100))
    const out = nn.forward([1, 1, 1, 1, 1, 1])
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
