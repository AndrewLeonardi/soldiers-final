/**
 * Performance Monitor — tracks FPS, draw calls, triangles, memory, and frame budget.
 * Module-level singleton: import { perfMonitor } from this file.
 *
 * Usage in useFrame:
 *   perfMonitor.beginFrame()
 *   ... battle logic ...
 *   perfMonitor.endFrame(gl.info)
 *
 * Read stats:
 *   perfMonitor.getStats() → { fps, avgFps, minFps, drawCalls, triangles, memoryMB, frameBudgetUsed }
 *
 * Console dump (dev only):
 *   perfMonitor.dump()
 */

interface PerfStats {
  fps: number
  avgFps: number
  minFps: number
  drawCalls: number
  triangles: number
  memoryMB: number
  frameBudgetUsed: number // % of 16.67ms budget used
  particleCount: number
  unitCount: number
}

interface RendererInfo {
  render: { calls: number; triangles: number }
}

const SAMPLE_WINDOW = 60 // rolling window for avg/min
const BUDGET_MS = 16.67 // 60fps target

class PerfMonitor {
  private frameTimes: number[] = []
  private frameStart = 0
  private lastStats: PerfStats = {
    fps: 60, avgFps: 60, minFps: 60,
    drawCalls: 0, triangles: 0, memoryMB: 0,
    frameBudgetUsed: 0, particleCount: 0, unitCount: 0,
  }
  private _enabled = true
  private _warningThreshold = 30 // FPS below this triggers warning
  private _warningCallback: ((stats: PerfStats) => void) | null = null
  private _sampleCounter = 0

  get enabled() { return this._enabled }
  set enabled(v: boolean) { this._enabled = v }

  /** Call at the start of useFrame */
  beginFrame() {
    if (!this._enabled) return
    this.frameStart = performance.now()
  }

  /** Call at the end of useFrame with gl.info */
  endFrame(rendererInfo?: RendererInfo, particleCount = 0, unitCount = 0) {
    if (!this._enabled) return

    const elapsed = performance.now() - this.frameStart
    this.frameTimes.push(elapsed)
    if (this.frameTimes.length > SAMPLE_WINDOW) this.frameTimes.shift()

    // Only compute stats every 10 frames to avoid overhead
    this._sampleCounter++
    if (this._sampleCounter < 10) return
    this._sampleCounter = 0

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const maxFrameTime = Math.max(...this.frameTimes)

    const fps = Math.round(1000 / Math.max(avgFrameTime, 0.1))
    const avgFps = fps
    const minFps = Math.round(1000 / Math.max(maxFrameTime, 0.1))

    // Memory (if available)
    let memoryMB = 0
    if ((performance as any).memory) {
      memoryMB = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
    }

    this.lastStats = {
      fps,
      avgFps,
      minFps,
      drawCalls: rendererInfo?.render.calls ?? 0,
      triangles: rendererInfo?.render.triangles ?? 0,
      memoryMB,
      frameBudgetUsed: Math.round((avgFrameTime / BUDGET_MS) * 100),
      particleCount,
      unitCount,
    }

    // Fire warning if FPS drops
    if (minFps < this._warningThreshold && this._warningCallback) {
      this._warningCallback(this.lastStats)
    }
  }

  getStats(): PerfStats {
    return { ...this.lastStats }
  }

  /** Register a callback for when FPS drops below threshold */
  onWarning(threshold: number, cb: (stats: PerfStats) => void) {
    this._warningThreshold = threshold
    this._warningCallback = cb
  }

  /** Dev console dump */
  dump() {
    const s = this.lastStats
    console.log(
      `[PERF] FPS: ${s.fps} (avg: ${s.avgFps}, min: ${s.minFps}) | ` +
      `Draw calls: ${s.drawCalls} | Tris: ${s.triangles} | ` +
      `Memory: ${s.memoryMB}MB | Budget: ${s.frameBudgetUsed}% | ` +
      `Particles: ${s.particleCount} | Units: ${s.unitCount}`
    )
  }

  /** Reset all counters */
  reset() {
    this.frameTimes = []
    this._sampleCounter = 0
  }
}

export const perfMonitor = new PerfMonitor()

// Expose to dev console
if (typeof window !== 'undefined') {
  ;(window as any).__perf = perfMonitor
}
