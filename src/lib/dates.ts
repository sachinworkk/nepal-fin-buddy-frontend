import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convertDate } from '../api/dates'

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

export const BS_RE = /^\d{4}\.\d{1,2}\.\d{1,2}$/
export const AD_RE = /^\d{4}-\d{2}-\d{2}$/

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export type BsConvertInput = { ad: string } | { bs: string } | null

/** Debounced, cached AD<->BS conversion via GET /dates/convert. */
export function useBsConvert(input: BsConvertInput) {
  const kind = input && 'ad' in input ? 'ad' : 'bs'
  const raw = input ? ('ad' in input ? input.ad : input.bs) : ''
  const value = useDebounced(kind === 'bs' ? toAsciiDigits(raw) : raw, 400)
  const wellFormed = kind === 'ad' ? AD_RE.test(value) : BS_RE.test(value)
  const query = useQuery({
    queryKey: ['bsConvert', kind, value],
    queryFn: () => convertDate(kind === 'ad' ? { ad: value } : { bs: value }),
    enabled: !!input && wellFormed,
    staleTime: Infinity,
    retry: false,
  })
  // Hide stale results while the user is still typing a different value.
  const settled = value === (kind === 'bs' ? toAsciiDigits(raw) : raw)
  return {
    data: settled && wellFormed ? query.data : undefined,
    error: settled && wellFormed ? query.error : null,
    isFetching: !settled || query.isFetching,
  }
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
