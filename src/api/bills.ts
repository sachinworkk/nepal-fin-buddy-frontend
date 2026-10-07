import { get, patch, post, uploadFile } from './client'
import type { Category } from './expenses'

export interface BillItem {
  description: string
  quantity?: string | null
  unit_price?: string | null
  amount?: string | null
}

export interface BillOut {
  id: string
  vendor_name?: string | null
  vendor_pan?: string | null
  bill_number?: string | null
  bill_date_ad?: string | null
  bill_date_bs_raw?: string | null
  subtotal?: string | null
  discount?: string | null
  taxable_amount?: string | null
  vat_amount?: string | null
  total_amount?: string | null
  payment_method: string | null
  status: 'extracted' | 'confirmed'
  prize_enrolled?: boolean
  extraction_confidence?: number | null
  flags: string[]
  has_image: boolean
  created_at: string
  items: BillItem[]
}

export const listBills = () => get<BillOut[]>('/bills')

export const uploadBill = (file: File, onProgress?: (pct: number) => void) =>
  uploadFile<BillOut>('/bills/upload', file, onProgress)

export const updateBill = (billId: string, body: Partial<BillOut>) =>
  patch<BillOut>(`/bills/${billId}`, body)

export const confirmBill = (
  billId: string,
  body: Omit<Partial<BillOut>, 'payment_method'> & { category: Category; total_amount: string; payment_method?: string },
) => post<BillOut>(`/bills/${billId}/confirm`, body)
