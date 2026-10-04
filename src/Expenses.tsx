import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listExpenses, type ExpenseOut } from './api'
import ExpenseForm from './ExpenseForm'

function formatNpr(amount: string) {
  const n = Number(amount)
  return Number.isFinite(n)
    ? `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `Rs. ${amount}`
}

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

export default function Expenses() {
  const [showForm, setShowForm] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => listExpenses(),
  })

  const expenses = data ?? []

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
          <button className="btn btn-accent" type="button" onClick={() => setShowForm(true)}>
            Add expense
          </button>
        )}
      </div>

      {showForm && <ExpenseForm onDone={() => setShowForm(false)} />}

      {error && <p className="form-error">{error instanceof Error ? error.message : String(error)}</p>}

      {isLoading && <p className="page-body">Loading expenses…</p>}

      {!isLoading && !error && expenses.length === 0 && (
        <div className="expenses-empty">
          <strong>No expenses yet</strong>
          <span>
            Snap a bill or chat with your assistant — confirmed expenses show up here.
          </span>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="expenses-card">
          <div className="expenses-head">
            <span>Merchant</span>
            <span>Category</span>
            <span>Date</span>
            <span className="expenses-amount">Amount</span>
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
              <span className="expenses-date">{fmtAd(e.expense_date_ad)}</span>
              <span className="expenses-amount">{formatNpr(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
