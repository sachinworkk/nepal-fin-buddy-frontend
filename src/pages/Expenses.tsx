import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listBills } from '../api/bills'
import { CATEGORIES, deleteExpense, listExpenses, type ExpenseOut } from '../api/expenses'
import DateInput, { type DateValue } from '../components/DateInput'
import ExpenseForm from '../components/ExpenseForm'
import { formatNpr, useBsConvert, useDebounced } from '../lib/dates'
import { usePaymentMethods } from '../lib/usePaymentMethods'

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
  const paymentMethod = params.get('payment_method') ?? ''
  const { options: paymentOptions, labelOf: paymentLabel } = usePaymentMethods()
  const page = Math.max(1, Number(params.get('page')) || 1)

  // `?new=1` (e.g. from the dashboard) opens the add form straight away.
  const [showForm, setShowForm] = useState(() => params.get('new') === '1')
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

  const closeForm = () => {
    setShowForm(false)
    if (params.has('new'))
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.delete('new')
        return n
      }, { replace: true })
  }

  const filters = { category, payment_method: paymentMethod, q, date_from: dateFrom, date_to: dateTo }
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', filters, page],
    queryFn: () => listExpenses({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const bills = useQuery({ queryKey: ['bills'], queryFn: listBills, staleTime: 30_000 })
  const enteredBillIds = new Set((bills.data ?? []).filter((b) => b.prize_enrolled).map((b) => b.id))

  const remove = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      setConfirmId(null)
      void qc.invalidateQueries({ queryKey: ['expenses'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
      void qc.invalidateQueries({ queryKey: ['bills'] })
    },
  })

  const expenses = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = !!(category || paymentMethod || q || dateFrom || dateTo)
  const firstIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Expenses</h2>
          <p className="page-sub">Every expense you've recorded — from bills, chat, or by hand.</p>
        </div>
        {!showForm && !editing && (
          <button className="btn btn-accent" type="button" onClick={() => setShowForm(true)}>
            Add expense
          </button>
        )}
      </div>

      {showForm && <ExpenseForm onDone={closeForm} />}
      {editing && <ExpenseForm key={editing.id} expense={editing} onDone={() => setEditing(null)} />}

      <div className="filters">
        <label className="field">
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
        <label className="field">
          <span>Payment method</span>
          <select className="input" value={paymentMethod} onChange={(e) => setParam('payment_method', e.target.value)}>
            <option value="">All methods</option>
            {paymentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
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
      </div>

      {filtered && (
        <div className="filters-bar">
          <span>{isLoading ? 'Filtering…' : `${total} matching expense${total === 1 ? '' : 's'}`}</span>
          <button
            className="btn-link"
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
        </div>
      )}

      {error && <p className="form-error">{errMsg(error)}</p>}
      {remove.isError && <p className="form-error">{errMsg(remove.error)}</p>}

      {isLoading && <p className="page-body">Loading expenses…</p>}

      {!isLoading && !error && expenses.length === 0 && (
        <div className="empty-state">
          <strong>{filtered ? 'No expenses match these filters' : 'No expenses yet'}</strong>
          <p>
            {filtered
              ? 'Try widening the date range or clearing the search.'
              : 'Snap a bill or add one by hand — confirmed expenses show up here.'}
          </p>
          {!filtered && (
            <div className="empty-actions">
              <Link className="btn btn-accent" to="/snap">Snap a bill</Link>
              {!showForm && (
                <button className="btn btn-ghost" type="button" onClick={() => setShowForm(true)}>
                  Add manually
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {expenses.length > 0 && (
        <div className="expenses-card">
          <div className="expenses-head">
            <span>Merchant</span>
            <span>Category</span>
            <span>Date</span>
            <span className="expenses-amount">Amount</span>
            <span />
          </div>
          {expenses.map((e) => (
            <div key={e.id} className="expenses-row">
              <span className="expenses-merchant">
                <strong title={e.merchant || undefined}>{e.merchant || 'Untitled'}</strong>
                <span className="expenses-tags">
                  <em className="badge badge-muted">{SOURCE_LABEL[e.source]}</em>
                  {e.payment_method && <em className="badge badge-muted">{paymentLabel(e.payment_method)}</em>}
                  {e.bill?.bill_number && (
                    <em className="badge badge-muted" title={e.bill.vendor_pan ? `PAN ${e.bill.vendor_pan}` : undefined}>
                      Bill #{e.bill.bill_number}
                    </em>
                  )}
                  {e.bill_id && enteredBillIds.has(e.bill_id) && (
                    <em className="badge badge-accent">Lottery entered</em>
                  )}
                </span>
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
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" disabled={remove.isPending}
                      onClick={() => remove.mutate(e.id)}>
                      {remove.isPending ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost btn-sm" type="button"
                      onClick={() => { closeForm(); setEditing(e); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" aria-label={`Delete ${e.merchant || 'expense'}`}
                      onClick={() => setConfirmId(e.id)}>
                      Delete
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          <span>
            {firstIdx}–{lastIdx} of {total}
          </span>
          <span className="pager-btns">
            <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}>
              ← Previous
            </button>
            <button className="btn btn-ghost btn-sm" type="button" disabled={page >= pages}
              onClick={() => setParam('page', String(page + 1))}>
              Next →
            </button>
          </span>
        </div>
      )}
    </>
  )
}
