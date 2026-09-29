import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'

const queryClient = new QueryClient()

const Page = ({ title }: { title: string }) => <h2>{title}</h2>

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <header className="nav">
          <strong>Nepal Fin Buddy</strong>
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/snap">Snap</Link>
            <Link to="/expenses">Expenses</Link>
            <Link to="/chat">Chat</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Page title="Dashboard" />} />
            <Route path="/snap" element={<Page title="Snap a bill" />} />
            <Route path="/expenses" element={<Page title="Expenses" />} />
            <Route path="/chat" element={<Page title="Assistant" />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
