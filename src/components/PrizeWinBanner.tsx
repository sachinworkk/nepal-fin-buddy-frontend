import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listMyPrizeWins } from '../api/prize'

const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/** Shown when one of the user's submitted IRD coupons appears in a published draw. Silent otherwise. */
export default function PrizeWinBanner({ link = false }: { link?: boolean }) {
  const wins = useQuery({ queryKey: ['prize-my-wins'], queryFn: listMyPrizeWins, staleTime: 60_000, retry: false })
  const won = wins.data ?? []
  if (won.length === 0) return null

  return (
    <div className="notice" role="status" style={{ marginBottom: 'var(--sp-6)' }}>
      <span>
        <strong>🎉 {won.length === 1 ? 'One of your coupons won!' : `${won.length} of your coupons won!`}</strong>
        {won.map((w) => (
          <span key={`${w.draw_id}-${w.prize_coupon_number}`} style={{ display: 'block' }}>
            Coupon {w.prize_coupon_number} · {w.category_title_en} (rank {w.winner_rank}) · Bill {w.bill_number}
            {w.claim_open ? ` · claim by ${fmtDay(w.claim_deadline)}` : ' · claim window closed'}
          </span>
        ))}
      </span>
      {link && (
        <Link className="btn" to="/ird-lottery">
          View
        </Link>
      )}
    </div>
  )
}
