import { useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../api/auth'

export default function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const t = await login(email, password)
      localStorage.setItem('token', t.access_token)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <a href="/" className="brand">
        <span className="brand-mark" aria-hidden>
          ₹
        </span>
        Nepal Fin Buddy
      </a>
      <form className="login" onSubmit={(e) => void submit(e)}>
        <div className="login-head">
          <h2>Welcome back</h2>
          <p>Log in to take back control of your financial life.</p>
        </div>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="login-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}