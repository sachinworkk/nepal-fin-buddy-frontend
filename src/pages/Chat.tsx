import { useEffect, useRef, useState } from 'react'
import { createSession, sendMessage } from '../api/chat'
import MarkdownMessage from '../components/MarkdownMessage'

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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy])

  async function ensureSession(): Promise<string> {
    if (sessionId.current) return sessionId.current
    const s = await createSession()
    sessionId.current = s.id
    return s.id
  }

  async function submit() {
    const content = input.trim()
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
      <div className="chat-head">
        <h2>Chat</h2>
        <span>Answers grounded in your bills and documents</span>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">Ask about your expenses, bills or documents.</p>
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
            <div className="msg-bubble">…</div>
          </div>
        )}
      </div>
      {error && <p className="chat-error">{error}</p>}
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask a question…"
          rows={2}
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