import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Login from './Login'

const queryClient = new QueryClient()

const Page = ({ title }: { title: string }) => <h2>{title}</h2>

function Shell() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('token'))

  if (!authed) {
    return <Login onDone={() => setAuthed(true)} />
  }

  return (
    <>
      <header className="nav">
        <strong>Nepal Fin Buddy</strong>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/snap">Snap</Link>
          <Link to="/expenses">Expenses</Link>
          <Link to="/chat">Chat</Link>
          <button
            className="link-btn"
            onClick={() => {
              localStorage.removeItem('token')
              setAuthed(false)
            }}
          >
            Log out
          </button>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Page title="Dashboard" />} />
          <Route path="/snap" element={<Page title="Snap a bill" />} />
          <Route path="/expenses" element={<Page title="Expenses" />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>
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
