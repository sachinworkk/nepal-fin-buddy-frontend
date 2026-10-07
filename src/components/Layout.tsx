import { Link, Navigate, NavLink } from 'react-router-dom'
import { isAuthed, logout } from '../lib/auth'

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`
const tabClass = ({ isActive }: { isActive: boolean }) => `tab${isActive ? ' active' : ''}`

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark" aria-hidden>
        ₹
      </span>
      Nepal Fin Buddy
    </Link>
  )
}

function Footer({ wide }: { wide?: boolean }) {
  return (
    <footer className="footer">
      <div className={`container${wide ? ' container-wide' : ''} footer-inner`}>
        <strong>Nepal Fin Buddy</strong>
        <span>Personal finance, built for Nepal</span>
      </div>
    </footer>
  )
}

export function PublicShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="shell">
      <header className="nav">
        <div className={`container${wide ? ' container-wide' : ''} nav-inner`}>
          <Brand />
          <nav className="nav-links">
            {wide && (
              <>
                <a href="#features" className="nav-link nav-link-optional">Features</a>
                <a href="#how-it-works" className="nav-link nav-link-optional">How it works</a>
              </>
            )}
            <Link to="/register" className="nav-link">Sign up</Link>
            <Link to="/login" className="btn btn-accent">Log in</Link>
          </nav>
        </div>
      </header>
      <main className={`container${wide ? ' container-wide main-wide' : ''}`}>{children}</main>
      <Footer wide={wide} />
    </div>
  )
}

/* 24×24 stroke icons for the mobile tab bar. */
const ICONS: Record<string, string> = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  snap: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  expenses: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  lottery: 'M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM10 7v12',
  chat: 'M4 5h16v11H9l-5 4z',
  settings:
    'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
}

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

const LINKS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/snap', label: 'Snap', icon: 'snap' },
  { to: '/expenses', label: 'Expenses', icon: 'expenses' },
  { to: '/ird-lottery', label: 'IRD lottery', icon: 'lottery' },
  { to: '/chat', label: 'Chat', icon: 'chat' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export function AuthedShell({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return (
    <div className="shell shell-authed">
      <header className="nav">
        <div className="container nav-inner">
          <Brand />
          <nav className="nav-links nav-links-app" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
            <button type="button" className="logout-btn" onClick={logout}>
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
      <Footer />
      <nav className="tabbar" aria-label="Main">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={tabClass}>
            <Icon name={l.icon} />
            <span>{l.label === 'IRD lottery' ? 'Lottery' : l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
