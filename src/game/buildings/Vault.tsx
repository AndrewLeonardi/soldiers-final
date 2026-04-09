/**
 * Vault — the Intel Core the player is defending.
 *
 * Narratively this is where the soldiers' AI brains are stored. Mechanically
 * it's a DestructibleDefense with the 'vault' style. Heavy block count, dark
 * steel body, brass lid. When rivals breach it, the player loses resources
 * and possibly soldiers (Phase 5).
 *
 * Phase 1a is a pure pass-through wrapper. Future phases will add:
 *   - Pulsing glow when compute is being generated
 *   - "Breach warning" animation when integrity drops
 *   - Resource-loss callback on destruction
 */
import type { MutableRefObject } from 'react'
import { VaultDefense, type WallBlock } from '@three/models/Defenses'

interface VaultProps {
  id: string
  position: [number, number, number]
  rotation?: number
  blocksRef: MutableRefObject<Map<string, WallBlock[]>>
  tableBounds?: { halfWidth: number; halfDepth: number }
}

export function Vault({ id, position, rotation = 0, blocksRef, tableBounds }: VaultProps) {
  return (
    <VaultDefense
      position={position}
      rotation={rotation}
      wallBlocksRef={blocksRef}
      wallId={id}
      tableBounds={tableBounds}
    />
  )
}
