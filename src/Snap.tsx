import { useRef, useState } from 'react'
import {
  CATEGORIES,
  confirmBill,
  updateBill,
  uploadBill,
  type BillItem,
  type BillOut,
  type Category,
} from './api'

type Stage = 'upload' | 'editing' | 'confirmed'

interface Draft {
  id: string
  vendor_name: string
  vendor_pan: string
  bill_number: string
  bill_date_ad: string
  bill_date_bs_raw: string
  subtotal: string
  discount: string
  vat_amount: string
  total_amount: string
  category: Category
  items: BillItem[]
}

function toDraft(b: BillOut): Draft {
  return {
    id: b.id,
    vendor_name: b.vendor_name ?? '',
    vendor_pan: b.vendor_pan ?? '',
    bill_number: b.bill_number ?? '',
    bill_date_ad: b.bill_date_ad ?? '',
    bill_date_bs_raw: b.bill_date_bs_raw ?? '',
    subtotal: b.subtotal ?? '',
    discount: b.discount ?? '',
    vat_amount: b.vat_amount ?? '',
    total_amount: b.total_amount ?? '',
    category: 'groceries',
    items: b.items.map((i) => ({ ...i })),
  }
}

const FIELDS: { key: 'vendor_name' | 'vendor_pan' | 'bill_number' | 'bill_date_ad'
  | 'subtotal' | 'discount' | 'vat_amount' | 'total_amount'; label: string; type?: string }[] = [
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'vendor_pan', label: 'Vendor PAN' },
  { key: 'bill_number', label: 'Bill number' },
  { key: 'bill_date_ad', label: 'Date (AD)', type: 'date' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'discount', label: 'Discount' },
  { key: 'vat_amount', label: 'VAT amount' },
  { key: 'total_amount', label: 'Total amount' },
]

export default function Snap() {
  const [stage, setStage] = useState<Stage>('upload')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function pick(f: File | null) {
    if (!f || busy) return
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

  function set(key: keyof Draft, value: string) {
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
    if (!draft.total_amount || !draft.bill_date_ad) {
      setError('Total amount and Date (AD) are required to confirm.')
      return
    }
    setBusy(true)
    try {
      const patch: Partial<BillOut> = {
        vendor_name: draft.vendor_name || null,
        vendor_pan: draft.vendor_pan || null,
        bill_number: draft.bill_number || null,
        bill_date_ad: draft.bill_date_ad || null,
        subtotal: draft.subtotal || null,
        discount: draft.discount || null,
        vat_amount: draft.vat_amount || null,
        total_amount: draft.total_amount || null,
        items: draft.items,
      }
      await updateBill(draft.id, patch)
      await confirmBill(draft.id, {
        ...patch,
        category: draft.category,
        total_amount: draft.total_amount,
        bill_date_ad: draft.bill_date_ad,
      })
      setStage('confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2 className="page-title">Snap a bill</h2>
      <p className="page-sub">
        Upload a bill photo or PDF. We extract the fields with AI — check them, fix anything
        wrong, then confirm to record the expense.
      </p>

      {error && <p className="form-error snap-error">{error}</p>}

      {stage === 'upload' && (
        <div
          className="snap-drop"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <span className="snap-drop-icon" aria-hidden>📷</span>
          <strong>{busy ? 'Extracting…' : 'Choose a bill photo or PDF'}</strong>
          <span>JPEG, PNG, WebP or PDF · up to 10 MB</span>
          {busy && (
            <div className="snap-progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {stage === 'editing' && draft && (
        <div className="snap-card">
          <div className="snap-grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="snap-field">
                <span>{f.label}</span>
                <input
                  className="input"
                  type={f.type ?? 'text'}
                  value={String(draft[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            ))}
            <label className="snap-field">
              <span>Category</span>
              <select
                className="input"
                value={draft.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <h3 className="snap-items-head">Items</h3>
          <div className="snap-items">
            {draft.items.map((it, i) => (
              <div key={i} className="snap-item">
                <input
                  className="input"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => setItem(i, 'description', e.target.value)}
                />
                <input
                  className="input snap-item-qty"
                  placeholder="Qty"
                  value={it.quantity ?? ''}
                  onChange={(e) => setItem(i, 'quantity', e.target.value)}
                />
                <input
                  className="input snap-item-amt"
                  placeholder="Amount"
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
          <button type="button" className="snap-add" onClick={addItem}>+ Add item</button>

          <div className="snap-actions">
            <button
              type="button"
              className="btn btn-accent"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Confirming…' : 'Confirm expense'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setDraft(null)
                setStage('upload')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === 'confirmed' && (
        <div className="snap-done">
          <h3>Expense recorded ✓</h3>
          <p>
            {draft?.vendor_name || 'The bill'} · Rs. {draft?.total_amount} was added to your
            expenses and is now searchable in chat.
          </p>
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
        </div>
      )}
    </>
  )
}
