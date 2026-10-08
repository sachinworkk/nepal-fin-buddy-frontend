import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createSession,
  getSession,
  sendMessage,
  submitActions,
  type ChatMessageOut,
  type Decision,
  type PendingAction,
} from '../api/chat'
import { ApiError } from '../api/client'
import MarkdownMessage from '../components/MarkdownMessage'
import PendingActionCard from '../components/PendingActionCard'

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What are my top 3 spending categories?',
  'Which bills are eligible for the IRD lottery?',
]

interface UiMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: { title: string; snippet: string; chunk_index: number }[]
  pending_actions?: PendingAction[]
}

const PENDING_HINT = 'Confirm or cancel the change above first'

const toUi = (m: ChatMessageOut): UiMessage => ({
  role: m.role,
  content: m.content,
  citations: m.citations ?? [],
  pending_actions: m.pending_actions ?? undefined,
})

const SESSION_KEY = 'chat.sessionId'

// Remember the open thread so leaving the Chat tab doesn't lose it.
const storedSession = {
  get: () => {
    try {
      return sessionStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  },
  set: (id: string | null) => {
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id)
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* storage unavailable */
    }
  },
}

const hasUndecided = (m?: UiMessage) => !!m?.pending_actions?.some((a) => a.decision === null)

function Chat() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const sessionId = useRef<string | null>(params.get('session') ?? storedSession.get())
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Restore the thread (incl. decided action cards) from ?session=<id> or the remembered session.
  useEffect(() => {
    const sid = sessionId.current
    if (!sid) return
    let cancelled = false
    getSession(sid)
      .then((s) => {
        if (cancelled) return
        storedSession.set(sid)
        if (!params.get('session')) setParams({ session: sid }, { replace: true })
        setMessages(s.messages.map(toUi))
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) {
          // Stale session: start fresh.
          sessionId.current = null
          storedSession.set(null)
          setParams({}, { replace: true })
          return
        }
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy])

  // Grow the input with its content (capped by CSS max-height).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  async function ensureSession(): Promise<string> {
    if (sessionId.current) return sessionId.current
    const s = await createSession()
    sessionId.current = s.id
    storedSession.set(s.id)
    setParams({ session: s.id }, { replace: true })
    return s.id
  }

  // An assistant reply may have created, edited or deleted expenses.
  function refreshData() {
    void qc.invalidateQueries({ queryKey: ['expenses'] })
    void qc.invalidateQueries({ queryKey: ['stats'] })
    void qc.invalidateQueries({ queryKey: ['bills'] })
  }

  function newChat() {
    sessionId.current = null
    storedSession.set(null)
    setParams({}, { replace: true })
    setMessages([])
    setInput('')
    setError('')
  }

  async function decide(index: number, decision: Decision) {
    const sid = sessionId.current
    const actions = messages[index]?.pending_actions?.filter((a) => a.decision === null)
    if (!sid || !actions?.length || deciding) return
    setError('')
    setDeciding(true)
    try {
      const reply = await submitActions(
        sid,
        actions.map((a) => ({ interrupt_id: a.interrupt_id, decision })),
      )
      const ids = new Set(actions.map((a) => a.interrupt_id))
      setMessages((m) => [
        ...m.map((x, i) =>
          i === index
            ? {
                ...x,
                pending_actions: x.pending_actions?.map((a) => (ids.has(a.interrupt_id) ? { ...a, decision } : a)),
              }
            : x,
        ),
        toUi(reply),
      ])
      refreshData()
      toast.success(decision === 'confirm' ? 'Action confirmed' : 'Action cancelled')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      if (e instanceof ApiError && e.status === 409) {
        // Out of sync with the server (e.g. decided elsewhere): reload the thread.
        setError(e.message)
        void getSession(sid).then((s) => setMessages(s.messages.map(toUi))).catch(() => {})
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setDeciding(false)
    }
  }

  const pending = hasUndecided(messages[messages.length - 1])

  async function submit(text = input) {
    const content = text.trim()
    if (!content || busy || pending) return
    setError('')
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content }])
    try {
      const sid = await ensureSession()
      const reply = await sendMessage(sid, content)
      setMessages((m) => [...m, toUi(reply)])
      refreshData()
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? PENDING_HINT : e instanceof Error ? e.message : String(e))
      setMessages((m) => m.filter((x, i) => !(i === m.length - 1 && x.role === 'user')))
      setInput(content)
    } finally {
      setBusy(false)
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="chat">
      <div className="page-header">
        <div>
          <h2 className="page-title">Chat</h2>
          <p className="page-sub">Answers grounded in your own bills and documents.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={newChat}
          disabled={busy || deciding}
          aria-label="New chat"
          title="New chat"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16v11H9l-5 4z" />
              </svg>
            </span>
            <strong>Ask Fin Buddy</strong>
            <p>Ask about your expenses, bills or documents. Try one of these:</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" className="chat-suggestion" onClick={() => void submit(q)} disabled={pending}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <div className="msg-bubble">
              {m.role === 'assistant' ? (
                <MarkdownMessage content={m.content} />
              ) : (
                <p className="msg-content">{m.content}</p>
              )}
              {m.citations && m.citations.length > 0 && (
                <div className="citations">
                  {m.citations.map((c, j) => (
                    <span key={j} className="cite-chip" title={c.snippet}>
                      {c.title} · chunk {c.chunk_index}
                    </span>
                  ))}
                </div>
              )}
              {m.pending_actions && m.pending_actions.length > 0 && (
                <PendingActionCard
                  actions={m.pending_actions}
                  busy={deciding}
                  onDecide={(d) => void decide(i, d)}
                />
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg msg-assistant">
            <div className="msg-bubble" aria-label="Assistant is typing">
              <span className="msg-typing"><i /><i /><i /></span>
            </div>
          </div>
        )}
      </div>
      {error && <p className="form-error chat-error" role="alert">{error}</p>}
      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={pending ? PENDING_HINT : 'Ask a question…'}
          aria-label="Message"
          rows={1}
          disabled={busy || pending}
        />
        <button className="btn btn-accent" onClick={() => void submit()} disabled={busy || pending || !input.trim()}>
          Send
        </button>
      </div>
      <p className="chat-hint">{pending ? PENDING_HINT : 'Enter to send · Shift+Enter for a new line'}</p>
    </div>
  )
}

export default Chat