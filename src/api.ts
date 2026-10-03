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
