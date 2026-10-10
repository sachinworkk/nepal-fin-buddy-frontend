import { get, post } from './client'

export interface Citation {
  chunk_id: string
  document_id: string
  title: string
  chunk_index: number
  snippet: string
}

/** The expense as it is now, before a pending update/delete. `date` is AD. */
export interface PendingActionExpense {
  id: string
  date: string
  date_bs: string | null
  amount: string
  category: string
  merchant: string | null
  note: string | null
  payment_method: string | null
}

/** Only the fields an update would change. */
export type PendingActionChanges = Partial<{
  amount: string
  category: string
  merchant: string
  note: string
  payment_method: string
  expense_date: string
  expense_date_bs: string
}>

export type Decision = 'confirm' | 'cancel'

/** A budget as it is now, before a pending delete. */
export interface PendingActionBudget {
  category: string
  amount: string
}

/** An assistant edit/delete waiting for the user; `decision` is null until answered. */
export interface PendingAction {
  interrupt_id: string
  action: 'update' | 'delete' | 'budget-delete'
  expense?: PendingActionExpense | null
  changes?: PendingActionChanges | null
  budget?: PendingActionBudget | null
  decision: Decision | null
}

export interface ActionDecision {
  interrupt_id: string
  decision: Decision
}

export interface ChatMessageOut {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[] | null
  pending_actions?: PendingAction[] | null
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

/** Answer every pending action on a message; returns the assistant's follow-up. */
export const submitActions = (sessionId: string, decisions: ActionDecision[]) =>
  post<ChatMessageOut>(`/chat/sessions/${sessionId}/actions`, { decisions })
