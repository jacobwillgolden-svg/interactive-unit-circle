import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export default function SiteShell() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('radian-theme') || 'dark'
  })
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('radian-sound') !== 'off'
  })
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.3 })
  const [showScrollTop, setShowScrollTop] = useState(false)

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

  // Show ↑ after scrolling ~1/5 of the way down the page
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const threshold = Math.max(doc.scrollHeight, document.body.scrollHeight) / 5
      setShowScrollTop(window.scrollY >= threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [location.pathname])

  // New route / page: start at top; re-check scroll affordance
  useEffect(() => {
    window.scrollTo(0, 0)
    setShowScrollTop(false)
  }, [location.pathname])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            {/* key=pathname remounts the mark so the moon wipe replays on every route change */}
            <svg
              key={location.pathname}
              className="brand-mark"
              viewBox="0 0 36 36"
              width="58"
              height="58"
              aria-hidden="true"
            >
              <defs>
                {/* Soft lunar fill — ids unique per mount via path key remount */}
                <radialGradient id="brand-moon-fill" cx="62%" cy="38%" r="70%">
                  <stop offset="0%" stopColor="#f4f7fb" />
                  <stop offset="55%" stopColor="#d8e0ea" />
                  <stop offset="100%" stopColor="#a8b4c4" />
                </radialGradient>
                {/* Top→bottom wipe of the lit half */}
                <clipPath id="brand-moon-wipe">
                  <rect
                    className="brand-mark-wipe"
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                  />
                </clipPath>
              </defs>
              {/* Glow disc (behind, full circle soft) */}
              <circle className="brand-mark-glow" cx="18" cy="18" r="14" />
              {/* Lit half (right semicircle) — revealed top→bottom */}
              <g clipPath="url(#brand-moon-wipe)">
                <path
                  className="brand-mark-fill"
                  d="M 18 5 A 13 13 0 0 1 18 31 Z"
                />
                {/* Subtle crater hints */}
                <circle className="brand-mark-crater" cx="24" cy="14" r="1.6" />
                <circle className="brand-mark-crater" cx="27" cy="20" r="1.1" />
                <circle className="brand-mark-crater" cx="22" cy="24" r="0.9" />
              </g>
            </svg>
            <span className="brand-name">
              RADIAN<span className="brand-name-t">T</span>
            </span>
          </Link>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Unit Circle
            </NavLink>
            <NavLink to="/waves" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Trig Functions
            </NavLink>
            <NavLink to="/pendulums" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Pendulums
            </NavLink>
            <NavLink to="/helix" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Chain Rule
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              History
            </NavLink>
            <NavLink to="/cheat-sheet" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
              Cheat Sheet
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

        <button
          type="button"
          className={`scroll-top-btn${showScrollTop ? ' is-visible' : ''}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Back to top"
        >
          <span className="scroll-top-arrow" aria-hidden="true">
            ↑
          </span>
        </button>
      </div>
    </div>
  )
}
