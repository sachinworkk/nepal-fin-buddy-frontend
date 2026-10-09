import { del, get, put } from './client'
import type { Category } from './expenses'

export type BudgetStatus = 'ok' | 'warning' | 'over'

export interface Budget {
  category: Category
  amount: string
  spent: string
  remaining: string
  percent: number
  status: BudgetStatus
}

export const getBudgets = () => get<Budget[]>('/budgets')
export const setBudget = (category: Category, amount: string) =>
  put<Budget>(`/budgets/${category}`, { amount })
export const deleteBudget = (category: Category) => del(`/budgets/${category}`)
