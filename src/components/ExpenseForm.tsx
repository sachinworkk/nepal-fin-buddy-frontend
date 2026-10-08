import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import {
  CATEGORIES,
  createExpense,
  updateExpense,
  type Category,
  type ExpenseBill,
  type ExpenseIn,
  type ExpenseOut,
  type PaymentMethod,
} from '../api/expenses'
import { loadDateMode } from '../lib/dates'
import { usePaymentMethods } from '../lib/usePaymentMethods'
import DateInput, { type DateValue } from './DateInput'

const emptyBill = {
  vendor_pan: '',
  bill_number: '',
  subtotal: '',
  discount: '',
  taxable_amount: '',
  vat_amount: '',
}
type BillForm = typeof emptyBill

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

function initialBill(e?: ExpenseOut): BillForm {
  const b = e?.bill
  if (!b) return emptyBill
  const out = { ...emptyBill }
  for (const k of Object.keys(emptyBill) as (keyof BillForm)[]) out[k] = b[k] ?? ''
  return out
}

/** The filled-in bill fields, or null when none are (the expense has no bill). */
function billPayload(bill: BillForm): ExpenseBill | null {
  const entries = Object.entries(bill)
    .map(([k, v]) => [k, v.trim()] as const)
    .filter(([, v]) => v !== '')
  return entries.length ? Object.fromEntries(entries) : null
}

const BILL_AMOUNTS: [keyof BillForm, string][] = [
  ['subtotal', 'Subtotal'],
  ['discount', 'Discount'],
  ['taxable_amount', 'Taxable amount'],
  ['vat_amount', 'VAT amount'],
]

const DEFAULT_VAT_PCT = '13'
const round2 = (n: number) => Math.round(n * 100) / 100
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
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
  const [bill, setBill] = useState<BillForm>(() => initialBill(expense))
  const [hasBill, setHasBill] = useState(!!expense?.bill)
  // Taxable / VAT follow subtotal and discount until the user types their own value.
  // The VAT rate isn't stored (only the amount is), so an edited bill's rate is worked out from it.
  const [vatPct, setVatPct] = useState(() => {
    const t = num(expense?.bill?.taxable_amount ?? '')
    const v = num(expense?.bill?.vat_amount ?? '')
    return t && v !== null ? String(round2((v / t) * 100)) : DEFAULT_VAT_PCT
  })
  // PAN-only bills carry no VAT: the VAT fields are hidden and the total is just the taxable amount.
  const [noVat, setNoVat] = useState(() => {
    const b = expense?.bill
    return !!b && (num(b.vat_amount ?? '') ?? 0) === 0
  })
  const [manual, setManual] = useState({ taxable: false, vat: false })
  const [date, setDate] = useState<DateValue>(() => initialDate(expense))
  // A scanned bill keeps its own vendor, date and total; only its tax-invoice details are edited here.
  // If the scanned bill was deleted, new details make a manual bill from the fields above.
  const scanned = expense?.source === 'bill' && !!expense.bill
  const showBill = hasBill || scanned

  const billOut = noVat ? { ...bill, vat_amount: '' } : bill

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
        bill: (showBill ? billPayload(billOut) : null) ?? undefined,
      }
      return expense
        ? updateExpense(expense.id, {
            ...payload,
            // Allow clearing optional text fields when editing.
            merchant: body.merchant,
            note: body.note,
            payment_method: body.payment_method || null,
            bill: showBill ? billPayload(billOut) : null,
          })
        : createExpense(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
      void queryClient.invalidateQueries({ queryKey: ['bills'] })
      onDone()
    },
  })

  const set = (k: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const setB = (k: keyof BillForm) => (e: { target: { value: string } }) =>
    setBill((b) => ({ ...b, [k]: e.target.value }))

  const rate = num(vatPct) === null ? null : num(vatPct)! / 100
  const setBillAmount = (k: keyof BillForm) => (e: { target: { value: string } }) => {
    const v = e.target.value
    const next = { ...bill, [k]: v }
    const m = { ...manual }
    if (k === 'taxable_amount') m.taxable = v !== ''
    if (k === 'vat_amount') m.vat = v !== ''
    if (!m.taxable && (k === 'subtotal' || k === 'discount' || k === 'taxable_amount')) {
      const sub = num(next.subtotal)
      next.taxable_amount = sub === null ? '' : Math.max(0, round2(sub - (num(next.discount) ?? 0))).toFixed(2)
    }
    if (!noVat && !m.vat && k !== 'vat_amount') {
      const t = num(next.taxable_amount)
      next.vat_amount = t === null || rate === null ? '' : round2(t * rate).toFixed(2)
    }
    setBill(next)
    setManual(m)
  }

  const toggleNoVat = (checked: boolean) => {
    setNoVat(checked)
    const t = num(bill.taxable_amount)
    setManual((m) => ({ ...m, vat: false }))
    setBill((b) => ({
      ...b,
      vat_amount: checked || t === null || rate === null ? '' : round2(t * rate).toFixed(2),
    }))
  }

  const changeVatPct = (e: { target: { value: string } }) => {
    const v = e.target.value
    const p = num(v)
    setVatPct(v)
    setManual((m) => ({ ...m, vat: false }))
    const t = num(bill.taxable_amount)
    if (p !== null && t !== null) setBill((b) => ({ ...b, vat_amount: round2((t * p) / 100).toFixed(2) }))
  }

  // Each step of the bill's arithmetic is checked on its own, so a wrong number is named, not hidden.
  const subtotal = num(bill.subtotal)
  const discount = num(bill.discount) ?? 0
  const taxable = num(bill.taxable_amount)
  const vat = noVat ? 0 : num(bill.vat_amount)
  const billTotal = taxable !== null && vat !== null ? round2(taxable + vat) : null
  const paid = num(form.amount)
  const off = (a: number, b: number) => Math.abs(a - b) >= 0.5
  const expectedTaxable = subtotal !== null ? Math.max(0, round2(subtotal - discount)) : null
  const expectedVat = !noVat && taxable !== null && rate !== null ? round2(taxable * rate) : null
  const billIssues: { text: string; fix: string; apply: () => void }[] = []
  if (expectedTaxable !== null && taxable !== null && off(taxable, expectedTaxable))
    billIssues.push({
      text: `Taxable ${money(taxable)} isn't subtotal − discount (${money(expectedTaxable)})`,
      fix: money(expectedTaxable),
      apply: () => {
        setBill((b) => ({
          ...b,
          taxable_amount: expectedTaxable.toFixed(2),
          vat_amount: manual.vat ? b.vat_amount : rate === null ? b.vat_amount : round2(expectedTaxable * rate).toFixed(2),
        }))
        setManual((m) => ({ ...m, taxable: false }))
      },
    })
  if (expectedVat !== null && vat !== null && off(vat, expectedVat))
    billIssues.push({
      text: `VAT ${money(vat)} isn't ${num(vatPct)}% of taxable (${money(expectedVat)})`,
      fix: money(expectedVat),
      apply: () => {
        setBill((b) => ({ ...b, vat_amount: expectedVat.toFixed(2) }))
        setManual((m) => ({ ...m, vat: false }))
      },
    })
  if (billTotal !== null && paid !== null && off(billTotal, paid))
    billIssues.push({
      text: `Bill total ${money(billTotal)} doesn't match total paid ${money(paid)}`,
      fix: money(billTotal),
      apply: () => setForm((f) => ({ ...f, amount: billTotal.toFixed(2) })),
    })

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
          <span>{showBill ? 'Total paid (NPR)' : 'Amount (NPR)'}</span>
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
          <span>Merchant / vendor</span>
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

      <div className="bill-details">
        {!scanned && (
          <label className="bill-toggle">
            <input type="checkbox" checked={hasBill} onChange={(e) => setHasBill(e.target.checked)} />
            <span>I have a bill for this</span>
            <span className="field-hint">for VAT or PAN bills and the prize lottery</span>
          </label>
        )}
        {showBill && (
          <>
            <div className="form-grid">
              <label className="field">
                <span>Vendor PAN / VAT no.</span>
                <input
                  className="input"
                  inputMode="numeric"
                  pattern="\d{9}"
                  title="9-digit PAN/VAT number"
                  maxLength={9}
                  placeholder="e.g. 301234567"
                  value={bill.vendor_pan}
                  onChange={setB('vendor_pan')}
                />
              </label>
              <label className="field">
                <span>Bill / invoice number</span>
                <input
                  className="input"
                  maxLength={100}
                  placeholder="e.g. INV-2083-0142"
                  value={bill.bill_number}
                  onChange={setB('bill_number')}
                />
              </label>
              {BILL_AMOUNTS.filter(([k]) => !(noVat && k === 'vat_amount')).map(([k, label]) => (
                <Fragment key={k}>
                {k === 'vat_amount' && !noVat && (
                  <label className="field">
                    <span>VAT %</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="13"
                      value={vatPct}
                      onChange={changeVatPct}
                    />
                  </label>
                )}
                <label className="field">
                  <span>{label}</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={bill[k]}
                    onChange={setBillAmount(k)}
                  />
                </label>
                </Fragment>
              ))}
                <label className="bill-toggle bill-toggle-cell">
                  <input type="checkbox" checked={noVat} onChange={(e) => toggleNoVat(e.target.checked)} />
                  <span>No VAT on this bill</span>
                  <span className="field-hint">PAN-only vendor</span>
                </label>
            </div>
            {billTotal !== null &&
              (billIssues.length ? (
                <ul className="bill-check bill-check-warn">
                  {billIssues.map((i) => (
                    <li key={i.text}>
                      {i.text}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={i.apply}>
                        Use {i.fix}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bill-check bill-check-ok">
                  ✓{' '}
                  {subtotal !== null && `Subtotal ${money(subtotal)} − Discount ${money(discount)} = `}
                  Taxable {money(taxable ?? 0)}{noVat ? ' (no VAT)' : ` + VAT ${money(vat ?? 0)}`} = <strong>{money(billTotal)}</strong>
                  {paid !== null && ', matches total paid'}
                </p>
              ))}
            <p className="field-hint bill-details-hint">
              {scanned
                ? 'From a scanned bill: the vendor, bill date and total stay as scanned.'
                : 'Total paid is the bill\'s grand total. The vendor, bill date and payment method come from the fields above.'}
            </p>
          </>
        )}
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
