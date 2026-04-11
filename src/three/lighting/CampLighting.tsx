/**
 * CampLighting — the single global lighting rig for the base camp diorama.
 *
 * Sprint 1, Subsystem 1. Every later sprint imports this instead of
 * redefining lighting. Extracted from /physics-test's proven values.
 */

export function CampLighting() {
  return (
    <>
      {/* Warm ambient fill — gives the toy-soldier plastic its sheen */}
      <ambientLight intensity={0.6} color={0xffeedd} />

      {/* Key light — directional with shadows for the tabletop look */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.001}
      />

      {/* Soft fill from the opposite side to reduce harsh shadow contrast */}
      <directionalLight
        position={[-4, 6, -3]}
        intensity={0.3}
        color={0xddeeff}
      />

      {/* Sky color + depth fog — matches the tabletop diorama feel */}
      <color attach="background" args={[0x88bbdd]} />
      <fog attach="fog" args={[0xd4c8a0, 25, 55]} />
    </>
  )
}
