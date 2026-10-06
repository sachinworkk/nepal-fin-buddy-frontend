import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { updateMe, type Language, type UserOut } from '../api/auth'
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
              Currently this affects assistant replies and IRD lottery messages.
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

export default function Settings() {
  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Your profile.</p>
      <div className="settings-grid">
        <ProfileCard />
      </div>
    </>
  )
}
