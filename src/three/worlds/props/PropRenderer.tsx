/**
 * PropRenderer — dispatches PropConfig to the right 3D component.
 *
 * Each prop type has a dedicated component that renders visuals +
 * Rapier colliders. Tags determine physics behavior (knockable,
 * destructible, explosive, sticky, launcher).
 *
 * Adding a new prop type = add a component + register it here.
 */
import type { PropConfig } from '@config/worlds/types'
import { CerealBox, CoffeeMug, SyrupBottle, Mine } from './KitchenProps'
import { TapeMeasure, Hammer, NutsAndBolts, WoodBlock } from './WorkshopProps'

// Registry: prop type string -> React component
const PROP_COMPONENTS: Record<string, React.FC<{ config: PropConfig }>> = {
  // Kitchen
  cereal_box: CerealBox,
  coffee_mug: CoffeeMug,
  syrup_bottle: SyrupBottle,
  mine: Mine,
  // Workshop
  tape_measure: TapeMeasure,
  hammer: Hammer,
  nuts_bolts: NutsAndBolts,
  wood_block: WoodBlock,
  // Backyard (Phase 3):
  // flower_pot: FlowerPot,
  // soda_can: SodaCan,
  // garden_hose: GardenHose,
}

interface PropRendererProps {
  config: PropConfig
}

export function PropRenderer({ config }: PropRendererProps) {
  const Component = PROP_COMPONENTS[config.type]
  if (!Component) {
    console.warn(`Unknown prop type: ${config.type}`)
    return null
  }
  return <Component config={config} />
}
