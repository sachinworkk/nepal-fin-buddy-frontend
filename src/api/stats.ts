import { get } from './client'

export interface MonthTotal {
  label: string
  bs_year: number
  bs_month: number
  start: string
  end: string
  total: string
}

export interface CategoryTotal {
  category: string
  total: string
  count: number
  share: number
}

export interface Summary {
  month_label: string
  this_month: string
  last_month: string
  top_merchants: { merchant: string; total: string }[]
}

export const getMonthly = (months = 6) => get<MonthTotal[]>(`/stats/monthly?months=${months}`)
export const getSummary = () => get<Summary>('/stats/summary')
export const getByCategory = (from: string, to: string) =>
  get<CategoryTotal[]>(`/stats/by-category?date_from=${from}&date_to=${to}`)
