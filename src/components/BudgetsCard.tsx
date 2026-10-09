import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteBudget, getBudgets, setBudget } from '../api/budgets'
import { CATEGORIES, type Category } from '../api/expenses'
import { formatNpr } from '../lib/dates'

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Monthly budgets per category with this BS month's progress, and a dialog to edit them. */
export default function BudgetsCard() {
  const qc = useQueryClient()
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: getBudgets })
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: async () => {
      const current = new Map((budgets.data ?? []).map((b) => [b.category, Number(b.amount)]))
      for (const c of CATEGORIES) {
        const next = (values[c] ?? '').trim()
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

  const open = () => {
    save.reset()
    setValues(Object.fromEntries((budgets.data ?? []).map((b) => [b.category, String(Number(b.amount))])))
    setEditing(true)
  }
  const invalid = (c: Category) => {
    const v = (values[c] ?? '').trim()
    return v !== '' && !(Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v))
  }
  const anyInvalid = CATEGORIES.some(invalid)
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
          <form className="modal modal-scroll" role="dialog" aria-modal="true" aria-labelledby="budget-title"
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={(ev) => { ev.preventDefault(); if (!anyInvalid) save.mutate() }}>
            <h3 id="budget-title" className="modal-title">Monthly budgets</h3>
            <p className="modal-body">
              Set a limit per Bikram Sambat month. Leave a category empty for no budget.
            </p>
            <div className="form-grid">
              {CATEGORIES.map((c) => (
                <label className="field" key={c}>
                  <span>{cap(c)}</span>
                  <input type="text" inputMode="decimal" placeholder="No budget" value={values[c] ?? ''}
                    aria-invalid={invalid(c)}
                    onChange={(ev) => setValues((v) => ({ ...v, [c]: ev.target.value }))} />
                  {invalid(c) && <span className="field-error">Enter an amount above 0 (max 2 decimals)</span>}
                </label>
              ))}
            </div>
            {save.error && <p className="form-error">{errMsg(save.error)}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" disabled={save.isPending}
                onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-accent" type="submit" disabled={save.isPending || anyInvalid}>
                {save.isPending ? 'Saving…' : 'Save budgets'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
