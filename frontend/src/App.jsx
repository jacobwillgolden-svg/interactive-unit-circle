import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import SiteShell from './components/SiteShell'
import UnitCirclePage from './pages/UnitCirclePage'
import WavesPage from './pages/WavesPage'
import PendulumPage from './pages/PendulumPage'
import PhysicsPage from './pages/PhysicsPage'
import HelixPage from './pages/HelixPage'
import HistoryPage from './pages/HistoryPage'
import IdentitiesPage from './pages/IdentitiesPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteShell />}>
          <Route index element={<UnitCirclePage />} />
          <Route path="waves" element={<WavesPage />} />
          <Route path="pendulums" element={<PendulumPage />} />
          <Route path="physics" element={<PhysicsPage />} />
          <Route path="helix" element={<HelixPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="cheat-sheet" element={<IdentitiesPage />} />
          <Route path="identities" element={<Navigate to="/cheat-sheet" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
