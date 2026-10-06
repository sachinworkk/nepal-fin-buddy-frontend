import { ApiError, get, post } from './client'

export interface PrizeConfig {
  turnstile_sitekey: string
  payment_methods: string[]
}

export type PrizeEnrollmentStatus = 'submitted' | 'failed'

export interface PrizeEnrollmentOut {
  id: string
  bill_id: string | null
  seller_pan_no: string
  bill_number: string
  bill_date: string
  billed_total_amount: string
  payment_method: string
  name: string
  address: string
  mobile_number: string
  company_website: string | null
  status: PrizeEnrollmentStatus
  prize_coupon_number: string | null
  verification_id: string | null
  duplicate: boolean
  last_error: string | null
  created_at: string
}

/** Bill details are prefilled server-side from the confirmed bill `bill_id`. */
export interface PrizeEnrollmentIn {
  bill_id: string
  payment_method: string
  name: string
  address: string
  mobile_number: string
  company_website: string | null
  turnstile_token: string
  form_started_at: number
}

export const getPrizeConfig = () => get<PrizeConfig>('/prize/config')

export const createPrizeEnrollment = (body: PrizeEnrollmentIn) =>
  post<PrizeEnrollmentOut>('/prize/enrollments', body)

export const listPrizeEnrollments = () => get<PrizeEnrollmentOut[]>('/prize/enrollments')

export const getPrizeEnrollment = (id: string) => get<PrizeEnrollmentOut>(`/prize/enrollments/${id}`)

export interface PrizeFieldErrors {
  fields: Record<string, string>
  message: string
}

/** 422 detail is either our per-field ladder {field: message} or FastAPI's [{loc, msg}] array. */
export function parsePrizeFieldErrors(err: unknown): PrizeFieldErrors {
  const message = err instanceof Error ? err.message : String(err)
  const fields: Record<string, string> = {}
  const detail = err instanceof ApiError ? (err.body as { detail?: unknown } | null)?.detail : null
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    for (const [field, v] of Object.entries(detail as Record<string, unknown>)) {
      fields[field] = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v)
    }
  } else if (Array.isArray(detail)) {
    for (const item of detail as { loc?: (string | number)[]; msg?: string }[]) {
      const field = (item.loc ?? []).filter((p) => p !== 'body' && p !== 'query').join('.')
      if (field) fields[field] = item.msg ?? 'Invalid value'
    }
  }
  return { fields, message }
}
