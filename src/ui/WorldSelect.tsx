/**
 * WorldSelect — pick a world and battle to play.
 *
 * Data-driven from worldRegistry. Adding a new world automatically
 * adds a card. Each world shows its 2 battle nodes with star progress.
 */
import { useGameStore } from '@stores/gameStore'
import { worldRegistry } from '@config/worlds'

const WORLD_ICONS: Record<string, string> = {
  kitchen: '\u2615',    // coffee cup
  workshop: '\u2692',   // hammer & pick
  backyard: '\u2600',   // sun
}

const WORLD_COLORS: Record<string, { bg: string; accent: string }> = {
  kitchen: { bg: '#4a3520', accent: '#d4aa40' },
  workshop: { bg: '#3a3a3a', accent: '#8899aa' },
  backyard: { bg: '#2a4a2a', accent: '#66cc66' },
}

export function WorldSelect() {
  const phase = useGameStore((s) => s.phase)
  const selectBattle = useGameStore((s) => s.selectBattle)
  const worldProgress = useGameStore((s) => s.worldProgress)

  if (phase !== 'worldSelect') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 24,
      background: 'linear-gradient(180deg, #0c1a0c 0%, #1a2a15 100%)',
      fontFamily: "'Black Ops One', cursive",
    }}>
      {/* Title */}
      <div style={{
        fontSize: 28, color: '#D4AA40', letterSpacing: 3,
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        marginBottom: 8,
      }}>
        SELECT WORLD
      </div>

      {/* World cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        width: '90%', maxWidth: 500,
      }}>
        {worldRegistry.worlds.map((world) => {
          const battles = worldRegistry.getBattlesForWorld(world.id)
          const colors = WORLD_COLORS[world.id] ?? { bg: '#333', accent: '#aaa' }
          const icon = WORLD_ICONS[world.id] ?? '\u2694'

          return (
            <div key={world.id} style={{
              background: colors.bg,
              border: `2px solid ${colors.accent}`,
              borderRadius: 12,
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {/* World header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 28 }}>{icon}</span>
                <div>
                  <div style={{
                    fontSize: 18, color: colors.accent,
                    letterSpacing: 2,
                  }}>
                    {world.name.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: 11, color: '#999',
                    fontFamily: 'monospace', letterSpacing: 0.5,
                  }}>
                    {world.description}
                  </div>
                </div>
              </div>

              {/* Battle buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                {battles.map((battle, bi) => {
                  const progress = worldProgress[world.id]?.battles[battle.id]
                  const stars = progress?.bestStars ?? 0

                  return (
                    <button
                      key={battle.id}
                      onClick={() => selectBattle(battle.id)}
                      style={{
                        flex: 1,
                        padding: '12px 8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: `1px solid ${colors.accent}55`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.borderColor = colors.accent
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.3)'
                        e.currentTarget.style.borderColor = `${colors.accent}55`
                      }}
                    >
                      <div style={{
                        fontSize: 11, color: '#ccc',
                        fontFamily: "'Black Ops One', cursive",
                        letterSpacing: 1, marginBottom: 4,
                      }}>
                        {battle.name.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 16, letterSpacing: 2 }}>
                        {[1, 2, 3].map(s => (
                          <span key={s} style={{ color: s <= stars ? '#D4AA40' : '#555' }}>
                            {s <= stars ? '\u2605' : '\u2606'}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Physics test link (dev) */}
      <a
        href="/physics-test"
        style={{
          color: '#555', fontSize: 10, fontFamily: 'monospace',
          textDecoration: 'none', marginTop: 8,
        }}
      >
        physics test lab
      </a>
    </div>
  )
}
