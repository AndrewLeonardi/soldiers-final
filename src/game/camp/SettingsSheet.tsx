/**
 * SettingsSheet — stub bottom sheet with mute toggle + version.
 *
 * Sprint 1, Subsystem 4. Three lines of UI but it locks the
 * bottom-sheet pattern for sprint 2's training sheet.
 */
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import '@styles/game-ui.css'

const VERSION = '0.1.0'

export function SettingsSheet() {
  const settingsOpen = useSceneStore((s) => s.settingsOpen)
  const setSettingsOpen = useSceneStore((s) => s.setSettingsOpen)
  const muted = useCampStore((s) => s.muted)
  const setMuted = useCampStore((s) => s.setMuted)

  if (!settingsOpen) return null

  return (
    <div
      className="game-sheet-backdrop"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="game-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-sheet-header">
          <span className="game-sheet-title">SETTINGS</span>
        </div>

        <div className="game-sheet-body">
          {/* Mute toggle */}
          <label className="game-toggle-row">
            <span>Sound</span>
            <button
              className="game-btn game-btn-sm"
              onClick={() => setMuted(!muted)}
            >
              {muted ? 'OFF' : 'ON'}
            </button>
          </label>

          {/* Version */}
          <div className="game-version">
            v{VERSION}
          </div>
        </div>
      </div>
    </div>
  )
}
