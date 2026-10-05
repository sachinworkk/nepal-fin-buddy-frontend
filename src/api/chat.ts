import { get, post } from './client'

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
