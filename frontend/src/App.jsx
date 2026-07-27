import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import SiteShell from './components/SiteShell'
import UnitCirclePage from './pages/UnitCirclePage'
import WavesPage from './pages/WavesPage'
import HelixPage from './pages/HelixPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteShell />}>
          <Route index element={<UnitCirclePage />} />
          <Route path="waves" element={<WavesPage />} />
          <Route path="helix" element={<HelixPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
