import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Landing from './Dashboard'
import Login from './Login'

const queryClient = new QueryClient()

function isAuthed() {
  return !!localStorage.getItem('token')
}

function navClass({ isActive }: { isActive: boolean }) {
  return `nav-link${isActive ? ' active' : ''}`
}

function Placeholder({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 className="page-title">{title}</h2>
      <p className="page-sub">{sub}</p>
      <p className="page-body">This section will appear here.</p>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function Shell() {
  return (
    <Routes>
      {/* Public: landing page (authed users get the app) */}
      <Route
        path="/"
        element={
          isAuthed() ? (
            <AuthedShell>
              <Placeholder
                title="Dashboard"
                sub="Overview of your expenses and bills will appear here."
              />
            </AuthedShell>
          ) : (
            <LandingShell />
          )
        }
      />
      <Route path="/login" element={<LoginShell />} />
      {/* Authed app routes */}
      <Route
        path="/snap"
        element={
          <AuthedShell>
            <Placeholder title="Snap a bill" sub="Upload a bill photo or PDF to extract an expense." />
          </AuthedShell>
        }
      />
      <Route
        path="/expenses"
        element={
          <AuthedShell>
            <Placeholder title="Expenses" sub="Your recorded expenses will appear here." />
          </AuthedShell>
        }
      />
      <Route
        path="/chat"
        element={
          <AuthedShell>
            <Chat />
          </AuthedShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LoginShell() {
  if (isAuthed()) {
    return <Navigate to="/" replace />
  }
  return <Login onDone={() => (window.location.href = '/')} />
}

function LandingShell() {
  return (
    <div className="shell">
      <header className="nav">
        <span className="brand">
          <span className="brand-mark" aria-hidden>
            ₹
          </span>
          Nepal Fin Buddy
        </span>
        <nav>
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#how-it-works" className="nav-link">
            How it works
          </a>
          <a href="/login" className="btn btn-accent nav-cta">
            Log in
          </a>
        </nav>
      </header>
      <main className="wide">
        <Landing />
      </main>
      <footer className="footer">
        <strong>Nepal Fin Buddy</strong>
        <span>Personal finance, built for Nepal · NPR &amp; BS dates supported</span>
      </footer>
    </div>
  )
}

function AuthedShell({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="shell">
      <header className="nav">
        <span className="brand">
          <span className="brand-mark" aria-hidden>
            ₹
          </span>
          Nepal Fin Buddy
        </span>
        <nav>
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/snap" className={navClass}>
            Snap
          </NavLink>
          <NavLink to="/expenses" className={navClass}>
            Expenses
          </NavLink>
          <NavLink to="/chat" className={navClass}>
            Chat
          </NavLink>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('token')
              window.location.href = '/'
            }}
          >
            Log out
          </button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <strong>Nepal Fin Buddy</strong>
        <span>Personal finance, built for Nepal · NPR &amp; BS dates supported</span>
      </footer>
    </div>
  )
}