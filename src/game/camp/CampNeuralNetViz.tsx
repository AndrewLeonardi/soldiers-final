/**
 * CampNeuralNetViz — live neural network visualization for camp training.
 *
 * Sprint B. Adapted from /src/ui/NeuralNetViz.tsx for the universal
 * 10→12→6 topology used in camp training. Reads from campTrainingStore.
 *
 * Shows connections colored green (positive) / red (negative),
 * node activations, and fire gate highlight.
 */

import { useState, useEffect, useRef } from 'react'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { useSceneStore } from '@stores/sceneStore'
import { getInputs } from '@engine/ml/simulationRunner'
import '@styles/camp-ui.css'

const W = 320
const H = 260
const INPUT_SIZE = 10
const HIDDEN_SIZE = 12
const OUTPUT_SIZE = 6

const INPUT_LABELS = [
  'Bearing', 'Dist', 'Elev', 'Cool', 'Enemies',
  'Health', 'Friendly', 'Density', 'VelX', 'VelZ',
]

const OUTPUT_LABELS = ['Forward', 'Lateral', 'Aim', 'Fire', 'ElevAdj', 'Aggro']

function nodeY(index: number, total: number): number {
  return 15 + index * (H - 30) / Math.max(1, total - 1)
}

const LAYER_X = [45, 160, 275]

export function CampNeuralNetViz() {
  const observingSlotIndex = useSceneStore((s) => s.observingSlotIndex)
  const [weights, setWeights] = useState<number[]>([])
  const [outputs, setOutputs] = useState<number[]>([])
  const frameCounter = useRef(0)

  useEffect(() => {
    if (observingSlotIndex === null) return

    const interval = setInterval(() => {
      frameCounter.current++
      if (frameCounter.current % 30 !== 0) return

      const store = useCampTrainingStore.getState()
      const slot = store.slots[observingSlotIndex]
      if (!slot || slot.trainingPhase !== 'running') return
      if (slot.nns.length === 0 || slot.simStates.length === 0) return

      const champNN = slot.nns[slot.championIndex]
      const champSim = slot.simStates[slot.championIndex]
      if (!champNN || !champSim) return

      setWeights(champNN.getWeights())

      if (slot.simConfig) {
        const inputs = getInputs(champSim, slot.simConfig)
        const out = champNN.forward(inputs)
        setOutputs(out)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [observingSlotIndex])

  if (observingSlotIndex === null) return null

  const store = useCampTrainingStore.getState()
  const slot = store.slots[observingSlotIndex]
  if (!slot || slot.trainingPhase !== 'running') return null
  if (weights.length === 0) return null

  // Parse weights: [input→hidden (10*12) + biases (12)] + [hidden→output (12*6) + biases (6)]
  const ihWeights: number[][] = []
  let offset = 0
  for (let h = 0; h < HIDDEN_SIZE; h++) {
    const row: number[] = []
    for (let i = 0; i < INPUT_SIZE; i++) {
      row.push(weights[offset++] ?? 0)
    }
    ihWeights.push(row)
    offset++ // skip bias
  }

  const hoWeights: number[][] = []
  for (let o = 0; o < OUTPUT_SIZE; o++) {
    const row: number[] = []
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      row.push(weights[offset++] ?? 0)
    }
    hoWeights.push(row)
    offset++ // skip bias
  }

  return (
    <div className="obs-nn-viz">
      <div className="obs-nn-title">NEURAL NETWORK</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Input → Hidden connections */}
        {ihWeights.map((row, h) =>
          row.map((w, i) => {
            if (Math.abs(w) < 0.3) return null
            return (
              <line
                key={`ih-${h}-${i}`}
                x1={LAYER_X[0]}
                y1={nodeY(i, INPUT_SIZE)}
                x2={LAYER_X[1]}
                y2={nodeY(h, HIDDEN_SIZE)}
                stroke={w > 0 ? '#4CAF50' : '#FF5252'}
                strokeWidth={Math.min(2.5, Math.abs(w) * 1.5)}
                strokeOpacity={0.4}
              />
            )
          }),
        )}

        {/* Hidden → Output connections */}
        {hoWeights.map((row, o) =>
          row.map((w, h) => {
            if (Math.abs(w) < 0.3) return null
            return (
              <line
                key={`ho-${o}-${h}`}
                x1={LAYER_X[1]}
                y1={nodeY(h, HIDDEN_SIZE)}
                x2={LAYER_X[2]}
                y2={nodeY(o, OUTPUT_SIZE)}
                stroke={w > 0 ? '#4CAF50' : '#FF5252'}
                strokeWidth={Math.min(2.5, Math.abs(w) * 1.5)}
                strokeOpacity={0.4}
              />
            )
          }),
        )}

        {/* Input nodes */}
        {Array.from({ length: INPUT_SIZE }).map((_, i) => (
          <g key={`in-${i}`}>
            <circle
              cx={LAYER_X[0]}
              cy={nodeY(i, INPUT_SIZE)}
              r={5}
              fill="rgba(100, 180, 255, 0.8)"
              stroke="rgba(100, 180, 255, 0.4)"
              strokeWidth={1}
            />
            <text
              x={(LAYER_X[0] ?? 0) - 10}
              y={nodeY(i, INPUT_SIZE) + 3}
              textAnchor="end"
              fill="rgba(200, 220, 255, 0.6)"
              fontSize={6}
              fontFamily="var(--font-mono)"
            >
              {INPUT_LABELS[i]}
            </text>
          </g>
        ))}

        {/* Hidden nodes */}
        {Array.from({ length: HIDDEN_SIZE }).map((_, h) => (
          <circle
            key={`hid-${h}`}
            cx={LAYER_X[1]}
            cy={nodeY(h, HIDDEN_SIZE)}
            r={4}
            fill="rgba(180, 130, 255, 0.7)"
            stroke="rgba(180, 130, 255, 0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Output nodes */}
        {Array.from({ length: OUTPUT_SIZE }).map((_, o) => {
          const isFireActive = o === 3 && (outputs[3] ?? 0) > 0
          return (
            <g key={`out-${o}`}>
              <circle
                cx={LAYER_X[2]}
                cy={nodeY(o, OUTPUT_SIZE)}
                r={6}
                fill={isFireActive ? 'rgba(255, 160, 50, 0.9)' : 'rgba(100, 220, 100, 0.7)'}
                stroke={isFireActive ? 'rgba(255, 160, 50, 0.5)' : 'rgba(100, 220, 100, 0.3)'}
                strokeWidth={1.5}
              />
              <text
                x={(LAYER_X[2] ?? 0) + 10}
                y={nodeY(o, OUTPUT_SIZE) + 3}
                fill="rgba(200, 240, 200, 0.6)"
                fontSize={6}
                fontFamily="var(--font-mono)"
              >
                {OUTPUT_LABELS[o]}
              </text>
              {outputs[o] !== undefined && (
                <text
                  x={(LAYER_X[2] ?? 0) + 10}
                  y={nodeY(o, OUTPUT_SIZE) + 12}
                  fill="rgba(200, 240, 200, 0.4)"
                  fontSize={5}
                  fontFamily="var(--font-mono)"
                >
                  {outputs[o]!.toFixed(2)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
