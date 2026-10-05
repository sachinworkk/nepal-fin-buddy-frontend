import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, deleteExpense, listExpenses, type ExpenseOut } from '../api/expenses'
import DateInput, { type DateValue } from '../components/DateInput'
import ExpenseForm from '../components/ExpenseForm'
import { formatNpr, useBsConvert, useDebounced } from '../lib/dates'

const PAGE_SIZE = 20
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

function fmtAd(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SOURCE_LABEL: Record<ExpenseOut['source'], string> = {
  manual: 'Manual',
  chat: 'Chat',
  bill: 'Bill',
}

/** Resolve a DateInput value to an AD ISO date (BS goes through /dates/convert). */
function useAdDate(v: DateValue) {
  const conv = useBsConvert(v.bs ? { bs: v.bs } : null)
  return v.ad || conv.data?.ad || undefined
}

export default function Expenses() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExpenseOut | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState<DateValue>({})
  const [to, setTo] = useState<DateValue>({})
  const q = useDebounced(search.trim(), 400)
  const dateFrom = useAdDate(from)
  const dateTo = useAdDate(to)

  const setParam = (k: string, v: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (v) n.set(k, v)
      else n.delete(k)
      if (k !== 'page') n.delete('page')
      return n
    })

  const filters = { category, q, date_from: dateFrom, date_to: dateTo }
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', filters, page],
    queryFn: () => listExpenses({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const remove = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      setConfirmId(null)
      void qc.invalidateQueries({ queryKey: ['expenses'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const expenses = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = !!(category || q || dateFrom || dateTo)
  const firstIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <div className="expenses-topbar">
        <div>
          <h2 className="page-title">Expenses</h2>
          <p className="page-sub">Every expense you've recorded — from bills, chat, or by hand.</p>
        </div>
        {showForm ? (
          <button className="btn" type="button" onClick={() => setShowForm(false)}>
            Close
          </button>
        ) : (
          <button className="btn btn-accent" type="button" onClick={() => { setEditing(null); setShowForm(true) }}>
            Add expense
          </button>
        )}
      </div>

      {showForm && <ExpenseForm onDone={() => setShowForm(false)} />}
      {editing && <ExpenseForm key={editing.id} expense={editing} onDone={() => setEditing(null)} />}

      <div className="filters">
        <label className="snap-field">
          <span>Category</span>
          <select className="input" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="snap-field">
          <span>Search</span>
          <input
            className="input"
            type="search"
            placeholder="Merchant or note"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setParam('page', '')
            }}
          />
        </label>
        <DateInput label="From" value={from} onChange={(v) => { setFrom(v); setParam('page', '') }} />
        <DateInput label="To" value={to} onChange={(v) => { setTo(v); setParam('page', '') }} />
        {filtered && (
          <button
            className="btn filters-clear"
            type="button"
            onClick={() => {
              setSearch('')
              setFrom({})
              setTo({})
              setParams({})
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="form-error">{errMsg(error)}</p>}
      {remove.isError && <p className="form-error">{errMsg(remove.error)}</p>}

      {isLoading && <p className="page-body">Loading expenses…</p>}

      {!isLoading && !error && expenses.length === 0 && (
        <div className="expenses-empty">
          <strong>{filtered ? 'No expenses match these filters' : 'No expenses yet'}</strong>
          <span>
            {filtered
              ? 'Try widening the date range or clearing the search.'
              : 'Snap a bill or chat with your assistant — confirmed expenses show up here.'}
          </span>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="expenses-card">
          <div className="expenses-head">
            <span>Merchant</span>
            <span>Category</span>
            <span>Date (BS)</span>
            <span className="expenses-amount">Amount</span>
            <span />
          </div>
          {expenses.map((e) => (
            <div key={e.id} className="expenses-row">
              <span className="expenses-merchant">
                <strong>{e.merchant || 'Untitled'}</strong>
                <em className={`expenses-source expenses-source-${e.source}`}>
                  {SOURCE_LABEL[e.source]}
                </em>
              </span>
              <span className="expenses-cat">{e.category}</span>
              <span className="expenses-date">
                <span>{e.expense_date_bs}</span>
                <small>{fmtAd(e.expense_date_ad)}</small>
              </span>
              <span className="expenses-amount">{formatNpr(e.amount)}</span>
              <span className="expenses-actions">
                {confirmId === e.id ? (
                  <>
                    <button className="btn btn-danger" type="button" disabled={remove.isPending}
                      onClick={() => remove.mutate(e.id)}>
                      {remove.isPending ? 'Deleting…' : 'Delete?'}
                    </button>
                    <button className="btn" type="button" onClick={() => setConfirmId(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn" type="button"
                      onClick={() => { setShowForm(false); setEditing(e); window.scrollTo({ top: 0 }) }}>
                      Edit
                    </button>
                    <button className="btn" type="button" onClick={() => setConfirmId(e.id)}>
                      Delete
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="pager">
          <span className="settings-muted">
            {firstIdx}–{lastIdx} of {total}
          </span>
          <span className="pager-btns">
            <button className="btn" type="button" disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}>
              Prev
            </button>
            <button className="btn" type="button" disabled={page >= pages}
              onClick={() => setParam('page', String(page + 1))}>
              Next
            </button>
          </span>
        </div>
      )}
    </>
  )
}
