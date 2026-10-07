const KEY = 'prize-profile'

export interface PrizeProfile {
  name: string
  address: string
  mobile_number: string
}

export function loadPrizeProfile(): PrizeProfile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PrizeProfile> | null
    return { name: p?.name ?? '', address: p?.address ?? '', mobile_number: p?.mobile_number ?? '' }
  } catch {
    return { name: '', address: '', mobile_number: '' }
  }
}

export function savePrizeProfile(p: PrizeProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable (private mode) — prefill is a convenience only */
  }
}
