import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('./pages/HomePage'))
const PhysicsTest = lazy(() => import('./pages/PhysicsTest'))
const CampPage = lazy(() => import('./game/camp/CampPage'))
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })))

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
        <Route path="/physics-test" element={<PhysicsTest />} />
        <Route path="/camp" element={<CampPage />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/refund" element={<LegalPage kind="refund" />} />
      </Routes>
    </Suspense>
  )
}
