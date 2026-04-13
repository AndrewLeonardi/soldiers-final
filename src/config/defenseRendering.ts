/**
 * defenseRendering — rendering registry for defense types.
 *
 * Maps DefenseType → 3D component + ghost preview geometry.
 * Separated from defenses.ts because THREE.js geometry allocations
 * are side effects (GPU buffer objects at import time).
 *
 * Only imported by R3F rendering components, never by stores or pure logic.
 */
import * as THREE from 'three'
import type { DefenseType } from './defenses'
import {
  WallDefense,
  SandbagDefense,
  WatchTower,
} from '@three/models/Defenses'
import type React from 'react'

/** 3D component per defense type — used by PlacementMarkers + BattleEntities */
export const DEFENSE_COMPONENTS: Record<DefenseType, React.FC<any>> = {
  wall: WallDefense,
  sandbag: SandbagDefense,
  tower: WatchTower,
}

export interface DefenseGhost {
  geo: THREE.BufferGeometry
  yOffset: number
}

/** Ghost preview geometry per defense type — used by PlacementGhost + GhostPreview */
export const DEFENSE_GHOST: Record<DefenseType, DefenseGhost> = {
  wall:    { geo: new THREE.BoxGeometry(2.4, 1.0, 0.2),  yOffset: 0.5 },
  sandbag: { geo: new THREE.BoxGeometry(1.6, 0.4, 0.8),  yOffset: 0.2 },
  tower:   { geo: new THREE.BoxGeometry(1.1, 2.0, 1.1),  yOffset: 1.0 },
}
