import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  CATEGORIES,
  createExpense,
  updateExpense,
  type Category,
  type ExpenseIn,
  type ExpenseOut,
  type PaymentMethod,
} from '../api/expenses'
import { loadDateMode } from '../lib/dates'
import { usePaymentMethods } from '../lib/usePaymentMethods'
import DateInput, { type DateValue } from './DateInput'

const emptyForm = {
  amount: '',
  category: 'other' as Category,
  merchant: '',
  note: '',
  payment_method: '' as PaymentMethod | '',
}
const today = (): DateValue => ({ ad: new Date().toISOString().slice(0, 10) })

function initialDate(e?: ExpenseOut): DateValue {
  if (!e) return today()
  return loadDateMode() === 'bs' ? { bs: e.expense_date_bs } : { ad: e.expense_date_ad }
}

/** Create form, or edit form when `expense` is given. */
export default function ExpenseForm({ onDone, expense }: { onDone: () => void; expense?: ExpenseOut }) {
  const queryClient = useQueryClient()
  const { options: paymentOptions } = usePaymentMethods()
  const [form, setForm] = useState(
    expense
      ? {
          amount: String(expense.amount),
          category: expense.category as Category,
          merchant: expense.merchant ?? '',
          note: expense.note ?? '',
          payment_method: (expense.payment_method ?? '') as PaymentMethod | '',
        }
      : emptyForm,
  )
  const [date, setDate] = useState<DateValue>(() => initialDate(expense))

  const mutation = useMutation({
    mutationFn: (body: typeof emptyForm) => {
      const payload: ExpenseIn = {
        amount: body.amount,
        category: body.category,
        merchant: body.merchant || undefined,
        note: body.note || undefined,
        payment_method: body.payment_method || undefined,
        expense_date: date.ad,
        expense_date_bs: date.bs,
      }
      return expense
        ? updateExpense(expense.id, {
            ...payload,
            // Allow clearing optional text fields when editing.
            merchant: body.merchant,
            note: body.note,
            payment_method: body.payment_method || null,
          })
        : createExpense(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
      onDone()
    },
  })

  const set = (k: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form className="card expense-form" onSubmit={submit}>
      <div className="card-head">
        <h3 className="card-title">{expense ? 'Edit expense' : 'New expense'}</h3>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Amount (NPR)</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            autoFocus
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={set('amount')}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Merchant</span>
          <input
            className="input"
            placeholder="e.g. Bhatbhateni"
            value={form.merchant}
            onChange={set('merchant')}
          />
        </label>
        <DateInput label="Date" required value={date} onChange={setDate} />
        <label className="field">
          <span>Payment method</span>
          <select className="input" value={form.payment_method} onChange={set('payment_method')}>
            <option value="">Not specified</option>
            {paymentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <input
            className="input"
            placeholder="Anything worth remembering"
            value={form.note}
            onChange={set('note')}
          />
        </label>
      </div>
      {mutation.isError && (
        <p className="form-error">
          {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-ghost" type="button" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </button>
        <button className="btn btn-accent" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : expense ? 'Save changes' : 'Save expense'}
        </button>
      </div>
    </form>
  )
}
