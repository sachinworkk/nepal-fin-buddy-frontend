import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listExpenses } from '../api/expenses'
import { getByCategory, getMonthly, getSummary } from '../api/stats'
import MonthlyChart from '../components/MonthlyChart'
import PrizeWinBanner from '../components/PrizeWinBanner'
import { fmtAd, formatNpr } from '../lib/dates'
import { useMe } from '../lib/useMe'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export default function Dashboard() {
  const { data: me } = useMe()
  const firstName = me?.full_name?.trim().split(/\s+/)[0]
  const title = firstName ? `Namaste, ${firstName}` : 'Dashboard'
  const summary = useQuery({ queryKey: ['stats', 'summary'], queryFn: getSummary })
  const monthly = useQuery({ queryKey: ['stats', 'monthly', 6], queryFn: () => getMonthly(6) })
  const current = monthly.data?.[monthly.data.length - 1]
  const cats = useQuery({
    queryKey: ['stats', 'by-category', current?.start, current?.end],
    queryFn: () => getByCategory(current!.start, current!.end),
    enabled: !!current,
  })
  const hasAny = monthly.data?.some((m) => Number(m.total) > 0)
  // Nothing in the 6-month window: look up the newest expense, which may be an older bill.
  const latest = useQuery({
    queryKey: ['expenses', 'latest'],
    queryFn: () => listExpenses({ limit: 1, offset: 0 }),
    enabled: hasAny === false,
  })

  const error = summary.error ?? monthly.error ?? cats.error
  if (error) return <p className="form-error">{errMsg(error)}</p>
  if (!summary.data || !monthly.data) return <p className="page-body">Loading…</p>

  const s = summary.data
  if (!hasAny) {
    if (latest.isLoading) return <p className="page-body">Loading…</p>
    const older = latest.data?.items[0]
    return (
      <>
        <div className="page-header">
          <div>
            <h2 className="page-title">{title}</h2>
            <p className="page-sub">Your spending overview, in Bikram Sambat months.</p>
          </div>
        </div>
        <PrizeWinBanner link />
        <div className="empty-state">
          <span className="empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          </span>
          {older ? (
            <>
              <strong>No spending in the last 6 months</strong>
              <p>
                Your latest expense, {formatNpr(older.amount)}
                {older.merchant ? ` at ${older.merchant}` : ''}, is dated {older.expense_date_bs} BS
                ({fmtAd(older.expense_date_ad)}). The overview only covers recent months, so it
                shows up in your expenses list instead.
              </p>
            </>
          ) : (
            <>
              <strong>No spending recorded yet</strong>
              <p>Snap a bill or add an expense and your monthly overview will show up here.</p>
            </>
          )}
          <div className="empty-actions">
            {older && <Link className="btn btn-ghost" to="/expenses">View expenses</Link>}
            <Link className="btn btn-accent" to="/snap">Snap a bill</Link>
            <Link className="btn btn-ghost" to="/expenses?new=1">Add expense</Link>
          </div>
        </div>
      </>
    )
  }

  const thisM = Number(s.this_month)
  const lastM = Number(s.last_month)
  const diff = thisM - lastM
  const pct = lastM > 0 ? (diff / lastM) * 100 : null
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
  const topCats = cats.data ?? []

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          <p className="page-sub">Your spending overview, in Bikram Sambat months.</p>
        </div>
        <Link className="btn btn-accent" to="/expenses?new=1">Add expense</Link>
      </div>

      <PrizeWinBanner link />

      <div className="dash-kpis">
        <div className="dash-card">
          <span className="dash-label">{s.month_label}</span>
          <strong className="dash-big">{formatNpr(thisM)}</strong>
          <span className="dash-muted">spent this month</span>
        </div>
        <div className="dash-card">
          <span className="dash-label">Compared with last month</span>
          <strong className={`dash-big${diff > 0 ? ' dash-up' : diff < 0 ? ' dash-down' : ''}`}>
            <span aria-hidden="true">{arrow}</span> {formatNpr(Math.abs(diff))}
          </strong>
          <span className="dash-muted">
            {diff === 0 ? 'No change' : diff > 0 ? 'more' : 'less'}
            {pct !== null && diff !== 0 ? ` (${Math.abs(pct).toFixed(0)}%)` : ''} than{' '}
            {formatNpr(lastM)} last month
          </span>
        </div>
      </div>

      <div className="dash-card">
        <h3 className="dash-h">Last 6 months</h3>
        <MonthlyChart months={monthly.data} />
      </div>

      <div className="dash-cols">
        <div className="dash-card">
          <h3 className="dash-h">By category · {s.month_label}</h3>
          {cats.isLoading && <p className="dash-muted">Loading…</p>}
          {cats.data && topCats.length === 0 && <p className="dash-muted">Nothing spent this month yet.</p>}
          <ul className="cat-list">
            {topCats.map((c) => (
              <li key={c.category}>
                <div className="cat-row">
                  <span>{cap(c.category)}</span>
                  <span className="cat-amt">
                    {formatNpr(c.total)} <em>{Math.round(c.share * 100)}% · {c.count}×</em>
                  </span>
                </div>
                <div className="cat-track" aria-hidden="true">
                  <div className="cat-fill" style={{ width: `${Math.max(c.share * 100, 1)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-card">
          <h3 className="dash-h">Top recipients · {s.month_label}</h3>
          {s.top_merchants.length === 0 && <p className="dash-muted">No recipients recorded this month.</p>}
          <ol className="merch-list">
            {s.top_merchants.map((m) => (
              <li key={m.merchant}>
                <span>{m.merchant}</span>
                <strong>{formatNpr(m.total)}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  )
}
