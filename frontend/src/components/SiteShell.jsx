import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

export default function SiteShell() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('radian-theme') || 'dark'
  })
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('radian-sound') !== 'off'
  })
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.3 })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('radian-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('radian-sound', soundOn ? 'on' : 'off')
  }, [soundOn])

  useEffect(() => {
    const onMove = (e) => {
      setCursor({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div className="app">
      <div
        className="app-bg"
        aria-hidden="true"
        style={{
          '--mx': `${cursor.x * 100}%`,
          '--my': `${cursor.y * 100}%`,
        }}
      />
      <div
        className="cursor-glow"
        aria-hidden="true"
        style={{
          left: `${cursor.x * 100}%`,
          top: `${cursor.y * 100}%`,
        }}
      />

      <div className="shell">
        <nav className="nav">
          <Link to="/" className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Radian</span>
          </Link>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Unit Circle
            </NavLink>
            <NavLink to="/waves" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Sin & Cos Waves
            </NavLink>
            <NavLink to="/helix" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Chain Rule
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              History
            </NavLink>
            <NavLink to="/identities" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Identities
            </NavLink>
          </div>

          <div className="nav-meta">
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => setSoundOn((v) => !v)}
              aria-label={soundOn ? 'Mute snap sound' : 'Enable snap sound'}
              title={soundOn ? 'Sound on' : 'Sound off'}
            >
              {soundOn ? '♪' : '♩'}
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </nav>

        <Outlet context={{ theme, soundOn }} />

        <footer className="footer">
          <span>Designed for clarity</span>
          <span>Interactive trigonometry studio</span>
        </footer>
      </div>
    </div>
  )
}
