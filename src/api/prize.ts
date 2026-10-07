import { ApiError, get, patch, post } from './client'

export type PrizeEnrollmentStatus = 'handed_off' | 'submitted' | 'failed'

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

export interface PrizeEligibleBill {
  bill_id: string
  vendor_name: string | null
  seller_pan_no: string
  bill_number: string
  bill_date: string
  billed_total_amount: string
  fiscal_year_code: string | null
  fiscal_year_status: string | null
  days_left: number | null
}

export interface PrizeHandoffIn {
  bill_id: string
  name: string
  address: string
  mobile_number: string
  company_website?: string | null
}

export interface PrizeHandoffFields {
  bill_number: string
  seller_pan_no: string
  bill_date: string
  billed_total_amount: string
  payment_method: string
  name: string
  address: string
  mobile_number: string
  company_website: string | null
}

export interface PrizeHandoffOut {
  enrollment_id: string
  fields: PrizeHandoffFields
  portal_url: string
}

export const listPrizeEnrollments = (billId?: string) =>
  get<PrizeEnrollmentOut[]>(billId ? `/prize/enrollments?bill_id=${encodeURIComponent(billId)}` : '/prize/enrollments')

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

export const listEligiblePrizeBills = () => get<PrizeEligibleBill[]>('/prize/eligible')

/** Idempotent per bill: calling again for a handed-off bill returns the same enrollment. */
export const createPrizeHandoff = (body: PrizeHandoffIn) =>
  post<PrizeHandoffOut>('/prize/enrollments/handoff', body)

export const markPrizeSubmitted = (enrollmentId: string, prizeCouponNumber?: string) =>
  patch<PrizeEnrollmentOut>(`/prize/enrollments/${enrollmentId}`, {
    status: 'submitted',
    ...(prizeCouponNumber ? { prize_coupon_number: prizeCouponNumber } : {}),
  })
