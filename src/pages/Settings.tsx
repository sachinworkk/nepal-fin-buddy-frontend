import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { updateMe, type Language, type UserOut } from '../api/auth'
import { logout } from '../lib/auth'
import { useMe } from '../lib/useMe'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

function ProfileCard() {
  const { data: me, isLoading } = useMe()
  if (isLoading || !me) {
    return (
      <div className="card settings-card">
        <h3 className="card-title">Profile</h3>
        <p className="muted">Loading…</p>
      </div>
    )
  }
  return <ProfileForm me={me} />
}

function ProfileForm({ me }: { me: UserOut }) {
  const qc = useQueryClient()
  const [name, setName] = useState(me.full_name ?? '')
  const [lang, setLang] = useState<Language>(me.preferred_language)

  const dirty = name.trim() !== (me.full_name ?? '') || lang !== me.preferred_language

  const save = useMutation({
    mutationFn: () => updateMe({ full_name: name.trim() || null, preferred_language: lang }),
    onSuccess: (u) => qc.setQueryData(['me'], u),
  })

  return (
    <form
      className="card settings-card"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="card-head">
        <div>
          <h3 className="card-title">Profile</h3>
          <p className="card-sub">Signed in as {me.email}</p>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Full name</span>
          <input className="input" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Language</span>
          <select className="input" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
            <option value="en">English</option>
            <option value="ne">नेपाली (Nepali)</option>
          </select>
          <small className="field-hint">Used for assistant replies and IRD lottery messages.</small>
        </label>
      </div>
      {save.isError && <p className="form-error">{errMsg(save.error)}</p>}
      <div className="form-actions">
        {save.isSuccess && !dirty && <span className="badge badge-ok">Saved</span>}
        <button className="btn btn-accent" type="submit" disabled={save.isPending || !dirty}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default function Settings() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-sub">Manage your profile and account.</p>
        </div>
      </div>
      <div className="settings-grid">
        <ProfileCard />
        <div className="card settings-row">
          <div>
            <h3 className="card-title">Account</h3>
            <p className="card-sub">Sign out of Nepal Fin Buddy on this device.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </>
  )
}
