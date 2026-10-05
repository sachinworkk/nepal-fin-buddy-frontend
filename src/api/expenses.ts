import { del, getWithTotal, patch, post } from './client'

export const CATEGORIES = [
  'groceries', 'dining', 'transport', 'utilities', 'rent', 'health',
  'education', 'shopping', 'entertainment', 'fees', 'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface ExpenseOut {
  id: string
  amount: string
  category: string
  merchant?: string | null
  note?: string | null
  payment_method?: string | null
  source: 'manual' | 'chat' | 'bill'
  bill_id?: string | null
  expense_date_ad: string
  expense_date_bs: string
  created_at: string
}

/** Exactly one of expense_date (AD) / expense_date_bs must be set. */
export interface ExpenseIn {
  amount: string
  category: Category
  merchant?: string
  note?: string
  payment_method?: string
  expense_date?: string
  expense_date_bs?: string
}

export const createExpense = (body: ExpenseIn) => post<ExpenseOut>('/expenses', body)

export type ExpenseUpdate = Partial<Omit<ExpenseIn, 'category'>> & { category?: Category }

export interface ExpenseFilters {
  category?: string
  q?: string
  date_from?: string
  date_to?: string
  limit: number
  offset: number
}

export const listExpenses = (f: ExpenseFilters) => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') params.set(k, String(v))
  return getWithTotal<ExpenseOut>(`/expenses?${params}`)
}

export const updateExpense = (id: string, body: ExpenseUpdate) =>
  patch<ExpenseOut>(`/expenses/${id}`, body)

export const deleteExpense = (id: string) => del(`/expenses/${id}`)
