/**
 * GameConceptBoundary — top-level React error boundary for /game-concept.
 *
 * Plan.md open question 16: one top-level boundary around the route with a
 * toy-styled fallback. If BaseScene, Physics, or any child throws at
 * render time, the player sees a readable "something broke, reload" card
 * instead of a blank white page or a blank canvas.
 *
 * Class component because React error boundaries only work as classes.
 * Kept tiny; no recovery logic beyond "reload."
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class GameConceptBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // Dev-only error surfacing so the stack is still visible in the
      // browser console when a boundary catches something. Production
      // telemetry hook lands in Phase 8.
      // eslint-disable-next-line no-console
      console.error('[GameConcept] uncaught error', error, info.componentStack)
    }
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            width: '100%',
            height: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 24,
            background: '#0a0d14',
            color: '#F5F0E0',
            fontFamily: "'Black Ops One', cursive",
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{ color: '#E8C65A', fontSize: 28, letterSpacing: 3, textTransform: 'uppercase' }}>
            Command Base Offline
          </div>
          <div style={{ color: '#8B7D5C', fontSize: 14, maxWidth: 420, lineHeight: 1.5 }}>
            Something went wrong rendering the base. Reload to redeploy.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '12px 22px',
                color: '#F5F0E0',
                fontFamily: "'Black Ops One', cursive",
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'linear-gradient(180deg, #3a4a2e 0%, #2a3a20 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.35), 0 3px 0 rgba(0,0,0,0.4), 0 6px 14px rgba(0,0,0,0.45)',
              }}
            >
              Redeploy
            </button>
            <Link
              to="/"
              style={{
                padding: '12px 22px',
                color: '#8B7D5C',
                fontFamily: "'Black Ops One', cursive",
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                textDecoration: 'none',
                border: '1px solid rgba(139, 125, 92, 0.4)',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Home
            </Link>
          </div>
          {import.meta.env.DEV && (
            <pre
              style={{
                marginTop: 16,
                padding: 12,
                maxWidth: 'min(720px, 90vw)',
                overflow: 'auto',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: '#ef9a9a',
                background: 'rgba(60, 20, 20, 0.5)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 4,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
