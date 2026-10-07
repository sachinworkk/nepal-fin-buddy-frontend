import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBills } from '../api/bills'
import { ApiError } from '../api/client'
import {
  createPrizeEnrollment,
  getPrizeConfig,
  getPrizeEnrollment,
  listPrizeEnrollments,
  parsePrizeFieldErrors,
  type PrizeEnrollmentOut,
} from '../api/prize'
import Turnstile from '../components/Turnstile'
import PrizeHandoff from './PrizeHandoff'
import { fmtAd, formatNpr } from '../lib/dates'
import { validateAddress, validateMobile, validateName } from '../lib/prizeRules'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RETRY_COOLDOWN_S = 8
const ALL_FIELDS = ['name', 'address', 'mobile_number', 'company_website']

const EMPTY_CUSTOMER = { name: '', address: '', mobile_number: '', company_website: '' }

type View = 'home' | 'new'
type Stage = 'source' | 'form' | 'done'

interface Banner {
  kind: 'error' | 'info'
  text: string
}

function BannerBox({ banner }: { banner: Banner }) {
  if (banner.kind === 'info') return <p className="lot-banner-info">{banner.text}</p>
  return <p className="form-error lot-banner-err">{banner.text}</p>
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="snap-field">
      <span>{label}</span>
      {children}
      {error && <small className="lot-field-err">{error}</small>}
    </label>
  )
}

function ResultCard({
  result,
  onAnother,
  onHome,
}: {
  result: PrizeEnrollmentOut
  onAnother: () => void
  onHome: () => void
}) {
  if (result.status !== 'submitted') {
    return (
      <div className="lot-coupon lot-coupon-fail">
        <h3>The IRD portal rejected this submission</h3>
        {result.last_error && <p className="form-error">{result.last_error}</p>}
        <p className="settings-muted">
          The attempt was recorded as failed. Fix the problem and submit again.
        </p>
        <div className="settings-actions">
          <button type="button" className="btn btn-accent" onClick={onAnother}>
            Try another bill
          </button>
          <button type="button" className="btn" onClick={onHome}>
            My entries
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="lot-coupon">
      <h3>{result.duplicate ? 'Already in the draw ✓' : 'You are in the draw ✓'}</h3>
      {result.duplicate && (
        <p className="settings-muted">This bill was already entered — here is its coupon.</p>
      )}
      <p className="lot-coupon-label">Prize coupon number</p>
      <p className="lot-coupon-code">{result.prize_coupon_number ?? '—'}</p>
      {result.verification_id && (
        <p className="settings-muted">Verification ID: {result.verification_id}</p>
      )}
      <p className="lot-coupon-meta">
        {result.bill_number || '—'} · {fmtAd(result.bill_date)} ·{' '}
        {formatNpr(result.billed_total_amount)}
      </p>
      <p className="settings-muted">
        Keep this coupon safe — you need it to claim a prize if IRD announces this number.
      </p>
      <div className="settings-actions">
        <button type="button" className="btn btn-accent" onClick={onAnother}>
          Submit another bill
        </button>
        <button type="button" className="btn" onClick={onHome}>
          My entries
        </button>
      </div>
    </div>
  )
}

function DirectLottery() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('home')
  const [stage, setStage] = useState<Stage>('source')
  const [billId, setBillId] = useState<string | null>(null)
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER)
  const [token, setToken] = useState<string | null>(null)
  const [tsReset, setTsReset] = useState(0)
  const [formOpenedAt, setFormOpenedAt] = useState<number | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [serverErrs, setServerErrs] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [result, setResult] = useState<PrizeEnrollmentOut | null>(null)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [dupKey, setDupKey] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const config = useQuery({
    queryKey: ['prize-config'],
    queryFn: getPrizeConfig,
    staleTime: Infinity,
    enabled: view === 'new',
  })
  const sitekey = config.data?.turnstile_sitekey ?? ''
  const paymentMethods = config.data?.payment_methods?.length
    ? config.data.payment_methods
    : ['Cash']
  const payment = paymentMethods[0]

  const bills = useQuery({
    queryKey: ['bills'],
    queryFn: listBills,
    enabled: view === 'new',
  })
  const confirmedBills = useMemo(
    () => (bills.data ?? []).filter((b) => b.status === 'confirmed'),
    [bills.data],
  )
  const bill = billId ? ((bills.data ?? []).find((b) => b.id === billId) ?? null) : null

  const entries = useQuery({
    queryKey: ['prize-enrollments'],
    queryFn: () => listPrizeEnrollments(),
    enabled: view === 'home',
    placeholderData: (prev) => prev,
  })

  const detail = useQuery({
    queryKey: ['prize-enrollment', expandedId],
    queryFn: () => getPrizeEnrollment(expandedId!),
    enabled: !!expandedId && view === 'home',
    staleTime: 30_000,
  })

  const custErrs = useMemo(() => {
    const errs: Record<string, string> = {}
    const name = validateName(customer.name)
    const address = validateAddress(customer.address)
    const mobile = validateMobile(customer.mobile_number)
    if (name) errs.name = name
    if (address) errs.address = address
    if (mobile) errs.mobile_number = mobile
    return errs
  }, [customer])

  const errFor = (k: string): string | null => serverErrs[k] ?? custErrs[k] ?? null
  const inlineErrKeys = ['name', 'address', 'mobile_number']
  const otherServerErrs = Object.keys(serverErrs).filter((k) => !inlineErrKeys.includes(k))

  const cooldownActive = cooldownLeft > 0

  useEffect(() => {
    if (!cooldownActive) return
    const t = setInterval(() => {
      setCooldownLeft((s) => {
        const next = s - 1
        return next > 0 ? next : 0
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownActive])

  const autoExpandId = useMemo(() => {
    if (view !== 'home' || !dupKey) return null
    const items = entries.data
    if (!items?.length) return null
    const match = items.find((x) => x.bill_id === dupKey) ?? items[0]
    return match.id
  }, [view, dupKey, entries.data])
  const activeExpanded = expandedId ?? autoExpandId

  function clearToken() {
    if (token !== null) {
      setToken(null)
      setTsReset((n) => n + 1)
    }
  }

  function touch(k: string) {
    setTouched((t) => (t.has(k) ? t : new Set(t).add(k)))
    setServerErrs((s) => {
      if (!(k in s)) return s
      const next = { ...s }
      delete next[k]
      return next
    })
    clearToken()
  }

  function editCustomer(k: keyof typeof EMPTY_CUSTOMER, v: string) {
    setCustomer((c) => ({ ...c, [k]: v }))
    touch(k)
  }

  function resetFlow() {
    setStage('source')
    setBillId(null)
    setCustomer(EMPTY_CUSTOMER)
    setToken(null)
    setFormOpenedAt(null)
    setBanner(null)
    setServerErrs({})
    setTouched(new Set())
    setResult(null)
    setCooldownLeft(0)
    setDupKey(null)
    setExpandedId(null)
    setTsReset((n) => n + 1)
  }

  function openForm() {
    setFormOpenedAt(Date.now())
    setStage('form')
    setBanner(null)
    setServerErrs({})
    setToken(null)
    setTouched(new Set())
    setTsReset((n) => n + 1)
  }

  function applyBill() {
    if (!billId) return
    openForm()
  }

  function backToSource() {
    setStage('source')
    setBanner(null)
    setServerErrs({})
    setFormOpenedAt(null)
    clearToken()
  }

  function toggleRow(id: string) {
    setDupKey(null)
    setExpandedId((cur) => (cur === id ? null : id))
  }

  function startNew() {
    resetFlow()
    setView('new')
    window.scrollTo({ top: 0 })
  }

  function goHome() {
    resetFlow()
    setView('home')
    window.scrollTo({ top: 0 })
  }

  function handleSubmitError(e: unknown) {
    setToken(null)
    setTsReset((n) => n + 1)
    if (!(e instanceof ApiError)) {
      setBanner({
        kind: 'error',
        text: 'Something went wrong — check your connection and try again.',
      })
      return
    }
    if (e.status === 422) {
      const { fields, message } = parsePrizeFieldErrors(e)
      const keys = Object.keys(fields)
      if (keys.length > 0) {
        setServerErrs(fields)
        setTouched((t) => new Set([...t, ...keys]))
        setBanner(null)
      } else {
        setBanner({ kind: 'error', text: message })
      }
      return
    }
    if (e.status === 409) {
      setDupKey(billId)
      setExpandedId(null)
      resetFlow()
      setView('home')
      void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
      void qc.invalidateQueries({ queryKey: ['bills'] })
      setBanner({ kind: 'info', text: 'This bill was already entered in the lottery — here it is.' })
      window.scrollTo({ top: 0 })
      return
    }
    if (e.status === 429) {
      setBanner({ kind: 'error', text: e.message })
      setCooldownLeft(RETRY_COOLDOWN_S)
      return
    }
    if (e.status === 400) {
      setBanner({ kind: 'error', text: e.message })
      return
    }
    setBanner({
      kind: 'error',
      text:
        e.status >= 500
          ? 'The IRD lottery service is unreachable right now — please try again shortly.'
          : e.message,
    })
  }

  const submitMut = useMutation({
    mutationFn: () => {
      if (formOpenedAt === null || !token || !billId) {
        return Promise.reject(new Error('Complete the security check before submitting.'))
      }
      const started = Date.now() - formOpenedAt > FORM_MAX_AGE_MS ? Date.now() : formOpenedAt
      return createPrizeEnrollment({
        bill_id: billId,
        payment_method: payment,
        name: customer.name.trim(),
        address: customer.address.trim(),
        mobile_number: customer.mobile_number.trim(),
        company_website: customer.company_website.trim() || null,
        turnstile_token: token,
        form_started_at: started,
      })
    },
    onSuccess: (en) => {
      qc.setQueryData(['prize-enrollment', en.id], en)
      void qc.invalidateQueries({ queryKey: ['prize-enrollments'] })
      void qc.invalidateQueries({ queryKey: ['bills'] })
      setResult(en)
      setStage('done')
      window.scrollTo({ top: 0 })
    },
    onError: handleSubmitError,
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitMut.isPending || cooldownLeft > 0) return
    setTouched(new Set(ALL_FIELDS))
    if (Object.keys(custErrs).length > 0) {
      setBanner({ kind: 'error', text: 'Fix the highlighted fields and try again.' })
      return
    }
    if (!token) {
      setBanner({ kind: 'error', text: 'Complete the security check before submitting.' })
      return
    }
    setBanner(null)
    submitMut.mutate()
  }

  const submitBlocked = submitMut.isPending || !token || cooldownLeft > 0

  if (view === 'home') {
    const items = entries.data ?? []
    return (
      <>
        <div className="expenses-topbar">
          <div>
            <h2 className="page-title">IRD lottery</h2>
            <p className="page-sub">
              Enter cash bills into the IRD taxpayer prize lottery — each accepted bill earns a
              coupon for the draw.
            </p>
          </div>
          <button type="button" className="btn btn-accent" onClick={startNew}>
            Submit a bill
          </button>
        </div>

        {banner && <BannerBox banner={banner} />}

        {entries.isError && <p className="form-error">{errMsg(entries.error)}</p>}
        {entries.isLoading && <p className="page-body">Loading your entries…</p>}

        {!entries.isLoading && !entries.isError && items.length === 0 && (
          <div className="expenses-empty">
            <strong>No lottery entries yet</strong>
            <span>
              Submit a cash bill — bills you snapped and confirmed can be entered in one click.
            </span>
            <span className="dash-empty-links">
              <button type="button" className="btn btn-accent" onClick={startNew}>
                Submit your first bill
              </button>
            </span>
          </div>
        )}

        {items.length > 0 && (
          <div className="lot-card">
            <div className="lot-rows-head">
              <span>Bill</span>
              <span>Date</span>
              <span className="lot-amt">Amount</span>
              <span>Coupon</span>
              <span>Status</span>
            </div>
            {items.map((en) => (
              <div key={en.id} className="lot-row-wrap">
                <button
                  type="button"
                  className={`lot-row${activeExpanded === en.id ? ' open' : ''}`}
                  aria-expanded={activeExpanded === en.id}
                  onClick={() => toggleRow(en.id)}
                >
                  <span className="lot-billno">
                    <strong>{en.bill_number || '—'}</strong>
                    {en.duplicate && <em className="lot-chip">duplicate</em>}
                  </span>
                  <span className="lot-date">{fmtAd(en.bill_date)}</span>
                  <span className="lot-amt">{formatNpr(en.billed_total_amount)}</span>
                  <span className="lot-coupon">{en.prize_coupon_number ?? '—'}</span>
                  <span className="lot-status">
                    <span
                      className={`badge ${en.status === 'submitted' ? 'badge-ok' : 'badge-fail'}`}
                    >
                      {en.status === 'submitted' ? 'In draw' : 'Failed'}
                    </span>
                  </span>
                </button>
                {activeExpanded === en.id && (
                  <div className="lot-detail">
                    {detail.isLoading && <p className="settings-muted">Loading details…</p>}
                    {detail.isError && <p className="form-error">{errMsg(detail.error)}</p>}
                    {detail.data && detail.data.id === en.id && (
                      <dl>
                        <div>
                          <dt>Submitted</dt>
                          <dd>{new Date(detail.data.created_at).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Seller PAN</dt>
                          <dd>{detail.data.seller_pan_no}</dd>
                        </div>
                        <div>
                          <dt>Payment</dt>
                          <dd>{detail.data.payment_method}</dd>
                        </div>
                        <div>
                          <dt>Name</dt>
                          <dd>{detail.data.name}</dd>
                        </div>
                        <div>
                          <dt>Address</dt>
                          <dd>{detail.data.address}</dd>
                        </div>
                        <div>
                          <dt>Mobile</dt>
                          <dd>{detail.data.mobile_number}</dd>
                        </div>
                        {detail.data.company_website && (
                          <div>
                            <dt>Website</dt>
                            <dd>{detail.data.company_website}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Verification ID</dt>
                          <dd>{detail.data.verification_id ?? '—'}</dd>
                        </div>
                        {detail.data.last_error && (
                          <div className="lot-detail-err">
                            <dt>Last error</dt>
                            <dd>{detail.data.last_error}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="expenses-topbar">
        <div>
          <h2 className="page-title">IRD lottery</h2>
          <p className="page-sub">
            Enter a cash bill into the IRD taxpayer prize lottery (prize.ird.gov.np).
          </p>
        </div>
        <button type="button" className="btn" onClick={goHome}>
          My entries
        </button>
      </div>

      {stage === 'done' && result && (
        <ResultCard result={result} onAnother={startNew} onHome={goHome} />
      )}

      {stage === 'source' && (
        <div className="snap-card lot-billpick-card">
          <h3 className="snap-items-head">Confirmed bills</h3>
          {bills.isError && <p className="form-error">{errMsg(bills.error)}</p>}
          {bills.isLoading && <p className="page-body">Loading your bills…</p>}
          {!bills.isLoading && !bills.isError && confirmedBills.length === 0 && (
            <p className="settings-empty">
              No confirmed bills yet. <Link to="/snap">Snap a bill</Link> first.
            </p>
          )}
          {confirmedBills.length > 0 && (
            <div className="lot-billpick">
              {confirmedBills.map((b) => (
                <label key={b.id} className={`lot-bill-row${billId === b.id ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="lot-bill"
                    checked={billId === b.id}
                    onChange={() => setBillId(b.id)}
                  />
                  <span className="lot-bill-main">
                    <strong>{b.vendor_name || 'Untitled vendor'}</strong>
                    <small>
                      {[b.bill_number, fmtAd(b.bill_date_ad)]
                        .filter((x) => x && x !== '—')
                        .join(' · ')}
                    </small>
                  </span>
                  {b.prize_enrolled && <span className="badge badge-ok">Prize</span>}
                  <span className="lot-amt">
                    {b.total_amount ? formatNpr(b.total_amount) : '—'}
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="snap-actions">
            <button
              type="button"
              className="btn btn-accent"
              disabled={!billId}
              onClick={applyBill}
            >
              Apply to IRD cash lottery
            </button>
            <button type="button" className="btn" onClick={goHome}>
              Back
            </button>
          </div>
        </div>
      )}

      {stage === 'form' && (
        <form className="snap-card" onSubmit={onSubmit}>
          <h3 className="snap-items-head">Bill details</h3>
          <p className="settings-muted">Prefilled from your confirmed bill — sent to IRD as-is.</p>
          <div className="lot-bill-summary">
            <div>
              <span>Bill number</span>
              <strong>{bill?.bill_number || '—'}</strong>
            </div>
            <div>
              <span>Seller PAN</span>
              <strong>{bill?.vendor_pan || '—'}</strong>
            </div>
            <div>
              <span>Date (AD)</span>
              <strong>{bill?.bill_date_ad || '—'}</strong>
            </div>
            <div>
              <span>Total amount</span>
              <strong>{bill?.total_amount ? formatNpr(bill.total_amount) : '—'}</strong>
            </div>
          </div>

          <h3 className="snap-items-head">Your details</h3>
          <p className="settings-muted">
            Required for every lottery entry — bills don't carry customer info.
          </p>
          <div className="snap-grid">
            <FormField label="Full name" error={touched.has('name') ? errFor('name') : null}>
              <input
                className="input"
                autoComplete="name"
                value={customer.name}
                onChange={(e) => editCustomer('name', e.target.value)}
              />
            </FormField>
            <FormField label="Address" error={touched.has('address') ? errFor('address') : null}>
              <input
                className="input"
                autoComplete="street-address"
                value={customer.address}
                onChange={(e) => editCustomer('address', e.target.value)}
              />
            </FormField>
            <FormField
              label="Mobile number"
              error={touched.has('mobile_number') ? errFor('mobile_number') : null}
            >
              <input
                className="input"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="98XXXXXXXX"
                value={customer.mobile_number}
                onChange={(e) => editCustomer('mobile_number', e.target.value)}
              />
            </FormField>
            <FormField label="Company website (optional)">
              <input
                className="input"
                type="url"
                autoComplete="url"
                value={customer.company_website}
                onChange={(e) => editCustomer('company_website', e.target.value)}
              />
            </FormField>
            <FormField label="Payment method">
              <select className="input" value={payment} disabled={paymentMethods.length === 1}>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {banner && <BannerBox banner={banner} />}

          {otherServerErrs.length > 0 && (
            <ul className="form-error lot-err-list">
              {otherServerErrs.map((k) => (
                <li key={k}>{serverErrs[k]}</li>
              ))}
            </ul>
          )}

          <h3 className="snap-items-head">Security check</h3>
          {config.isError ? (
            <p className="form-error">{errMsg(config.error)}</p>
          ) : !sitekey ? (
            <p className="page-body">Loading…</p>
          ) : (
            <Turnstile sitekey={sitekey} onToken={setToken} resetSignal={tsReset} />
          )}
          {config.isError && (
            <div className="settings-actions">
              <button type="button" className="btn" onClick={() => void config.refetch()}>
                Retry
              </button>
            </div>
          )}

          <div className="snap-actions">
            <button type="submit" className="btn btn-accent" disabled={submitBlocked}>
              {submitMut.isPending
                ? 'Submitting…'
                : cooldownLeft > 0
                  ? `Wait ${cooldownLeft}s…`
                  : 'Submit to IRD lottery'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={submitMut.isPending}
              onClick={backToSource}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default function Lottery() {
  const config = useQuery({ queryKey: ['prize-config'], queryFn: getPrizeConfig, staleTime: Infinity })
  if (config.isError) {
    return (
      <>
        <p className="form-error">{errMsg(config.error)}</p>
        <button type="button" className="btn" onClick={() => void config.refetch()}>
          Retry
        </button>
      </>
    )
  }
  if (!config.data) return <p className="page-body">Loading…</p>
  return config.data.submission_mode === 'handoff' ? <PrizeHandoff /> : <DirectLottery />
}
