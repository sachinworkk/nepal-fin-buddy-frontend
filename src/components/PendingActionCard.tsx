import type { Decision, PendingAction, PendingActionChanges, PendingActionExpense } from '../api/chat'
import { fmtAd, formatNpr } from '../lib/dates'
import { usePaymentMethods } from '../lib/usePaymentMethods'

interface Props {
  actions: PendingAction[]
  busy: boolean
  onDecide: (decision: Decision) => void
}

const DECISION_LABEL: Record<Decision, string> = { confirm: 'Confirmed', cancel: 'Cancelled' }

/** BS date on top, AD below — the way the expense list shows dates. */
function DateValue({ bs, ad }: { bs?: string | null; ad?: string | null }) {
  if (!bs && !ad) return <>—</>
  return (
    <span className="action-date">
      {bs && <span>{bs}</span>}
      {ad && <small>{fmtAd(ad)}</small>}
    </span>
  )
}

interface DiffRow {
  label: string
  before: React.ReactNode
  after: React.ReactNode
}

function useDiffRows(expense: PendingActionExpense, changes: PendingActionChanges): DiffRow[] {
  const { labelOf } = usePaymentMethods()
  const text = (v?: string | null) => v || '—'
  const rows: DiffRow[] = []
  if (changes.amount !== undefined)
    rows.push({ label: 'Amount', before: formatNpr(expense.amount), after: formatNpr(changes.amount) })
  if (changes.category !== undefined)
    rows.push({
      label: 'Category',
      before: <span className="action-cat">{expense.category}</span>,
      after: <span className="action-cat">{changes.category}</span>,
    })
  if (changes.merchant !== undefined)
    rows.push({ label: 'Merchant', before: text(expense.merchant), after: text(changes.merchant) })
  if (changes.expense_date !== undefined || changes.expense_date_bs !== undefined)
    rows.push({
      label: 'Date',
      before: <DateValue bs={expense.date_bs} ad={expense.date} />,
      after: <DateValue bs={changes.expense_date_bs} ad={changes.expense_date} />,
    })
  if (changes.payment_method !== undefined)
    rows.push({
      label: 'Payment',
      before: text(labelOf(expense.payment_method)),
      after: text(labelOf(changes.payment_method)),
    })
  if (changes.note !== undefined)
    rows.push({ label: 'Note', before: text(expense.note), after: text(changes.note) })
  return rows
}

function UpdateBody({ expense, changes }: { expense: PendingActionExpense; changes: PendingActionChanges }) {
  const rows = useDiffRows(expense, changes)
  return (
    <>
      <p className="action-title">
        Update <strong>{expense.merchant || 'Untitled'}</strong>
      </p>
      <dl className="action-diff">
        {rows.map((r) => (
          <div key={r.label} className="action-diff-row">
            <dt>{r.label}</dt>
            <dd>
              <span className="action-before">{r.before}</span>
              <span className="action-arrow" aria-label="changes to">→</span>
              <span className="action-after">{r.after}</span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function DeleteBody({ expense }: { expense: PendingActionExpense }) {
  return (
    <>
      <p className="action-title">Delete this expense?</p>
      <div className="action-expense">
        <span className="action-expense-main">
          <strong>{expense.merchant || 'Untitled'}</strong>
          <span className="action-cat">{expense.category}</span>
        </span>
        <DateValue bs={expense.date_bs} ad={expense.date} />
        <span className="action-amount">{formatNpr(expense.amount)}</span>
      </div>
    </>
  )
}

/** Confirmation cards for the edits/deletes an assistant message is waiting on. */
export default function PendingActionCard({ actions, busy, onDecide }: Props) {
  const undecided = actions.filter((a) => a.decision === null)
  const many = undecided.length > 1
  return (
    <div className="action-cards">
      {actions.map((a) => (
        <div key={a.interrupt_id} className={`action-card${a.decision ? ' is-decided' : ''}`}>
          {a.action === 'delete' || !a.changes ? (
            <DeleteBody expense={a.expense} />
          ) : (
            <UpdateBody expense={a.expense} changes={a.changes} />
          )}
          {a.decision && (
            <em className={`badge ${a.decision === 'confirm' ? 'badge-ok' : 'badge-muted'}`}>
              {DECISION_LABEL[a.decision]}
            </em>
          )}
        </div>
      ))}
      {undecided.length > 0 && (
        <div className="action-buttons">
          {busy && <span className="spinner" aria-label="Submitting" />}
          <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => onDecide('cancel')}>
            {many ? 'Cancel all' : 'Cancel'}
          </button>
          <button className="btn btn-accent btn-sm" type="button" disabled={busy} onClick={() => onDecide('confirm')}>
            {many ? 'Confirm all' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  )
}
