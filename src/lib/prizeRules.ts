export const MOBILE_RE = /^9[678]\d{8}$/

export function validateName(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Name is required.'
  if (t.length < 2 || t.length > 120) return 'Name must be 2–120 characters.'
  return null
}

export function validateAddress(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Address is required.'
  if (t.length > 200) return 'Address must be 200 characters or fewer.'
  return null
}

export function validateMobile(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Mobile number is required.'
  if (!MOBILE_RE.test(t)) return 'Enter a 10-digit Nepali mobile number starting with 96, 97 or 98.'
  return null
}
