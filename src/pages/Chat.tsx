import { useEffect, useRef, useState } from 'react'
import { createSession, sendMessage } from '../api/chat'
import MarkdownMessage from '../components/MarkdownMessage'

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What are my top 3 spending categories?',
  'Which bills are eligible for the IRD lottery?',
]

interface UiMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: { title: string; snippet: string; chunk_index: number }[]
}

function Chat() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sessionId = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
    return s.id
  }

  async function submit(text = input) {
    const content = text.trim()
    if (!content || busy) return
    setError('')
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content }])
    try {
      const sid = await ensureSession()
      const reply = await sendMessage(sid, content)
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: reply.content, citations: reply.citations ?? [] },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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
                <button key={q} type="button" className="chat-suggestion" onClick={() => void submit(q)}>
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
          placeholder="Ask a question…"
          aria-label="Message"
          rows={1}
          disabled={busy}
        />
        <button className="btn btn-accent" onClick={() => void submit()} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
      <p className="chat-hint">Enter to send · Shift+Enter for a new line</p>
    </div>
  )
}

export default Chat