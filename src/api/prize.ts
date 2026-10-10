import { ApiError, get, patch, post } from './client'

export type PrizeEnrollmentStatus = 'handed_off' | 'submitted' | 'failed' | 'dismissed'

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

/** Closes a hand-off the user won't finish; it moves to history as dismissed. */
export const dismissPrizeHandoff = (enrollmentId: string) =>
  patch<PrizeEnrollmentOut>(`/prize/enrollments/${enrollmentId}`, { status: 'dismissed' })

export interface PrizeWin {
  prize_coupon_number: string
  enrollment_id: string
  bill_number: string
  bill_date: string
  draw_id: string
  draw_title_en: string
  draw_title_ne: string | null
  category_title_en: string
  category_title_ne: string | null
  winner_rank: number
  published_at: string | null
  claim_deadline: string | null
  claim_open: boolean
}

export interface PrizeDraw {
  draw_id: string
  category_title_en: string
  category_title_ne: string | null
  title_en: string
  title_ne: string | null
  published_at: string | null
  claim_deadline: string | null
  claim_open: boolean
  winners: { winner_rank: number; prize_fiscal_year_code: string; prize_coupon_number: string }[]
}

export interface PrizeWinnersPage {
  limit: number
  offset: number
  total_draws: number
  has_more: boolean
  draws: PrizeDraw[]
  /** Filter options; the portal returns them whatever filter is applied. */
  fiscal_years: { fiscal_year_code: string; display_name: string; winner_count: number }[]
  categories: { category_id: string; title_en: string; title_ne: string | null }[]
}

export interface PrizeWinnersFilter {
  fiscalYear?: string
  categoryId?: string
}

/** The user's submitted coupons that appear in a published IRD draw. */
export const listMyPrizeWins = () => get<PrizeWin[]>('/prize/my-wins')

/** The portal also filters by eligibility window (`from`/`to`); the app doesn't use it. */
export const listPrizeWinners = (limit = 6, offset = 0, f: PrizeWinnersFilter = {}) => {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (f.fiscalYear) q.set('fiscal_year_code', f.fiscalYear)
  if (f.categoryId) q.set('category_id', f.categoryId)
  return get<PrizeWinnersPage>(`/prize/winners?${q}`)
}

export interface PrizeBumperDraw {
  draw_id: string
  title_en: string
  title_ne: string | null
  eligible_from: string | null
  eligible_to: string | null
  published_at: string | null
  claim_deadline: string | null
  claim_open: boolean
  winner_count: number
}

/** The portal publishes when the fiscal year ends (last day to enter bills), not the draw date. */
export interface PrizeSummary {
  fiscal_year_code: string | null
  fiscal_year_name: string | null
  entry_deadline: string | null
  days_left: number | null
  coupons_this_year: number
  coupons_all_time: number
  eligible_this_year: number
  pending_handoffs: number
  latest_bumper: PrizeBumperDraw | null
  latest_daily: PrizeBumperDraw | null
  bumper_prize_amount_npr: string | null
}

export const getPrizeSummary = () => get<PrizeSummary>('/prize/summary')
