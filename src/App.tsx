import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthedShell, PublicShell } from './components/Layout'
import { isAuthed } from './lib/auth'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Landing from './pages/Landing'
import Lottery from './pages/Lottery'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import Snap from './pages/Snap'

const queryClient = new QueryClient()

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
                authed(<Dashboard />)
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
          <Route path="/ird-lottery" element={authed(<Lottery />)} />
          <Route path="/chat" element={authed(<Chat />)} />
          <Route path="/settings" element={authed(<Settings />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
