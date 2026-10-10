import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteBudget, getBudgets, setBudget } from '../api/budgets'
import { CATEGORIES, type Category } from '../api/expenses'
import { formatNpr } from '../lib/dates'

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const WalletIcon = () => (
  <svg {...svg} width={22} height={22}>
    <path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3m0 0h-4a2 2 0 0 0 0 4h4v-4Zm0 4v3a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6" />
  </svg>
)
const CloseIcon = () => <svg {...svg}><path d="M18 6 6 18M6 6l12 12" /></svg>
const PlusIcon = () => <svg {...svg}><path d="M12 5v14M5 12h14" /></svg>
const SearchIcon = () => <svg {...svg}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Monthly budgets per category with this BS month's progress, and a dialog to edit them. */
export default function BudgetsCard() {
  const qc = useQueryClient()
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: getBudgets })
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [active, setActive] = useState<Category[]>([])
  const [query, setQuery] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      const current = new Map((budgets.data ?? []).map((b) => [b.category, Number(b.amount)]))
      for (const c of CATEGORIES) {
        const next = active.includes(c) ? (values[c] ?? '').trim() : ''
        if (next === '') {
          if (current.has(c)) await deleteBudget(c)
        } else if (Number(next) !== current.get(c)) {
          await setBudget(c, next)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      setEditing(false)
    },
  })

  const load = () => {
    const saved = budgets.data ?? []
    setValues(Object.fromEntries(saved.map((b) => [b.category, String(Number(b.amount))])))
    setActive(saved.map((b) => b.category))
    setQuery('')
  }
  const open = () => {
    save.reset()
    load()
    setEditing(true)
  }
  const reset = () => { save.reset(); load() }
  const addCategory = (c: Category) => setActive((a) => [...a, c])
  const removeCategory = (c: Category) => {
    setActive((a) => a.filter((x) => x !== c))
    setValues((v) => ({ ...v, [c]: '' }))
  }
  const invalid = (c: Category) => {
    const v = (values[c] ?? '').trim()
    return v !== '' && !(Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v))
  }
  const anyInvalid = active.some(invalid)
  const total = active.reduce((sum, c) => (invalid(c) ? sum : sum + (Number(values[c]) || 0)), 0)
  const available = CATEGORIES.filter((c) => !active.includes(c) && c.includes(query.trim().toLowerCase()))
  const rows = budgets.data ?? []

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h3 className="dash-h">Monthly budgets</h3>
        <button className="btn btn-ghost btn-sm" type="button" onClick={open} disabled={budgets.isLoading}>
          {rows.length ? 'Edit budgets' : 'Set budgets'}
        </button>
      </div>
      {budgets.isLoading && <p className="dash-muted">Loading…</p>}
      {budgets.error && <p className="form-error">{errMsg(budgets.error)}</p>}
      {budgets.data && rows.length === 0 && (
        <p className="dash-muted">No budgets yet. Set a monthly limit for the categories you want to watch.</p>
      )}
      <ul className="cat-list">
        {rows.map((b) => (
          <li key={b.category}>
            <div className="cat-row">
              <span>{cap(b.category)}</span>
              <span className="cat-amt">
                {formatNpr(b.spent)} of {formatNpr(b.amount)}
                <em className={`budget-pct budget-${b.status}`}>
                  {b.status === 'over'
                    ? `${formatNpr(Math.abs(Number(b.remaining)))} over`
                    : `${formatNpr(b.remaining)} left`}
                </em>
              </span>
            </div>
            <div className="cat-track" role="progressbar" aria-label={`${cap(b.category)} budget used`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.round(b.percent), 100)}>
              <div className={`cat-fill budget-fill budget-${b.status}`}
                style={{ width: `${Math.min(Math.max(b.percent, 1), 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="modal-backdrop" onClick={() => !save.isPending && setEditing(false)}>
          <form className="modal modal-scroll bm" role="dialog" aria-modal="true" aria-labelledby="budget-title"
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={(ev) => { ev.preventDefault(); if (!anyInvalid) save.mutate() }}>
            <header className="bm-head">
              <span className="bm-icon" aria-hidden="true"><WalletIcon /></span>
              <div>
                <h3 id="budget-title" className="modal-title">Set monthly budget</h3>
                <p className="bm-sub">Plan your spending with a limit per category, for each Bikram Sambat month.</p>
              </div>
              <button className="bm-close" type="button" aria-label="Close" disabled={save.isPending}
                onClick={() => setEditing(false)}>
                <CloseIcon />
              </button>
            </header>

            <div className="bm-grid">
              <div className="bm-main">
                <div className="bm-total">
                  <div>
                    <span className="bm-label">Total monthly budget</span>
                    <strong className="bm-total-amt">{formatNpr(total)}</strong>
                  </div>
                  <div className="bm-total-side">
                    <span className="bm-count">
                      {active.length} {active.length === 1 ? 'category' : 'categories'}
                    </span>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={reset} disabled={save.isPending}>
                      Reset
                    </button>
                  </div>
                </div>

                <h4 className="bm-h">Categories</h4>
                {active.length === 0 ? (
                  <p className="bm-empty">No categories yet. Add one from the list to set a limit.</p>
                ) : (
                  <ul className="bm-rows">
                    {active.map((c) => {
                      const amt = Number(values[c])
                      const pct = total > 0 && amt > 0 && !invalid(c) ? (amt / total) * 100 : 0
                      return (
                        <li className="bm-row" key={c}>
                          <span className="bm-avatar" aria-hidden="true">{cap(c)[0]}</span>
                          <label className="bm-name" htmlFor={`bm-${c}`}>{cap(c)}</label>
                          <div className="bm-limit">
                            <span className="bm-prefix">Rs.</span>
                            <input id={`bm-${c}`} type="text" inputMode="decimal" placeholder="0" value={values[c] ?? ''}
                              aria-invalid={invalid(c)} aria-describedby={invalid(c) ? `bm-err-${c}` : undefined}
                              onChange={(ev) => setValues((v) => ({ ...v, [c]: ev.target.value }))} />
                          </div>
                          <div className="bm-share" aria-label={`${Math.round(pct)}% of total`}>
                            <span>{Math.round(pct)}%</span>
                            <div className="bm-bar"><div style={{ width: `${pct}%` }} /></div>
                          </div>
                          <button className="bm-remove" type="button" aria-label={`Remove ${c} budget`}
                            onClick={() => removeCategory(c)}>
                            <CloseIcon />
                          </button>
                          {invalid(c) && (
                            <span className="field-error bm-row-err" id={`bm-err-${c}`}>
                              Enter an amount above 0 (max 2 decimals)
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <aside className="bm-side">
                <h4 className="bm-h">Add category</h4>
                <div className="bm-search">
                  <SearchIcon />
                  <input type="search" placeholder="Search category…" aria-label="Search category" value={query}
                    onChange={(ev) => setQuery(ev.target.value)} />
                </div>
                <span className="bm-label">Available categories</span>
                {available.length === 0 ? (
                  <p className="bm-empty">{query ? 'No matching categories.' : 'Every category has a budget.'}</p>
                ) : (
                  <ul className="bm-suggest">
                    {available.map((c) => (
                      <li key={c}>
                        <button type="button" onClick={() => addCategory(c)}>
                          <span className="bm-avatar" aria-hidden="true">{cap(c)[0]}</span>
                          <span>{cap(c)}</span>
                          <PlusIcon />
                          <span className="sr-only">Add {c}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="bm-tip">You can change or remove category budgets any time. Leave a category out for no budget.</p>
              </aside>
            </div>

            {save.error && <p className="form-error bm-error">{errMsg(save.error)}</p>}
            <div className="modal-actions bm-actions">
              <button className="btn btn-ghost" type="button" disabled={save.isPending}
                onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-accent" type="submit" disabled={save.isPending || anyInvalid}>
                {save.isPending ? 'Saving…' : 'Save budget'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
