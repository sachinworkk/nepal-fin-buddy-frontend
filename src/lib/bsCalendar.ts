import NepaliDate, { dateConfigMap } from 'nepali-date-converter'
import { toAsciiDigits } from './dates'

export interface Bs {
  y: number
  m: number // 1-12
  d: number
}

export const BS_MONTHS = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
] as const
export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत',
] as const

const years = Object.keys(dateConfigMap).map(Number)
export const BS_MIN_YEAR = Math.min(...years)
export const BS_MAX_YEAR = Math.max(...years)

const pad = (n: number) => String(n).padStart(2, '0')

export function daysInBsMonth(y: number, m: number): number {
  const cfg = dateConfigMap[String(y)]
  return cfg ? cfg[BS_MONTHS[m - 1]] : 0
}

export function isValidBs({ y, m, d }: Bs): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInBsMonth(y, m)
}

export function formatBs({ y, m, d }: Bs): string {
  return `${String(y).padStart(4, '0')}.${pad(m)}.${pad(d)}`
}

/** Parse 'YYYY.MM.DD' (also - or /, Devanagari digits). Null when malformed or not a real BS date. */
export function parseBs(text: string): Bs | null {
  const m = /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})$/.exec(toAsciiDigits(text).trim())
  if (!m) return null
  const bs = { y: +m[1], m: +m[2], d: +m[3] }
  return isValidBs(bs) ? bs : null
}

const parseIso = (iso: string): [number, number, number] | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? [+m[1], +m[2], +m[3]] : null
}

export function adToBs(iso: string): Bs | null {
  const p = parseIso(iso)
  if (!p) return null
  try {
    const b = NepaliDate.fromAD(new Date(p[0], p[1] - 1, p[2])).getBS()
    return { y: b.year, m: b.month + 1, d: b.date }
  } catch {
    return null
  }
}

export function bsToAd(bs: Bs): string | null {
  if (!isValidBs(bs)) return null
  try {
    const a = new NepaliDate(bs.y, bs.m - 1, bs.d).getAD()
    return `${String(a.year).padStart(4, '0')}-${pad(a.month + 1)}-${pad(a.date)}`
  } catch {
    return null
  }
}

/** Weekday (0=Sunday) of the 1st of a BS month. */
export function firstWeekdayOfBsMonth(y: number, m: number): number {
  const ad = bsToAd({ y, m, d: 1 })
  const p = ad && parseIso(ad)
  return p ? new Date(p[0], p[1] - 1, p[2]).getDay() : 0
}

/** Today in the browser's local timezone (toISOString would be UTC and can be yesterday in Nepal). */
export function todayIso(): string {
  const n = new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
}

export const todayBs = (): Bs => adToBs(todayIso()) ?? { y: 2083, m: 1, d: 1 }

export const fmtBsLabel = ({ y, m, d }: Bs) => `${d} ${BS_MONTHS[m - 1]} ${y}`

/** "15 Ashwin 2083 BS" for an AD ISO date, or '' when out of range. */
export function bsLabelOfAd(iso: string | null | undefined): string {
  const b = iso ? adToBs(iso) : null
  return b ? `${fmtBsLabel(b)} BS` : ''
}

/** Resolve a DateInput value ({ad} or {bs}) to an AD ISO date, locally. */
export function resolveAd(v: { ad?: string; bs?: string }): string | undefined {
  if (v.ad) return v.ad
  const b = v.bs ? parseBs(v.bs) : null
  return (b && bsToAd(b)) || undefined
}
