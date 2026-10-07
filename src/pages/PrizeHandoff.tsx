import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBills } from '../api/bills'
import { ApiError } from '../api/client'
import {
  createPrizeHandoff,
  listEligiblePrizeBills,
  listPrizeEnrollments,
  markPrizeSubmitted,
  parsePrizeFieldErrors,
  type PrizeEligibleBill,
  type PrizeEnrollmentOut,
  type PrizeHandoffOut,
} from '../api/prize'
import { copyText } from '../lib/clipboard'
import { fmtAd, formatNpr } from '../lib/dates'
import { loadPrizeProfile, savePrizeProfile } from '../lib/prizeProfile'
import { validateAddress, validateMobile, validateName } from '../lib/prizeRules'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const URGENT_DAYS = 14
const COUPON_MAX = 12

interface Customer {
  name: string
  address: string
  mobile_number: string
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null
  const text = days < 0 ? 'Expired' : days === 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'} left`
  return <span className={`badge ${days < 0 ? 'badge-fail' : days <= URGENT_DAYS ? 'badge-warn' : 'badge-muted'}`}>{text}</span>
}

function handoffRows(h: PrizeHandoffOut): { key: string; label: string; value: string }[] {
  const f = h.fields
  const rows = [
    { key: 'bill_number', label: 'Bill number', value: f.bill_number },
    { key: 'seller_pan_no', label: 'Seller PAN', value: f.seller_pan_no },
    { key: 'bill_date', label: 'Bill date', value: f.bill_date },
    { key: 'billed_total_amount', label: 'Total amount', value: f.billed_total_amount },
    { key: 'payment_method', label: 'Payment method', value: f.payment_method },
    { key: 'name', label: 'Name', value: f.name },
    { key: 'address', label: 'Address', value: f.address },
    { key: 'mobile_number', label: 'Mobile', value: f.mobile_number },
  ]
  return rows.filter((r) => r.value)
}

// Mobile browsers can't run the prefill extension, so they get the plain portal URL.
function isMobileWeb(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData
  if (uaData) return uaData.mobile
  // iPadOS reports a desktop Mac user agent; touch support gives it away.
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Fragment for the optional prefill extension; inert (and never sent to a server) without it. */
function portalUrlWithPrefill(h: PrizeHandoffOut): string {
  if (isMobileWeb()) return h.portal_url
  const f = h.fields
  const json = JSON.stringify({
    feature: 'ird-prize-prefill',
    data: {
      bill_number: f.bill_number,
      seller_pan_no: f.seller_pan_no,
      bill_date: f.bill_date,
      billed_total_amount: f.billed_total_amount,
      payment_method: f.payment_method,
      name: f.name,
      address: f.address,
      mobile_number: f.mobile_number,
    },
  })
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')
  return `${h.portal_url.split('#')[0]}#nfb=${b64}`
}

function HandoffSheet({
  handoff,
  onClose,
  onDone,
}: {
  handoff: PrizeHandoffOut
  onClose: () => void
  onDone: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const rows = handoffRows(handoff)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(timer.current)
    }
  }, [onClose])

  // Called straight from click handlers: iOS only allows clipboard writes inside a user gesture.
  async function copy(key: string, text: string) {
    const ok = await copyText(text)
    setCopyFailed(!ok)
    setCopied(ok ? key : null)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1800)
  }

  const submitted = useMutation({
    mutationFn: () => markPrizeSubmitted(handoff.enrollment_id, coupon.trim() || undefined),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError && e.status === 409 ? `${e.message} — refresh your entries.` : errMsg(e)),
  })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h3 id="sheet-title">Submit on the IRD portal</h3>
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <ol className="sheet-steps">
          <li>Open the IRD portal and paste each value below into the matching field.</li>
          <li>Complete the security check on the portal and submit.</li>
          <li>Come back here and enter your coupon number (optional).</li>
        </ol>

        <button
          type="button"
          className="btn btn-accent btn-lg btn-block sheet-open"
          onClick={() => window.open(portalUrlWithPrefill(handoff), '_blank', 'noopener')}
        >
          Open IRD portal ↗
        </button>

        <div className="sheet-section">
          <span>Details to paste</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void copy('all', rows.map((r) => `${r.label}: ${r.value}`).join('\n'))}
          >
            {copied === 'all' ? 'Copied' : 'Copy all'}
          </button>
        </div>
        <div className="hand-rows">
          {rows.map((r) => (
            <div key={r.key} className="hand-row">
              <span className="hand-label">{r.label}</span>
              <strong className="hand-value">{r.value}</strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm hand-copy"
                aria-label={`Copy ${r.label}`}
                onClick={() => void copy(r.key, r.value)}
              >
                {copied === r.key ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
        <p className="lot-copy-status" role="status" aria-live="polite">
          {copied ? 'Copied to clipboard' : ''}
        </p>
        {copyFailed && (
          <p className="form-error">Couldn't copy automatically — press and hold a value to copy it.</p>
        )}

        <hr className="sheet-divider" />
        <label className="field">
          <span>Coupon number (optional)</span>
          <input
            className="input"
            value={coupon}
            maxLength={COUPON_MAX}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCoupon(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-accent btn-block"
            disabled={submitted.isPending}
            onClick={() => {
              setError(null)
              submitted.mutate()
            }}
          >
            {submitted.isPending ? 'Saving…' : "I've submitted it"}
          </button>
        </div>
      </div>
    </div>
  )
}

function BillForm({
  bill,
  onBack,
  onHandoff,
}: {
  bill: PrizeEligibleBill
  onBack: () => void
  onHandoff: (h: PrizeHandoffOut) => void
}) {
  const [c, setC] = useState<Customer>(loadPrizeProfile)
  const [touched, setTouched] = useState(false)
  const [serverErrs, setServerErrs] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const qc = useQueryClient()

  const local: Record<string, string | null> = {
    name: validateName(c.name),
    address: validateAddress(c.address),
    mobile_number: validateMobile(c.mobile_number),
  }
  const errFor = (k: string) => serverErrs[k] ?? (touched ? local[k] : null) ?? null

  const mut = useMutation({
    mutationFn: () =>
      createPrizeHandoff({
        bill_id: bill.bill_id,
        name: c.name.trim(),
        address: c.address.trim(),
        mobile_number: c.mobile_number.trim(),
      }),
    onSuccess: (h) => {
      savePrizeProfile({ name: c.name.trim(), address: c.address.trim(), mobile_number: c.mobile_number.trim() })
      void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
      void qc.invalidateQueries({ queryKey: ['prize-eligible'] })
      void qc.invalidateQueries({ queryKey: ['bills'] })
      onHandoff(h)
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) {
        const { fields, message } = parsePrizeFieldErrors(e)
        if (Object.keys(fields).length) {
          setServerErrs(fields)
          setBanner(null)
        } else setBanner(message)
        return
      }
      if (e instanceof ApiError && e.status === 409) {
        void qc.invalidateQueries({ queryKey: ['prize-eligible'] })
        void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
      }
      setBanner(errMsg(e))
    },
  })

  function edit(k: keyof Customer, v: string) {
    setC((p) => ({ ...p, [k]: v }))
    setServerErrs((s) => {
      if (!(k in s)) return s
      const n = { ...s }
      delete n[k]
      return n
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mut.isPending) return
    setTouched(true)
    if (Object.values(local).some(Boolean)) return
    setBanner(null)
    mut.mutate()
  }

  const shown = ['name', 'address', 'mobile_number']
  const otherErrs = Object.entries(serverErrs).filter(([k]) => !shown.includes(k))

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <h3 className="snap-items-head">Bill</h3>
      <div className="lot-bill-summary">
        <div>
          <span>Vendor</span>
          <strong>{bill.vendor_name || '—'}</strong>
        </div>
        <div>
          <span>Bill number</span>
          <strong>{bill.bill_number}</strong>
        </div>
        <div>
          <span>Seller PAN</span>
          <strong>{bill.seller_pan_no}</strong>
        </div>
        <div>
          <span>Total amount</span>
          <strong>{formatNpr(bill.billed_total_amount)}</strong>
        </div>
      </div>

      <h3 className="snap-items-head">Your details</h3>
      <p className="muted section-note">
        We'll remember these on this device for next time.
      </p>
      <div className="form-grid">
        {(
          [
            ['name', 'Full name', 'name', undefined],
            ['mobile_number', 'Mobile number', 'tel', '98XXXXXXXX'],
            ['address', 'Address', 'street-address', undefined],
          ] as const
        ).map(([k, label, ac, ph]) => (
          <label key={k} className={`field${k === 'address' ? ' span-2' : ''}`}>
            <span>{label}</span>
            <input
              className="input"
              autoComplete={ac}
              placeholder={ph}
              inputMode={k === 'mobile_number' ? 'numeric' : undefined}
              maxLength={k === 'mobile_number' ? 10 : undefined}
              value={c[k]}
              onChange={(e) => edit(k, e.target.value)}
            />
            {errFor(k) && <small className="field-error">{errFor(k)}</small>}
          </label>
        ))}
      </div>

      {otherErrs.length > 0 && (
        <ul className="form-error lot-err-list">
          {otherErrs.map(([k, m]) => (
            <li key={k}>{m}</li>
          ))}
        </ul>
      )}
      {banner && <p className="notice notice-err">{banner}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" disabled={mut.isPending} onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-accent" disabled={mut.isPending}>
          {mut.isPending ? 'Preparing…' : 'Continue to IRD portal'}
        </button>
      </div>
    </form>
  )
}

export default function PrizeHandoff() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<PrizeEligibleBill | null>(null)
  const [handoff, setHandoff] = useState<PrizeHandoffOut | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [continueErr, setContinueErr] = useState<string | null>(null)

  const eligible = useQuery({ queryKey: ['prize-eligible'], queryFn: listEligiblePrizeBills })
  // Enrollments carry no vendor name; borrow it from the bills list (shared cache with Expenses).
  const vendors = useQuery({ queryKey: ['bills'], queryFn: listBills, staleTime: 30_000 })
  const entries = useQuery({
    queryKey: ['prize-enrollments'],
    queryFn: () => listPrizeEnrollments(),
    placeholderData: (prev) => prev,
  })

  const all = entries.data ?? []
  const waiting = all.filter((e) => e.status === 'handed_off')
  const history = all.filter((e) => e.status !== 'handed_off')
  const taken = new Set(all.filter((e) => e.status !== 'failed').map((e) => e.bill_id))
  const bills = (eligible.data ?? []).filter((b) => !taken.has(b.bill_id))

  const resume = useMutation({
    mutationFn: (en: PrizeEnrollmentOut) =>
      createPrizeHandoff({
        bill_id: en.bill_id!,
        name: en.name,
        address: en.address,
        mobile_number: en.mobile_number,
      }),
    onSuccess: (h) => {
      setContinueErr(null)
      setHandoff(h)
    },
    onError: (e) => {
      setContinueErr(errMsg(e))
      if (e instanceof ApiError && e.status === 409) {
        void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
        void qc.invalidateQueries({ queryKey: ['prize-eligible'] })
      }
    },
  })

  function closeSheet() {
    setHandoff(null)
    setSelected(null)
  }

  function onDone() {
    closeSheet()
    setNotice('Recorded — your entry is in the history below.')
    void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
    void qc.invalidateQueries({ queryKey: ['prize-eligible'] })
    void qc.invalidateQueries({ queryKey: ['bills'] })
    window.scrollTo({ top: 0 })
  }

  const vendorOf = (billId: string | null) =>
    (billId && vendors.data?.find((b) => b.id === billId)?.vendor_name) || null

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">IRD lottery</h2>
          <p className="page-sub">
            Enter confirmed cash bills in the IRD taxpayer prize lottery. We prepare the details; you
            submit them on the IRD portal.
          </p>
        </div>
      </div>

      {notice && (
        <p className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="notice-dismiss" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </p>
      )}

      {selected ? (
        <BillForm bill={selected} onBack={() => setSelected(null)} onHandoff={setHandoff} />
      ) : (
        <>
          {waiting.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h3>Waiting for you</h3>
                <span>Finish submitting on the IRD portal</span>
              </div>
              {continueErr && <p className="notice notice-err">{continueErr}</p>}
              <div className="list-card">
                {waiting.map((en) => (
                  <div key={en.id} className="list-row">
                    <span className="list-main">
                      <strong>{vendorOf(en.bill_id) ?? `Bill ${en.bill_number || '—'}`}</strong>
                      <small>
                        Bill {en.bill_number || '—'} · {fmtAd(en.bill_date)}
                      </small>
                    </span>
                    <span className="list-end">
                      <span className="amount">{formatNpr(en.billed_total_amount)}</span>
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={resume.isPending || !en.bill_id}
                        onClick={() => resume.mutate(en)}
                      >
                        {resume.isPending && resume.variables?.id === en.id ? 'Opening…' : 'Continue'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <h3>Eligible bills</h3>
              {bills.length > 0 && <span>Pick a bill to enter it</span>}
            </div>
            {eligible.isError && (
              <p className="notice notice-err">
                <span>{errMsg(eligible.error)}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void eligible.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {eligible.isLoading && <p className="page-body">Loading your bills…</p>}
            {!eligible.isLoading && !eligible.isError && bills.length === 0 && (
              <div className="list-card">
                <div className="list-empty">
                  <span>
                    No eligible bills right now. Confirmed cash bills with a seller PAN and bill number
                    show up here.
                  </span>
                  <Link to="/snap" className="btn btn-ghost btn-sm">
                    Snap a bill
                  </Link>
                </div>
              </div>
            )}
            {bills.length > 0 && (
              <div className="list-card">
                {bills.map((b) => (
                  <button
                    key={b.bill_id}
                    type="button"
                    className="list-row"
                    onClick={() => {
                      setNotice(null)
                      setSelected(b)
                      window.scrollTo({ top: 0 })
                    }}
                  >
                    <span className="list-main">
                      <strong>{b.vendor_name || 'Untitled vendor'}</strong>
                      <small>
                        Bill {b.bill_number} · PAN {b.seller_pan_no} · {fmtAd(b.bill_date)}
                      </small>
                    </span>
                    <span className="list-end">
                      <DaysBadge days={b.days_left} />
                      <span className="amount">{formatNpr(b.billed_total_amount)}</span>
                      <span className="list-chevron" aria-hidden>›</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h3>History</h3>
              </div>
              <div className="list-card">
                {history.map((en) => (
                  <div key={en.id} className="list-row">
                    <span className="list-main">
                      <strong>{vendorOf(en.bill_id) ?? `Bill ${en.bill_number || '—'}`}</strong>
                      <small>
                        Bill {en.bill_number || '—'} · {fmtAd(en.bill_date)} · {formatNpr(en.billed_total_amount)}
                      </small>
                    </span>
                    <span className="list-end">
                      {en.prize_coupon_number && (
                        <span className="lot-coupon-inline">Coupon {en.prize_coupon_number}</span>
                      )}
                      <span className={`badge ${en.status === 'submitted' ? 'badge-ok' : 'badge-fail'}`}>
                        {en.status === 'submitted' ? 'Submitted' : 'Failed'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {handoff && <HandoffSheet handoff={handoff} onClose={closeSheet} onDone={onDone} />}
    </>
  )
}
