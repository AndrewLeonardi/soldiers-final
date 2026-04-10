/**
 * NeuralNetThumbnail — compact SVG visualization of a neural network.
 *
 * Sprint 3, Phase 5b. Shows nodes + connections colored by weight magnitude.
 * Takes weights + shape as props. Static snapshot — no animation.
 *
 * Layout: 3 columns (input, hidden, output) with nodes and edges.
 * Edge color: blue for negative, green for positive, opacity by magnitude.
 */
import type { NetworkShape } from '@game/training/weaponShapes'

interface NeuralNetThumbnailProps {
  weights: number[]
  shape: NetworkShape
  width?: number
  height?: number
}

export function NeuralNetThumbnail({
  weights,
  shape,
  width = 120,
  height = 80,
}: NeuralNetThumbnailProps) {
  const { input, hidden, output } = shape
  const pad = 10
  const colSpacing = (width - pad * 2) / 2  // 3 columns → 2 gaps

  // Node positions
  const inputNodes = Array.from({ length: input }, (_, i) => ({
    x: pad,
    y: pad + (i / (input - 1 || 1)) * (height - pad * 2),
  }))

  const hiddenNodes = Array.from({ length: hidden }, (_, i) => ({
    x: pad + colSpacing,
    y: pad + (i / (hidden - 1 || 1)) * (height - pad * 2),
  }))

  const outputNodes = Array.from({ length: output }, (_, i) => ({
    x: pad + colSpacing * 2,
    y: pad + (i / (output - 1 || 1)) * (height - pad * 2),
  }))

  // Parse weights: input→hidden weights, then hidden biases, then hidden→output weights, then output biases
  // Weight layout: [ih_weights (input*hidden), h_biases (hidden), ho_weights (hidden*output), o_biases (output)]
  const ihWeights = weights.slice(0, input * hidden)
  const hoStart = input * hidden + hidden
  const hoWeights = weights.slice(hoStart, hoStart + hidden * output)

  // Find max magnitude for normalization
  const allEdgeWeights = [...ihWeights, ...hoWeights]
  const maxMag = Math.max(0.01, ...allEdgeWeights.map(Math.abs))

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Input → Hidden edges */}
      {inputNodes.map((inp, i) =>
        hiddenNodes.map((hid, j) => {
          const w = ihWeights[i * hidden + j] ?? 0
          const mag = Math.abs(w) / maxMag
          const color = w >= 0 ? '#44ff44' : '#4488ff'
          return (
            <line
              key={`ih-${i}-${j}`}
              x1={inp.x} y1={inp.y}
              x2={hid.x} y2={hid.y}
              stroke={color}
              strokeWidth={0.5 + mag * 1.5}
              strokeOpacity={0.1 + mag * 0.5}
            />
          )
        })
      )}

      {/* Hidden → Output edges */}
      {hiddenNodes.map((hid, i) =>
        outputNodes.map((out, j) => {
          const w = hoWeights[i * output + j] ?? 0
          const mag = Math.abs(w) / maxMag
          const color = w >= 0 ? '#44ff44' : '#4488ff'
          return (
            <line
              key={`ho-${i}-${j}`}
              x1={hid.x} y1={hid.y}
              x2={out.x} y2={out.y}
              stroke={color}
              strokeWidth={0.5 + mag * 1.5}
              strokeOpacity={0.1 + mag * 0.5}
            />
          )
        })
      )}

      {/* Nodes */}
      {inputNodes.map((n, i) => (
        <circle key={`i-${i}`} cx={n.x} cy={n.y} r={2.5} fill="#c0d0b0" opacity={0.8} />
      ))}
      {hiddenNodes.map((n, i) => (
        <circle key={`h-${i}`} cx={n.x} cy={n.y} r={3} fill="#00e5ff" opacity={0.8} />
      ))}
      {outputNodes.map((n, i) => (
        <circle key={`o-${i}`} cx={n.x} cy={n.y} r={3} fill="#D4AA40" opacity={0.8} />
      ))}
    </svg>
  )
}
