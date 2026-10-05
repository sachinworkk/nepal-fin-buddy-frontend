import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register, type Language } from '../api/auth'
import { ApiError } from '../api/client'

export default function Register({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [lang, setLang] = useState<Language>('en')
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
        full_name: fullName.trim() || undefined,
        preferred_language: lang,
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
      <form className="login" onSubmit={(e) => void submit(e)}>
        <div className="login-head">
          <h2>Create your account</h2>
          <p>Start tracking your money in NPR with BS dates.</p>
        </div>
        <div className="field">
          <input className="input" type="text" placeholder="Full name (optional)" autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <input className="input" type="email" placeholder="Email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <input className="input" type="password" placeholder="Password (min 8 characters)"
            autoComplete="new-password" minLength={8} required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <fieldset className="lang-pick">
          <legend>Preferred language</legend>
          <label><input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} /> English</label>
          <label><input type="radio" name="lang" checked={lang === 'ne'} onChange={() => setLang('ne')} /> नेपाली</label>
        </fieldset>
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
