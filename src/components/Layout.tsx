import { Navigate, NavLink } from 'react-router-dom'
import { isAuthed } from '../lib/auth'


const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden>
        ₹
      </span>
      Nepal Fin Buddy
    </span>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <strong>Nepal Fin Buddy</strong>
      <span>Personal finance, built for Nepal · NPR &amp; BS dates supported</span>
    </footer>
  )
}

export function PublicShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="shell">
      <header className="nav">
        <Brand />
        <nav>
          {wide && (
            <>
              <a href="#features" className="nav-link">Features</a>
              <a href="#how-it-works" className="nav-link">How it works</a>
            </>
          )}
          <a href="/register" className="nav-link">Sign up</a>
          <a href="/login" className="btn btn-accent nav-cta">Log in</a>
        </nav>
      </header>
      <main className={wide ? 'wide' : undefined}>{children}</main>
      <Footer />
    </div>
  )
}

const LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/snap', label: 'Snap' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/ird-lottery', label: 'IRD lottery' },
  { to: '/chat', label: 'Chat' },
  { to: '/settings', label: 'Settings' },
]

export function AuthedShell({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return (
    <div className="shell">
      <header className="nav">
        <Brand />
        <nav className="nav-scroll">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('token')
              window.location.assign('/')
            }}
          >
            Log out
          </button>
        </nav>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  )
}
