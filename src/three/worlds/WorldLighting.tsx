/**
 * WorldLighting — theme-driven lighting for each world.
 */
import type { WorldTheme } from '@config/worlds/types'

interface WorldLightingProps {
  theme: WorldTheme
}

export function WorldLighting({ theme }: WorldLightingProps) {
  return (
    <>
      <ambientLight intensity={theme.ambientIntensity} color={theme.ambientColor} />
      <directionalLight
        position={theme.sunPosition}
        intensity={theme.sunIntensity}
        color={theme.sunColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
    </>
  )
}
