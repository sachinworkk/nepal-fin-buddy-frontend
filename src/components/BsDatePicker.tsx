import { useEffect, useRef, useState } from 'react'
import { toAsciiDigits } from '../lib/dates'
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTHS,
  bsToAd,
  daysInBsMonth,
  firstWeekdayOfBsMonth,
  formatBs,
  parseBs,
  todayBs,
  type Bs,
} from '../lib/bsCalendar'

interface Props {
  value: string
  onChange: (bs: string) => void
  required?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** Controlled BS date field: typed `YYYY.MM.DD` plus a month-grid popover. */
export default function BsDatePicker({ value, onChange, required }: Props) {
  const [open, setOpen] = useState(false)
  const selected = parseBs(value)
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const b = selected ?? todayBs()
    return { y: b.y, m: b.m }
  })
  const wrapRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const today = todayBs()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle() {
    if (!open) {
      const b = selected ?? todayBs()
      setView({ y: b.y, m: b.m })
    }
    setOpen(!open)
  }

  function shiftMonth(delta: number) {
    setView(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta
      const ny = Math.floor(idx / 12)
      if (ny < BS_MIN_YEAR || ny > BS_MAX_YEAR) return { y, m }
      return { y: ny, m: (idx % 12) + 1 }
    })
  }

  function pick(d: number) {
    onChange(formatBs({ y: view.y, m: view.m, d }))
    setOpen(false)
  }

  function onGridKey(e: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const cells = [...(gridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-day]') ?? [])]
    const i = cells.indexOf(document.activeElement as HTMLButtonElement)
    cells[Math.min(cells.length - 1, Math.max(0, i + step))]?.focus()
  }

  const total = daysInBsMonth(view.y, view.m)
  const lead = firstWeekdayOfBsMonth(view.y, view.m)
  const isSel = (d: number) => !!selected && selected.y === view.y && selected.m === view.m && selected.d === d
  const isToday = (d: number) => today.y === view.y && today.m === view.m && today.d === d
  const adDay = (d: number) => {
    const ad = bsToAd({ y: view.y, m: view.m, d } as Bs)
    return ad ? Number(ad.slice(8)) : ''
  }
  const years: number[] = []
  for (let y = BS_MIN_YEAR; y <= BS_MAX_YEAR; y++) years.push(y)

  return (
    <div
      className="bs-picker"
      ref={wrapRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <div className="bs-picker-row">
        <input
          className="input"
          inputMode="numeric"
          placeholder="YYYY.MM.DD"
          required={required}
          value={value}
          onChange={(e) => onChange(toAsciiDigits(e.target.value).replace(/[-/]/g, '.'))}
        />
        <button
          type="button"
          className="bs-picker-btn"
          aria-label="Open BS calendar"
          aria-expanded={open}
          onClick={toggle}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="bs-pop" role="dialog" aria-label="Choose BS date">
          <div className="bs-pop-head">
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>‹</button>
            <select
              aria-label="Month"
              value={view.m}
              onChange={(e) => setView({ ...view, m: Number(e.target.value) })}
            >
              {BS_MONTHS.map((n, i) => (
                <option key={n} value={i + 1}>{n}</option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={view.y}
              onChange={(e) => setView({ ...view, y: Number(e.target.value) })}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>›</button>
          </div>
          <div className="bs-grid" ref={gridRef} onKeyDown={onGridKey}>
            {WEEKDAYS.map((w) => (
              <span key={w} className="bs-wd">{w}</span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: total }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                data-day={d}
                className={`bs-day${isSel(d) ? ' sel' : ''}${isToday(d) ? ' today' : ''}`}
                aria-pressed={isSel(d)}
                onClick={() => pick(d)}
              >
                {d}
                <small>{adDay(d)}</small>
              </button>
            ))}
          </div>
          <div className="bs-pop-foot">
            <button type="button" onClick={() => { onChange(formatBs(today)); setOpen(false) }}>
              Today
            </button>
            <span>small number = AD day</span>
          </div>
        </div>
      )}
    </div>
  )
}
