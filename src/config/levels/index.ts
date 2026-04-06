import level01 from './level-01.json'
import level02 from './level-02.json'
import level03 from './level-03.json'
import level04 from './level-04.json'
import level05 from './level-05.json'
import level06 from './level-06.json'
import type { LevelConfig } from '../types'

/** Ordered list of all campaign levels */
export const CAMPAIGN_LEVELS: LevelConfig[] = [
  level01 as LevelConfig,
  level02 as LevelConfig,
  level03 as LevelConfig,
  level04 as LevelConfig,
  level05 as LevelConfig,
  level06 as LevelConfig,
]

/** Quick lookup by level ID */
export const LEVEL_MAP: Record<string, LevelConfig> = Object.fromEntries(
  CAMPAIGN_LEVELS.map((l) => [l.id, l])
)

/** Get the next level ID after the given one, or null if it's the last */
export function getNextLevelId(currentId: string): string | null {
  const idx = CAMPAIGN_LEVELS.findIndex((l) => l.id === currentId)
  return idx >= 0 && idx < CAMPAIGN_LEVELS.length - 1
    ? CAMPAIGN_LEVELS[idx + 1].id
    : null
}
