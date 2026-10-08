import { useEffect, useState } from 'react'

export function formatNpr(amount: string | number) {
  const n = Number(amount)
  return Number.isFinite(n)
    ? `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `Rs. ${amount}`
}

const DEVANAGARI = '०१२३४५६७८९'

/** Replace Devanagari digits with ASCII ones. */
export function toAsciiDigits(text: string) {
  return text.replace(/[०-९]/g, (c) => String(DEVANAGARI.indexOf(c)))
}

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export type DateMode = 'ad' | 'bs'
const MODE_KEY = 'dateInputMode'

export function loadDateMode(): DateMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'bs' ? 'bs' : 'ad'
  } catch {
    return 'ad'
  }
}

export function saveDateMode(m: DateMode) {
  try {
    localStorage.setItem(MODE_KEY, m)
  } catch {
    /* storage unavailable */
  }
}

export function fmtAd(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
