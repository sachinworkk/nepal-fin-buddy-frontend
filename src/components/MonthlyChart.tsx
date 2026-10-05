import type { MonthTotal } from '../api/stats'
import { formatNpr } from '../lib/dates'

const W = 420
const H = 230
const PAD = { top: 24, right: 4, bottom: 40, left: 40 }

function compact(n: number) {
  if (n >= 1e7) return `${+(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${+(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}k`
  return String(Math.round(n))
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

/** Top corners rounded, bottom square (bars sit on the baseline). */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

const monthName = (label: string) => label.split(' ').slice(1).join(' ')

export default function MonthlyChart({ months }: { months: MonthTotal[] }) {
  const values = months.map((m) => Number(m.total))
  const max = niceMax(Math.max(...values, 0))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / months.length
  const bw = Math.min(48, slot * 0.6)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const last = months.length - 1

  return (
    <>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Spending per month, last ${months.length} months`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              className={t === 0 ? 'chart-base' : 'chart-grid'}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="chart-axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dy="0.32em">
              {compact(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const v = values[i]
          const h = (v / max) * innerH
          const cx = PAD.left + slot * i + slot / 2
          const showYear = i === 0 || months[i - 1].bs_year !== m.bs_year
          const labelled = i === last || v === Math.max(...values)
          return (
            <g key={m.label} className="chart-bar" tabIndex={0}>
              <title>{`${m.label}: ${formatNpr(v)}`}</title>
              {/* wider invisible hit target */}
              <rect x={cx - slot / 2} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <path
                  className={i === last ? 'bar-current' : 'bar-past'}
                  d={barPath(cx - bw / 2, y(v), bw, h, 4)}
                />
              )}
              {labelled && v > 0 && (
                <text className="chart-value" x={cx} y={y(v) - 6} textAnchor="middle">
                  {compact(v)}
                </text>
              )}
              <text className="chart-axis" x={cx} y={H - PAD.bottom + 16} textAnchor="middle">
                {monthName(m.label)}
              </text>
              {showYear && (
                <text className="chart-axis chart-year" x={cx} y={H - PAD.bottom + 31} textAnchor="middle">
                  {m.bs_year}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <details className="chart-table">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th>Month (BS)</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.label}>
                <td>{m.label}</td>
                <td>{formatNpr(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
