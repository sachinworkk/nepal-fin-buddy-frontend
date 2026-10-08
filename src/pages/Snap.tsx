import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmBill, updateBill, uploadBill, type BillItem, type BillOut } from '../api/bills'
import { CATEGORIES, type Category } from '../api/expenses'
import DateInput, { type DateValue } from '../components/DateInput'
import { adToBs, formatBs, parseBs, resolveAd } from '../lib/bsCalendar'
import { formatNpr, loadDateMode } from '../lib/dates'

type Stage = 'upload' | 'editing' | 'confirmed'

interface Draft {
  id: string
  vendor_name: string
  vendor_pan: string
  bill_number: string
  date: DateValue
  printed_bs: string
  subtotal: string
  discount: string
  vat_amount: string
  total_amount: string
  category: Category
  items: BillItem[]
}

/** Initial date in the user's preferred calendar; the printed BS date wins when it parses. */
function initialDate(b: BillOut): DateValue {
  const printed = b.bill_date_bs_raw ? parseBs(b.bill_date_bs_raw) : null
  if (loadDateMode() === 'bs') {
    const bs = printed ?? (b.bill_date_ad ? adToBs(b.bill_date_ad) : null)
    if (bs) return { bs: formatBs(bs) }
  }
  return b.bill_date_ad ? { ad: b.bill_date_ad } : {}
}

function toDraft(b: BillOut): Draft {
  return {
    id: b.id,
    vendor_name: b.vendor_name ?? '',
    vendor_pan: b.vendor_pan ?? '',
    bill_number: b.bill_number ?? '',
    date: initialDate(b),
    printed_bs: b.bill_date_bs_raw ?? '',
    subtotal: b.subtotal ?? '',
    discount: b.discount ?? '',
    vat_amount: b.vat_amount ?? '',
    total_amount: b.total_amount ?? '',
    category: 'groceries',
    items: b.items.map((i) => ({ ...i })),
  }
}

const FIELDS: { key: 'vendor_name' | 'vendor_pan' | 'bill_number'
  | 'subtotal' | 'discount' | 'vat_amount' | 'total_amount'; label: string; type?: string; numeric?: boolean }[] = [
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'vendor_pan', label: 'Vendor PAN' },
  { key: 'bill_number', label: 'Bill number' },
  { key: 'subtotal', label: 'Subtotal', numeric: true },
  { key: 'discount', label: 'Discount', numeric: true },
  { key: 'vat_amount', label: 'VAT amount', numeric: true },
  { key: 'total_amount', label: 'Total amount', numeric: true },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export default function Snap() {
  const qc = useQueryClient()
  const [stage, setStage] = useState<Stage>('upload')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function pick(f: File | null) {
    if (!f || busy) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file — use a JPEG, PNG or PDF.')
      return
    }
    setError('')
    setBusy(true)
    setProgress(0)
    try {
      const bill = await uploadBill(f, setProgress)
      setDraft(toDraft(bill))
      setStage('editing')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function set(key: Exclude<keyof Draft, 'date' | 'items'>, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  function setItem(idx: number, key: keyof BillItem, value: string) {
    setDraft((d) =>
      d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) } : d,
    )
  }

  function addItem() {
    setDraft((d) =>
      d ? { ...d, items: [...d.items, { description: '', quantity: '', amount: '' }] } : d,
    )
  }

  function removeItem(idx: number) {
    setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d))
  }

  async function confirm() {
    if (!draft || busy) return
    setError('')
    const dateAd = resolveAd(draft.date)
    if (!draft.total_amount || !dateAd) {
      setError('Total amount and a valid bill date are required to confirm.')
      return
    }
    setBusy(true)
    try {
      const patch: Partial<BillOut> = {
        vendor_name: draft.vendor_name || null,
        vendor_pan: draft.vendor_pan || null,
        bill_number: draft.bill_number || null,
        bill_date_ad: dateAd,
        subtotal: draft.subtotal || null,
        discount: draft.discount || null,
        vat_amount: draft.vat_amount || null,
        total_amount: draft.total_amount || null,
        items: draft.items,
      }
      await updateBill(draft.id, patch)
      // The backend takes exactly one calendar and stores the AD date plus the BS string.
      const { bill_date_ad: _ad, ...rest } = patch
      await confirmBill(draft.id, {
        ...rest,
        category: draft.category,
        total_amount: draft.total_amount,
        ...(draft.date.bs ? { bill_date_bs: draft.date.bs } : { bill_date_ad: dateAd }),
      })
      void qc.invalidateQueries({ queryKey: ['expenses'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
      void qc.invalidateQueries({ queryKey: ['bills'] })
      setStage('confirmed')
      toast.success('Bill saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Snap a bill</h2>
          <p className="page-sub">
            {stage === 'editing'
              ? 'Check what we extracted, fix anything wrong, then confirm to record the expense.'
              : 'Upload a bill photo or PDF and we\'ll pull out the vendor, items and totals for you.'}
          </p>
        </div>
      </div>

      {error && <p className="notice notice-err snap-error" role="alert">{error}</p>}

      {stage === 'upload' && (
        <div
          className={`snap-drop${dragging ? ' dragging' : ''}${busy ? ' busy' : ''}`}
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void pick(e.dataTransfer.files?.[0] ?? null)
          }}
          role="button"
          tabIndex={0}
          aria-busy={busy}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          <span className="empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            </svg>
          </span>
          <strong>{busy ? 'Reading your bill…' : 'Drop a bill here, or click to choose'}</strong>
          <span>JPEG, PNG or PDF · up to 10 MB</span>
          {busy ? (
            <div className="snap-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${progress}%` }} />
            </div>
          ) : (
            <span className="btn btn-accent" aria-hidden>Choose file</span>
          )}
        </div>
      )}

      {stage === 'editing' && draft && (
        <div className="card">
          <h3 className="snap-items-head">Bill details</h3>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="field">
                <span>{f.label}</span>
                <input
                  className="input"
                  type={f.type ?? 'text'}
                  inputMode={f.numeric ? 'decimal' : undefined}
                  value={String(draft[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            ))}
            <div>
              <DateInput
                label="Bill date"
                required
                value={draft.date}
                onChange={(date) => setDraft((d) => (d ? { ...d, date } : d))}
              />
              {draft.printed_bs && <small className="date-preview">Printed on bill: {draft.printed_bs} BS</small>}
            </div>
            <label className="field">
              <span>Category</span>
              <select
                className="input"
                value={draft.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>

          <h3 className="snap-items-head">Items</h3>
          {draft.items.length > 0 && (
            <div className="snap-items-cols" aria-hidden>
              <span>Description</span>
              <span>Qty</span>
              <span className="snap-item-amt">Amount</span>
              <span />
            </div>
          )}
          <div className="snap-items">
            {draft.items.map((it, i) => (
              <div key={i} className="snap-item">
                <input
                  className="input"
                  placeholder="Description"
                  aria-label={`Item ${i + 1} description`}
                  value={it.description}
                  onChange={(e) => setItem(i, 'description', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Qty"
                  inputMode="decimal"
                  aria-label={`Item ${i + 1} quantity`}
                  value={it.quantity ?? ''}
                  onChange={(e) => setItem(i, 'quantity', e.target.value)}
                />
                <input
                  className="input snap-item-amt"
                  placeholder="0.00"
                  inputMode="decimal"
                  aria-label={`Item ${i + 1} amount`}
                  value={it.amount ?? ''}
                  onChange={(e) => setItem(i, 'amount', e.target.value)}
                />
                <button
                  type="button"
                  className="snap-item-x"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => removeItem(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-link snap-add" onClick={addItem}>+ Add item</button>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setDraft(null)
                setError('')
                setStage('upload')
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn btn-accent"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Confirming…' : 'Confirm expense'}
            </button>
          </div>
        </div>
      )}

      {stage === 'confirmed' && (
        <div className="empty-state snap-done">
          <span className="empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <strong>Expense recorded</strong>
          <p>
            {draft?.vendor_name || 'The bill'} · {formatNpr(draft?.total_amount ?? 0)} was added to your
            expenses and is now searchable in chat.
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => {
                setDraft(null)
                setStage('upload')
              }}
            >
              Snap another bill
            </button>
            <Link className="btn btn-ghost" to="/expenses">View expenses</Link>
          </div>
        </div>
      )}
    </>
  )
}
