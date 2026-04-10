import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { GameConceptBoundary } from './game/GameConceptBoundary'

const HomePage = lazy(() => import('./pages/HomePage'))
const Game = lazy(() => import('./scenes/Game'))
const PhysicsTest = lazy(() => import('./pages/PhysicsTest'))
const GameConcept = lazy(() => import('./game/GameConcept'))
const CampPage = lazy(() => import('./game/camp/CampPage'))

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
        <Route path="/camp" element={<CampPage />} />
        <Route
          path="/game-concept"
          element={
            <GameConceptBoundary>
              <GameConcept />
            </GameConceptBoundary>
          }
        />
      </Routes>
    </Suspense>
  )
}
