const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    throw new Error('Session expired — log in again')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status} ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const post = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const get = <T,>(path: string) => api<T>(path)

// ---- Auth ----

export interface TokenOut {
  access_token: string
}

export const login = (email: string, password: string) =>
  post<TokenOut>('/auth/login', { email, password })

// ---- Chat ----

export interface Citation {
  chunk_id: string
  document_id: string
  title: string
  chunk_index: number
  snippet: string
}

export interface ChatMessageOut {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[] | null
  created_at: string
}

export interface ChatSessionOut {
  id: string
  title: string | null
  created_at: string
}

export interface ChatSessionDetail extends ChatSessionOut {
  messages: ChatMessageOut[]
}

export const createSession = () => post<ChatSessionOut>('/chat/sessions', {})

export const getSession = (id: string) => get<ChatSessionDetail>(`/chat/sessions/${id}`)

export const sendMessage = (sessionId: string, content: string) =>
  post<ChatMessageOut>(`/chat/sessions/${sessionId}/messages`, { content })

// ---- Bills (Snap) ----

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
  status: 'extracted' | 'confirmed'
  extraction_confidence?: number | null
  items: BillItem[]
}

export const CATEGORIES = [
  'groceries', 'dining', 'transport', 'utilities', 'rent', 'health',
  'education', 'shopping', 'entertainment', 'fees', 'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export async function uploadBill(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<BillOut> {
  const token = localStorage.getItem('token')
  const body = new FormData()
  body.append('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/bills/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 401) {
        localStorage.removeItem('token')
        reject(new Error('Session expired — log in again'))
        return
      }
      if (xhr.status >= 400) {
        let detail = xhr.statusText
        try {
          const b = JSON.parse(xhr.responseText) as { detail?: string }
          if (b.detail) detail = b.detail
        } catch { /* non-JSON body */ }
        reject(new Error(`${xhr.status} ${detail}`))
        return
      }
      resolve(JSON.parse(xhr.responseText) as BillOut)
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(body)
  })
}

export const updateBill = (billId: string, body: Partial<BillOut>) =>
  api<BillOut>(`/bills/${billId}`, { method: 'PATCH', body: JSON.stringify(body) })

export const confirmBill = (
  billId: string,
  body: Partial<BillOut> & { category: Category; total_amount: string; bill_date_ad: string },
) => post<BillOut>(`/bills/${billId}/confirm`, body)
