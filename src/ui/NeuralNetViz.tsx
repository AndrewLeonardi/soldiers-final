/**
 * Neural Network Visualization — SVG overlay showing live NN state.
 *
 * 3 layers: input (6) → hidden (12) → output (4)
 * Connections colored green (positive) / red (negative), width by magnitude.
 * Updates every 30 frames for performance.
 */

import { useState, useEffect, useRef } from 'react'
import { useTrainingStore } from '@stores/trainingStore'
import { getInputs } from '@engine/ml/simulationRunner'
import '@styles/training.css'

const W = 280
const H = 200
const INPUT_SIZE = 6
const HIDDEN_SIZE = 12
const OUTPUT_SIZE = 4

const INPUT_LABELS_ROCKET = ['Tgt X', 'Tgt Z', 'Dist', 'Elev', 'Cool', 'Alive']
const INPUT_LABELS_TANK = ['Angle', 'Dist', 'Speed', 'Cool', 'Alive', 'Time']
const INPUT_LABELS_GRENADE = ['Ctr X', 'Ctr Z', 'Dist', 'Elev', 'Cool', 'Alive']
const INPUT_LABELS_MG = ['Tgt X', 'Tgt Z', 'Dist', 'Angle', 'Cool', 'Alive']

const OUTPUT_LABELS = ['Aim', 'Elev', 'Fire', 'Aux']
const OUTPUT_LABELS_TANK = ['Steer', 'Throt', 'Fire', 'Aux']

function getInputLabels(weapon: string | null): string[] {
  switch (weapon) {
    case 'tank': return INPUT_LABELS_TANK
    case 'grenade': return INPUT_LABELS_GRENADE
    case 'machineGun': return INPUT_LABELS_MG
    default: return INPUT_LABELS_ROCKET
  }
}

function getOutputLabels(weapon: string | null): string[] {
  return weapon === 'tank' ? OUTPUT_LABELS_TANK : OUTPUT_LABELS
}

// Node positions
function nodeY(index: number, total: number): number {
  return 15 + index * (H - 30) / Math.max(1, total - 1)
}

const LAYER_X = [35, 140, 245]

export function NeuralNetViz() {
  const weapon = useTrainingStore(s => s.weapon)
  const status = useTrainingStore(s => s.status)
  const [weights, setWeights] = useState<number[]>([])
  const [outputs, setOutputs] = useState<number[]>([])
  const frameCounter = useRef(0)

  useEffect(() => {
    if (status !== 'running' && status !== 'graduated') return

    const interval = setInterval(() => {
      frameCounter.current++
      if (frameCounter.current % 30 !== 0) return

      const state = useTrainingStore.getState()
      if (state.nn) {
        setWeights(state.nn.getWeights())
      }
      // Get last outputs from a quick forward pass with current sim inputs
      if (state.nn && state.simState && state.simConfig) {
        const inputs = getInputs(state.simState, state.simConfig)
        const out = state.nn.forward(inputs)
        setOutputs(out)
      }
    }, 50) // ~20fps check rate

    return () => clearInterval(interval)
  }, [status])

  if (status !== 'running' && status !== 'graduated') return null
  if (weights.length === 0) return null

  const inputLabels = getInputLabels(weapon)
  const outputLabels = getOutputLabels(weapon)

  // Parse weights into connection strengths
  // Layout: input→hidden weights (6*12) + hidden biases (12) + hidden→output weights (12*4) + output biases (4)
  const ihWeights: number[][] = [] // [hidden][input]
  let offset = 0
  for (let h = 0; h < HIDDEN_SIZE; h++) {
    const row: number[] = []
    for (let i = 0; i < INPUT_SIZE; i++) {
      row.push(weights[offset++] ?? 0)
    }
    ihWeights.push(row)
    offset++ // skip bias
  }

  const hoWeights: number[][] = [] // [output][hidden]
  for (let o = 0; o < OUTPUT_SIZE; o++) {
    const row: number[] = []
    for (let h = 0; h < HIDDEN_SIZE; h++) {
      row.push(weights[offset++] ?? 0)
    }
    hoWeights.push(row)
    offset++ // skip bias
  }

  return (
    <div className="nn-viz">
      <div className="nn-title">Neural Network</div>
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
          })
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
          })
        )}

        {/* Input nodes */}
        {Array.from({ length: INPUT_SIZE }).map((_, i) => (
          <g key={`in-${i}`}>
            <circle
              cx={LAYER_X[0]}
              cy={nodeY(i, INPUT_SIZE)}
              r={6}
              fill="rgba(100, 180, 255, 0.8)"
              stroke="rgba(100, 180, 255, 0.4)"
              strokeWidth={1}
            />
            <text
              x={LAYER_X[0] - 12}
              y={nodeY(i, INPUT_SIZE) + 3}
              textAnchor="end"
              fill="rgba(200, 220, 255, 0.6)"
              fontSize={7}
              fontFamily="var(--font-mono)"
            >
              {inputLabels[i]}
            </text>
          </g>
        ))}

        {/* Hidden nodes */}
        {Array.from({ length: HIDDEN_SIZE }).map((_, h) => (
          <circle
            key={`hid-${h}`}
            cx={LAYER_X[1]}
            cy={nodeY(h, HIDDEN_SIZE)}
            r={5}
            fill="rgba(180, 130, 255, 0.7)"
            stroke="rgba(180, 130, 255, 0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Output nodes */}
        {Array.from({ length: OUTPUT_SIZE }).map((_, o) => {
          const isFireActive = o === 2 && outputs[2] > 0
          return (
            <g key={`out-${o}`}>
              <circle
                cx={LAYER_X[2]}
                cy={nodeY(o, OUTPUT_SIZE)}
                r={7}
                fill={isFireActive ? 'rgba(255, 160, 50, 0.9)' : 'rgba(100, 220, 100, 0.7)'}
                stroke={isFireActive ? 'rgba(255, 160, 50, 0.5)' : 'rgba(100, 220, 100, 0.3)'}
                strokeWidth={1.5}
              />
              <text
                x={LAYER_X[2] + 12}
                y={nodeY(o, OUTPUT_SIZE) + 3}
                fill="rgba(200, 240, 200, 0.6)"
                fontSize={7}
                fontFamily="var(--font-mono)"
              >
                {outputLabels[o]}
              </text>
              {outputs[o] !== undefined && (
                <text
                  x={LAYER_X[2] + 12}
                  y={nodeY(o, OUTPUT_SIZE) + 12}
                  fill="rgba(200, 240, 200, 0.4)"
                  fontSize={6}
                  fontFamily="var(--font-mono)"
                >
                  {outputs[o].toFixed(2)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
