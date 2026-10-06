import { useEffect, useRef, useState } from 'react'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string | undefined
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    onTurnstileLoad?: () => void
  }
}

let loadPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    const prev = window.onTurnstileLoad
    window.onTurnstileLoad = () => {
      prev?.()
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile loaded but the API is missing.'))
    }
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
    script.async = true
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Could not load the Cloudflare Turnstile script.'))
    }
    document.head.appendChild(script)
  })
  return loadPromise
}

interface Props {
  sitekey: string
  onToken: (token: string | null) => void
  /** Bump to clear the current token and show a fresh challenge. */
  resetSignal: number
}

export default function Turnstile({ sitekey, onToken, resetSignal }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)
  const onTokenRef = useRef(onToken)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!sitekey) return
    let cancelled = false
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !boxRef.current) return
        const id = ts.render(boxRef.current, {
          sitekey,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'timeout-callback': () => onTokenRef.current(null),
          'error-callback': (code?: string) => {
            if (code) console.warn(`Turnstile error: ${code}`)
            onTokenRef.current(null)
            setState('error')
          },
        })
        if (id === undefined) {
          setState('error')
          return
        }
        widgetId.current = id
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
      if (widgetId.current !== undefined) {
        try {
          window.turnstile?.remove(widgetId.current)
        } catch {
          /* widget already gone */
        }
        widgetId.current = undefined
      }
    }
  }, [sitekey])

  useEffect(() => {
    if (resetSignal === 0) return
    onTokenRef.current(null)
    if (widgetId.current !== undefined) {
      try {
        window.turnstile?.reset(widgetId.current)
      } catch {
        /* widget already gone */
      }
    }
  }, [resetSignal])

  return (
    <div className="turnstile-box">
      <div ref={boxRef} />
      {state === 'loading' && <p className="turnstile-note">Loading security check…</p>}
      {state === 'error' && (
        <p className="form-error">
          The security check failed to load — refresh the page and try again.
        </p>
      )}
    </div>
  )
}
