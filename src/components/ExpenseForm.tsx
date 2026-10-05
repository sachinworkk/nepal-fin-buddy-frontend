import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CATEGORIES, createExpense, type Category, type ExpenseOut } from '../api/expenses'
import DateInput, { type DateValue } from './DateInput'

const emptyForm = {
  amount: '',
  category: 'other' as Category,
  merchant: '',
  note: '',
  payment_method: '',
}
const today = (): DateValue => ({ ad: new Date().toISOString().slice(0, 10) })

export default function ExpenseForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [date, setDate] = useState<DateValue>(today)

  const mutation = useMutation({
    mutationFn: (body: typeof emptyForm) =>
      createExpense({
        amount: body.amount,
        category: body.category,
        merchant: body.merchant || undefined,
        note: body.note || undefined,
        payment_method: body.payment_method || undefined,
        expense_date: date.ad,
        expense_date_bs: date.bs,
      }),
    onSuccess: (created: ExpenseOut) => {
      queryClient.setQueryData<ExpenseOut[]>(['expenses'], (prev) =>
        prev ? [created, ...prev] : [created],
      )
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
    <form className="expense-form" onSubmit={submit}>
      <div className="snap-grid">
        <label className="snap-field">
          <span>Amount (NPR)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={set('amount')}
          />
        </label>
        <label className="snap-field">
          <span>Category</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="snap-field">
          <span>Merchant</span>
          <input
            className="input"
            placeholder="e.g. Bhatbhateni"
            value={form.merchant}
            onChange={set('merchant')}
          />
        </label>
        <DateInput label="Date" required value={date} onChange={setDate} />
        <label className="snap-field">
          <span>Payment method</span>
          <input
            className="input"
            placeholder="e.g. cash, eSewa, card"
            value={form.payment_method}
            onChange={set('payment_method')}
          />
        </label>
        <label className="snap-field expense-form-note">
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
      <div className="expense-form-actions">
        <button className="btn" type="button" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </button>
        <button className="btn btn-accent" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save expense'}
        </button>
      </div>
    </form>
  )
}
