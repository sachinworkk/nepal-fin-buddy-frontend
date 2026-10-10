import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPrizeSummary } from '../api/prize'
import { bsLabelOfAd } from '../lib/bsCalendar'
import { fmtAd, formatNpr } from '../lib/dates'
import { URGENT_DAYS } from '../lib/prizeRules'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Days left to enter bills for this fiscal year's IRD lottery, plus the user's standing.
 * The IRD draw is fortnightly and each draw has a bumper prize and daily prizes.
 * The portal publishes the fiscal-year end (the entry deadline), not the draw date.
 * Silent while loading or on error, like PrizeWinBanner.
 */
export default function BumperDrawCard({ compact = false }: { compact?: boolean }) {
  const q = useQuery({ queryKey: ['prize-summary'], queryFn: getPrizeSummary, staleTime: 60_000, retry: false })
  const s = q.data
  if (!s) return null

  const days = s.days_left
  const urgent = days !== null && days <= URGENT_DAYS
  const bumper = s.latest_bumper
  const daily = s.latest_daily
  const latest = bumper ?? daily
  const eligibleHref = '/ird-lottery#eligible'

  return (
    <div className="dash-card bumper-card">
      <span className="dash-label">IRD lottery · Fortnightly draw</span>
      {days !== null && s.entry_deadline ? (
        <>
          <strong className="dash-big">
            {days === 0 ? 'Last day' : plural(days, 'day', 'days')} {days === 0 ? 'to enter' : 'left'}
            {urgent && <span className="badge badge-warn bumper-badge">Closing soon</span>}
          </strong>
          <span className="dash-muted">
            to enter bills for the current fiscal year ({s.fiscal_year_name}). Entry deadline {fmtAd(s.entry_deadline)}
            {bsLabelOfAd(s.entry_deadline) && ` · ${bsLabelOfAd(s.entry_deadline)}`}
          </span>
          <span className="dash-muted">Every fortnightly draw in {s.fiscal_year_name} has a bumper prize and daily prizes. Only bills dated in this fiscal year count.</span>
        </>
      ) : (
        <strong className="dash-big">Fortnightly draw</strong>
      )}

      <ul className="bumper-stats">
        <li>
          <strong>{s.coupons_this_year}</strong> {s.coupons_this_year === 1 ? 'coupon' : 'coupons'} entered in {s.fiscal_year_name ?? 'this fiscal year'}
          {s.coupons_all_time > s.coupons_this_year && <> · <strong>{s.coupons_all_time}</strong> all time</>}
        </li>
        <li>
          <strong>{s.eligible_this_year}</strong> more {s.eligible_this_year === 1 ? 'bill' : 'bills'} eligible
          {s.eligible_this_year > 0 &&
            (compact ? (
              <> · <Link to={eligibleHref}>Enter now</Link></>
            ) : (
              <> · <a href="#eligible">Enter now</a></>
            ))}
        </li>
        {s.pending_handoffs > 0 && (
          <li>
            <strong>{s.pending_handoffs}</strong> waiting for you to finish on the IRD portal
          </li>
        )}
        {s.bumper_prize_amount_npr && (
          <li>
            Bumper prize: <strong>{formatNpr(s.bumper_prize_amount_npr)}</strong>
          </li>
        )}
      </ul>

      {!compact && latest && (
        <p className="dash-muted bumper-latest">
          Latest fortnightly draw
          {latest.eligible_from && latest.eligible_to &&
            `: bills from ${fmtAd(latest.eligible_from)} to ${fmtAd(latest.eligible_to)}`}
          {latest.published_at && ` · published ${fmtAd(latest.published_at)}`}
          {latest.claim_open ? ` · claim by ${fmtAd(latest.claim_deadline)}` : ' · claim window closed'}
          <br />
          {bumper && <>Bumper prize: <strong>{plural(bumper.winner_count, 'winner', 'winners')}</strong></>}
          {bumper && daily && ' · '}
          {daily && <>Daily prizes: <strong>{plural(daily.winner_count, 'winner', 'winners')}</strong></>}
        </p>
      )}

      {compact && (
        <Link className="btn btn-ghost bumper-link" to="/ird-lottery">
          IRD lottery
        </Link>
      )}
    </div>
  )
}
