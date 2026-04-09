import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('./pages/HomePage'))
const Game = lazy(() => import('./scenes/Game'))
const PhysicsTest = lazy(() => import('./pages/PhysicsTest'))
const GameConcept = lazy(() => import('./game/GameConcept'))

function LoadingFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0c1408',
    }}>
      <span style={{
        fontFamily: "'Black Ops One', cursive",
        color: '#D4AA40',
        fontSize: '1.5rem',
      }}>
        LOADING...
      </span>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<Game />} />
        <Route path="/physics-test" element={<PhysicsTest />} />
        <Route path="/game-concept" element={<GameConcept />} />
      </Routes>
    </Suspense>
  )
}
