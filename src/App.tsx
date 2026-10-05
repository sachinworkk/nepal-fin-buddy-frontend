import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthedShell, PublicShell } from './components/Layout'
import { isAuthed } from './lib/auth'
import Chat from './pages/Chat'
import Expenses from './pages/Expenses'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import Snap from './pages/Snap'

const queryClient = new QueryClient()

function Placeholder({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 className="page-title">{title}</h2>
      <p className="page-sub">{sub}</p>
      <p className="page-body">This section will appear here.</p>
    </>
  )
}

const authed = (el: React.ReactNode) => <AuthedShell>{el}</AuthedShell>
const goHome = () => window.location.assign('/')

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthed() ? (
                authed(
                  <Placeholder
                    title="Dashboard"
                    sub="Overview of your expenses and bills will appear here."
                  />,
                )
              ) : (
                <PublicShell wide>
                  <Landing />
                </PublicShell>
              )
            }
          />
          <Route path="/login" element={isAuthed() ? <Navigate to="/" replace /> : <Login onDone={goHome} />} />
          <Route
            path="/register"
            element={isAuthed() ? <Navigate to="/" replace /> : <Register onDone={goHome} />}
          />
          <Route path="/snap" element={authed(<Snap />)} />
          <Route path="/expenses" element={authed(<Expenses />)} />
          <Route path="/chat" element={authed(<Chat />)} />
          <Route path="/settings" element={authed(<Settings />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
