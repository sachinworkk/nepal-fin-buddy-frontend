import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  return <span className={`badge ${days <= URGENT_DAYS ? 'badge-fail' : 'badge-muted'}`}>{text}</span>
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
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <ol className="sheet-steps">
          <li>Open the IRD portal and paste each value below into the matching field.</li>
          <li>Complete the security check on the portal and submit.</li>
          <li>Come back here and enter your coupon number (optional).</li>
        </ol>

        <button
          type="button"
          className="btn btn-accent sheet-open"
          onClick={() => window.open(portalUrlWithPrefill(handoff), '_blank', 'noopener')}
        >
          Open IRD portal
        </button>

        <div className="hand-rows">
          {rows.map((r) => (
            <div key={r.key} className="hand-row">
              <span className="hand-label">{r.label}</span>
              <strong className="hand-value">{r.value}</strong>
              <button
                type="button"
                className="btn btn-ghost hand-copy"
                aria-label={`Copy ${r.label}`}
                onClick={() => void copy(r.key, r.value)}
              >
                {copied === r.key ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
        <div className="settings-actions">
          <button
            type="button"
            className="btn"
            onClick={() => void copy('all', rows.map((r) => `${r.label}: ${r.value}`).join('\n'))}
          >
            {copied === 'all' ? 'Copied' : 'Copy all'}
          </button>
        </div>
        <p className="lot-copy-status" role="status" aria-live="polite">
          {copied ? 'Copied to clipboard' : ''}
        </p>
        {copyFailed && (
          <p className="form-error">Couldn't copy automatically — press and hold a value to copy it.</p>
        )}

        <label className="snap-field">
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
        <div className="snap-actions">
          <button
            type="button"
            className="btn btn-accent"
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
    <form className="snap-card" onSubmit={onSubmit} noValidate>
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
      <p className="settings-muted">We'll remember these on this device for next time.</p>
      <div className="snap-grid">
        {(
          [
            ['name', 'Full name', 'name', undefined],
            ['address', 'Address', 'street-address', undefined],
            ['mobile_number', 'Mobile number', 'tel', '98XXXXXXXX'],
          ] as const
        ).map(([k, label, ac, ph]) => (
          <label key={k} className="snap-field">
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
            {errFor(k) && <small className="lot-field-err">{errFor(k)}</small>}
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
      {banner && <p className="form-error lot-banner-err">{banner}</p>}

      <div className="snap-actions">
        <button type="submit" className="btn btn-accent" disabled={mut.isPending}>
          {mut.isPending ? 'Preparing…' : 'Continue to IRD portal'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={mut.isPending} onClick={onBack}>
          Back
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

  return (
    <>
      <div className="expenses-topbar">
        <div>
          <h2 className="page-title">Prize</h2>
          <p className="page-sub">
            Enter confirmed cash bills in the IRD taxpayer prize lottery. We prefill the details; you
            submit on the IRD portal.
          </p>
        </div>
      </div>

      {notice && <p className="lot-banner-info">{notice}</p>}

      {selected ? (
        <BillForm bill={selected} onBack={() => setSelected(null)} onHandoff={setHandoff} />
      ) : (
        <>
          {waiting.length > 0 && (
            <section className="lot-section">
              <h3 className="snap-items-head">Waiting for you</h3>
              {continueErr && <p className="form-error">{continueErr}</p>}
              <div className="lot-card">
                {waiting.map((en) => (
                  <div key={en.id} className="hand-wait">
                    <span className="lot-bill-main">
                      <strong>{en.bill_number || '—'}</strong>
                      <small>
                        {fmtAd(en.bill_date)} · {formatNpr(en.billed_total_amount)}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="btn btn-accent"
                      disabled={resume.isPending || !en.bill_id}
                      onClick={() => resume.mutate(en)}
                    >
                      {resume.isPending && resume.variables?.id === en.id ? 'Opening…' : 'Continue'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="lot-section">
            <h3 className="snap-items-head">Eligible bills</h3>
            {eligible.isError && (
              <p className="form-error">
                {errMsg(eligible.error)}{' '}
                <button type="button" className="btn" onClick={() => void eligible.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {eligible.isLoading && <p className="page-body">Loading your bills…</p>}
            {!eligible.isLoading && !eligible.isError && bills.length === 0 && (
              <div className="expenses-empty">
                <strong>No eligible bills</strong>
                <span>
                  Confirmed cash bills with a valid PAN and bill number appear here.
                </span>
                <span className="dash-empty-links">
                  <Link to="/snap" className="btn btn-accent">
                    Snap a bill
                  </Link>
                </span>
              </div>
            )}
            {bills.length > 0 && (
              <div className="lot-card">
                {bills.map((b) => (
                  <button
                    key={b.bill_id}
                    type="button"
                    className="hand-bill"
                    onClick={() => {
                      setNotice(null)
                      setSelected(b)
                    }}
                  >
                    <span className="lot-bill-main">
                      <strong>{b.vendor_name || 'Untitled vendor'}</strong>
                      <small>
                        PAN {b.seller_pan_no} · Bill {b.bill_number} · {fmtAd(b.bill_date)}
                      </small>
                    </span>
                    <DaysBadge days={b.days_left} />
                    <span className="lot-amt">{formatNpr(b.billed_total_amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className="lot-section">
              <h3 className="snap-items-head">History</h3>
              <div className="lot-card">
                {history.map((en) => (
                  <div key={en.id} className="hand-wait">
                    <span className="lot-bill-main">
                      <strong>{en.bill_number || '—'}</strong>
                      <small>
                        {fmtAd(en.bill_date)} · {formatNpr(en.billed_total_amount)}
                      </small>
                    </span>
                    <span className="lot-coupon-inline">
                      {en.prize_coupon_number ?? (en.status === 'submitted' ? 'No coupon saved' : '')}
                    </span>
                    <span className={`badge ${en.status === 'submitted' ? 'badge-ok' : 'badge-fail'}`}>
                      {en.status === 'submitted' ? 'Submitted' : 'Failed'}
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
