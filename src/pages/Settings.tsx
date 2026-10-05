import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { updateMe, type Language, type UserOut } from '../api/auth'
import { ApiError } from '../api/client'
import {
  deleteIrdCredentials,
  getIrdCredentials,
  type IrdCredentialsOut,
  saveIrdCredentials,
} from '../api/settings'
import { useMe } from '../lib/useMe'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

function ProfileCard() {
  const { data: me, isLoading } = useMe()
  if (isLoading || !me) {
    return (
      <div className="settings-card">
        <h3>Profile</h3>
        <p className="page-body">Loading…</p>
      </div>
    )
  }
  return <ProfileForm me={me} />
}

function ProfileForm({ me }: { me: UserOut }) {
  const qc = useQueryClient()
  const [name, setName] = useState(me.full_name ?? '')
  const [lang, setLang] = useState<Language>(me.preferred_language)

  const save = useMutation({
    mutationFn: () => updateMe({ full_name: name.trim() || null, preferred_language: lang }),
    onSuccess: (u) => qc.setQueryData(['me'], u),
  })

  return (
    <form
      className="settings-card"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <h3>Profile</h3>
      {(
        <>
          <p className="settings-muted">Signed in as {me.email}</p>
          <label className="snap-field">
            <span>Full name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="snap-field">
            <span>Language</span>
            <select className="input" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="ne">नेपाली (Nepali)</option>
            </select>
            <small className="settings-muted">
              Currently this affects assistant replies and IRD error messages.
            </small>
          </label>
          {save.isError && <p className="form-error">{errMsg(save.error)}</p>}
          <div className="settings-actions">
            <button className="btn btn-accent" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </button>
            {save.isSuccess && <span className="badge badge-ok">Saved</span>}
          </div>
        </>
      )}
    </form>
  )
}

function IrdCard() {
  const creds = useQuery({
    queryKey: ['ird-credentials'],
    queryFn: async () => {
      try {
        return await getIrdCredentials()
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
  })
  if (creds.isLoading || creds.isError) {
    return (
      <div className="settings-card">
        <h3>IRD (CBMS) credentials</h3>
        {creds.isError ? (
          <p className="form-error">{errMsg(creds.error)}</p>
        ) : (
          <p className="page-body">Loading…</p>
        )}
      </div>
    )
  }
  // Keyed on updated_at so the form (and its always-blank password) resets after a save.
  return <IrdForm key={creds.data?.updated_at ?? 'none'} saved={creds.data ?? null} />
}

function IrdForm({ saved }: { saved: IrdCredentialsOut | null }) {
  const qc = useQueryClient()
  const [username, setUsername] = useState(saved?.username ?? '')
  const [pan, setPan] = useState(saved?.seller_pan ?? '')
  const [password, setPassword] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const save = useMutation({
    mutationFn: () => saveIrdCredentials({ username, password, seller_pan: pan }),
    onSuccess: (c) => qc.setQueryData(['ird-credentials'], c),
  })
  const remove = useMutation({
    mutationFn: deleteIrdCredentials,
    onSuccess: () => {
      qc.setQueryData(['ird-credentials'], null)
      setConfirmRemove(false)
    },
  })

  return (
    <form
      className="settings-card"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <h3>
        IRD (CBMS) credentials{' '}
        {saved?.has_password && <span className="badge badge-ok">Saved</span>}
      </h3>
      <p className="settings-muted">
        Used to submit your invoices to the Inland Revenue Department. The password is stored
        encrypted and is never shown again — enter it whenever you save.
      </p>
      {!saved && <p className="settings-empty">No credentials saved yet.</p>}
      {(
        <>
          <label className="snap-field">
            <span>IRD username</span>
            <input className="input" required autoComplete="off" value={username}
              onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="snap-field">
            <span>IRD password</span>
            <input className="input" type="password" required autoComplete="new-password"
              placeholder={saved?.has_password ? '•••••••• (re-enter to update)' : ''}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="snap-field">
            <span>Seller PAN</span>
            <input className="input" required inputMode="numeric" value={pan}
              onChange={(e) => setPan(e.target.value)} />
          </label>
          {saved && (
            <p className="settings-muted">
              Last updated {new Date(saved.updated_at).toLocaleString()}
            </p>
          )}
          {(save.isError || remove.isError) && (
            <p className="form-error">{errMsg(save.error ?? remove.error)}</p>
          )}
          <div className="settings-actions">
            <button className="btn btn-accent" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save credentials'}
            </button>
            {saved &&
              (confirmRemove ? (
                <>
                  <span className="settings-muted">Remove saved credentials?</span>
                  <button type="button" className="btn btn-danger" disabled={remove.isPending}
                    onClick={() => remove.mutate()}>
                    {remove.isPending ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmRemove(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => setConfirmRemove(true)}>
                  Remove
                </button>
              ))}
          </div>
        </>
      )}
    </form>
  )
}

export default function Settings() {
  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Your profile and the IRD account used for invoice submission.</p>
      <div className="settings-grid">
        <ProfileCard />
        <IrdCard />
      </div>
    </>
  )
}
