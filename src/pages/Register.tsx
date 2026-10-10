import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register } from '../api/auth'
import { ApiError } from '../api/client'

export default function Register({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const t = await register({
        email,
        password,
        full_name: fullName.trim(),
      })
      localStorage.setItem('token', t.access_token)
      onDone()
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'That email is already registered. Try logging in instead.'
          : err instanceof Error
            ? err.message
            : String(err),
      )
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
          <h2>Create your account</h2>
          <p>Start tracking your money in NPR with BS dates.</p>
        </div>
        <label className="field">
          <span>Full name</span>
          <input className="input" type="text" autoComplete="name" autoFocus required
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" placeholder="you@example.com" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" placeholder="At least 8 characters"
            autoComplete="new-password" minLength={8} required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-accent" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="login-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
