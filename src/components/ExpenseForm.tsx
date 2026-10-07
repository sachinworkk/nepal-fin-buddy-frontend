import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createExpense,
  updateExpense,
  type Category,
  type ExpenseIn,
  type ExpenseOut,
} from '../api/expenses'
import { lookupLabel, useCategories, usePaymentMethods } from '../api/lookups'
import { loadDateMode } from '../lib/dates'
import DateInput, { type DateValue } from './DateInput'
import PaymentMethodPicker from './PaymentMethodPicker'

const emptyForm = {
  amount: '',
  // Empty until the lookups load; the first loaded option is used (see `category` below).
  category: '' as Category,
  merchant: '',
  note: '',
  // undefined = untouched (new entries default to the first method); null = cleared by the user.
  payment_method: undefined as string | null | undefined,
}
const today = (): DateValue => ({ ad: new Date().toISOString().slice(0, 10) })

function initialDate(e?: ExpenseOut): DateValue {
  if (!e) return today()
  return loadDateMode() === 'bs' ? { bs: e.expense_date_bs } : { ad: e.expense_date_ad }
}

/** Create form, or edit form when `expense` is given. */
export default function ExpenseForm({ onDone, expense }: { onDone: () => void; expense?: ExpenseOut }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(
    expense
      ? {
          amount: String(expense.amount),
          category: expense.category as Category,
          merchant: expense.merchant ?? '',
          note: expense.note ?? '',
          payment_method: expense.payment_method ?? null,
        }
      : emptyForm,
  )
  const categories = useCategories()
  const paymentMethods = usePaymentMethods()
  // Manual entries default to the first loaded option until the user picks one.
  const category = form.category || categories.data?.[0]?.slug || ''
  const paymentMethod =
    form.payment_method !== undefined
      ? form.payment_method
      : expense
        ? null
        : (paymentMethods.data?.[0]?.code ?? null)
  const [date, setDate] = useState<DateValue>(() => initialDate(expense))

  const mutation = useMutation({
    mutationFn: (body: typeof emptyForm) => {
      const payload: ExpenseIn = {
        amount: body.amount,
        category,
        merchant: body.merchant || undefined,
        note: body.note || undefined,
        payment_method: paymentMethod || undefined,
        expense_date: date.ad,
        expense_date_bs: date.bs,
      }
      return expense
        ? updateExpense(expense.id, {
            ...payload,
            // Allow clearing optional text fields when editing.
            merchant: body.merchant,
            note: body.note,
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
          <select className="input" value={category} onChange={set('category')}>
            {(categories.data ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {lookupLabel(c)}
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
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
        />
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
